import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Membership, PaymentMethod, Role, SaleStatus, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { reportPdf } from '../../infra/files/pdf.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SmsService } from '../../infra/sms/sms.service';
import {
  generateBackupCodes,
  generateTotpSecret,
  totpUri,
  verifyTotp,
} from '../../common/utils/totp.util';
import { GrowthService } from '../growth/growth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  PinLoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
  SetPinDto,
  SupportedLocale,
  VerifyOtpDto,
} from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly growth: GrowthService,
  ) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private refreshExpiry(): Date {
    const days = Number(
      (process.env.JWT_REFRESH_TTL ?? '30d').replace(/[^0-9]/g, '') || 30,
    );
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('255')) return `0${digits.slice(3)}`;
    return digits;
  }

  private async issueTokens(
    user: User,
    membership: Membership,
    deviceId?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      bid: membership.businessId,
      role: membership.role,
      shops: membership.shopIds,
      name: user.name,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
      expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as never,
    });

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        deviceId,
        userAgent,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60,
    };
  }

  private async firstMembership(userId: string): Promise<Membership | null> {
    return this.prisma.membership.findFirst({
      where: { userId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // ─── Register ───────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthTokens & { consent: boolean }> {
    const phone = this.normalizePhone(dto.phone);
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone }, ...(dto.email ? [{ email: dto.email }] : [])],
      },
    });
    if (existing) {
      throw new ConflictException('Namba ya simu au email imetumika tayari.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const starterPlan = await this.prisma.plan.findUnique({
      where: { id: 'starter' },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          phone,
          email: dto.email,
          passwordHash,
          isVerified: true,
        },
      });

      const business = await tx.business.create({
        data: { name: dto.businessName, type: dto.businessType },
      });

      const shop = await tx.shop.create({
        data: { businessId: business.id, name: dto.shopName ?? 'Duka Kuu' },
      });

      const membership = await tx.membership.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: Role.OWNER,
          shopIds: [shop.id],
        },
      });

      if (starterPlan) {
        await tx.subscription.create({
          data: {
            businessId: business.id,
            planId: starterPlan.id,
            status: 'TRIAL',
            endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            autoRenew: false,
          },
        });
      }

      // PDPA: rekodi ridhaa
      await tx.consentRecord.create({
        data: {
          userId: user.id,
          purpose: 'terms',
          granted: dto.acceptsTerms !== false,
          version: '2026-11-01',
        },
      });
      await tx.consentRecord.create({
        data: {
          userId: user.id,
          purpose: 'analytics',
          granted: dto.acceptsTerms !== false,
          version: '2026-11-01',
        },
      });

      return { user, membership };
    });

    // §8 — bonus ya onboarding: coins 100 za mara moja.
    await this.growth
      .awardMilestone(result.user.id, 'onboarding', result.membership.businessId)
      .catch(() => null);

    const tokens = await this.issueTokens(result.user, result.membership);
    return { ...tokens, consent: true };
  }

  // ─── 2FA (A12) ──────────────────────────────────────────────
  async twoFactorStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });
    return {
      enabled: user?.twoFactorEnabled ?? false,
      backupCodesRemaining: user?.twoFactorBackupCodes.length ?? 0,
    };
  }

  /** Hatua 1: tengeneza secret + otpauth URL (2FA haijawaka bado). */
  async twoFactorSetup(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Mtumiaji haipo.');
    if (!user.passwordHash) {
      throw new BadRequestException('Weka password kwanza.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Password si sahihi.');
    }

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    return {
      secret,
      otpauthUrl: totpUri(secret, user.email ?? user.phone ?? user.name),
      issuer: 'MyBoke',
      digits: 6,
      period: 30,
      next: 'Changanua QR, kisha tuma code kwa POST /v1/auth/2fa/enable',
    };
  }

  /** Hatua 2: thibitisha code → washa 2FA na toa backup codes mara moja. */
  async twoFactorEnable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Anza na POST /v1/auth/2fa/setup.');
    }
    if (!verifyTotp(user.twoFactorSecret, code)) {
      throw new UnauthorizedException('Code si sahihi au imeisha muda.');
    }

    const backupCodes = generateBackupCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes.map((c) => this.hash(c)),
      },
    });

    return {
      enabled: true,
      backupCodes,
      note: 'Hifadhi codes hizi — hazitaonyeshwa tena.',
    };
  }

  async twoFactorDisable(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('Hakuna password.');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Password si sahihi.');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });
    return { enabled: false };
  }

  /** TOTP au backup code; backup code hutumika mara moja. */
  private async assertTwoFactorCode(
    user: { id: string; twoFactorSecret: string | null; twoFactorBackupCodes: string[] },
    code: string,
  ) {
    if (user.twoFactorSecret && verifyTotp(user.twoFactorSecret, code)) return;

    const hashed = this.hash(code.toUpperCase());
    if (user.twoFactorBackupCodes.includes(hashed)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: user.twoFactorBackupCodes.filter(
            (c) => c !== hashed,
          ),
        },
      });
      return;
    }

    throw new UnauthorizedException({
      statusCode: 401,
      code: 'INVALID_2FA_CODE',
      message: 'Code ya 2FA si sahihi.',
    });
  }

  // ─── Demo mode (A10) ────────────────────────────────────────
  /** Tena demo tenant yenye data ya mfano — bila usajili, siku 1. */
  async demoSession(): Promise<AuthTokens & { demo: true; businessName: string; expiresAt: string }> {
    const suffix = randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(`demo-${suffix}`, 4);
    const template = await this.prisma.plan.findUnique({ where: { id: 'starter' } });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: 'Mgeni (Demo)',
          phone: `+2559${randomInt(10_000_000, 99_999_999)}`,
          passwordHash,
          isVerified: true,
        },
      });

      const business = await tx.business.create({
        data: {
          name: `Duka Demo ${suffix.slice(0, 4).toUpperCase()}`,
          type: 'Retail',
          isDemo: true,
          demoExpiresAt: expiresAt,
        },
      });

      const shop = await tx.shop.create({
        data: { businessId: business.id, name: 'Duka Kuu', phone: '0712345678' },
      });

      const [bidhaa, vyakula] = await Promise.all([
        tx.category.create({ data: { businessId: business.id, name: 'Bidhaa' } }),
        tx.category.create({ data: { businessId: business.id, name: 'Vyakula' } }),
      ]);

      const products = [
        { name: 'Sabuni ya kufulia', cat: bidhaa.id, buy: 1800, sell: 2500, qty: 40 },
        { name: 'Mafuta ya kupikia 1L', cat: vyakula.id, buy: 4200, sell: 5500, qty: 25 },
        { name: 'Sukari 1kg', cat: vyakula.id, buy: 2800, sell: 3200, qty: 60 },
        { name: 'Chai ya majani', cat: bidhaa.id, buy: 1200, sell: 2000, qty: 30 },
        { name: 'Unga wa sembe 1kg', cat: vyakula.id, buy: 1900, sell: 2400, qty: 80 },
        { name: 'Battery AA', cat: bidhaa.id, buy: 600, sell: 1000, qty: 100 },
      ];

      const seededProducts: { id: string; name: string; sell: number; buy: number }[] = [];

      for (const p of products) {
        const product = await tx.product.create({
          data: {
            businessId: business.id,
            categoryId: p.cat,
            name: p.name,
            buyingPrice: p.buy,
            sellingPrice: p.sell,
            alertLevel: Math.max(3, Math.round(p.qty * 0.1)),
          },
        });
        await tx.stockLevel.create({
          data: { shopId: shop.id, productId: product.id, quantity: p.qty },
        });
        seededProducts.push({
          id: product.id,
          name: p.name,
          sell: p.sell,
          buy: p.buy,
        });
      }

      const seededCustomers: { id: string; name: string; phone: string }[] = [];
      for (const c of [
        { name: 'Asha Mwinyi', phone: '0713000001' },
        { name: 'Juma Said', phone: '0713000002' },
        { name: 'Neema Peter', phone: '0713000003' },
      ]) {
        const created = await tx.customer.create({
          data: {
            businessId: business.id,
            ...c,
            creditLimit: c.name === 'Asha Mwinyi' ? 80000 : null,
          },
        });
        seededCustomers.push({
          id: created.id,
          name: created.name,
          phone: c.phone,
        });
      }

      // Siku 7 za mauzo ya mfano — dashibodi ionekane hai mara ya kwanza.
      for (let day = 6; day >= 0; day--) {
        const salesToday = 5 + ((day * 5) % 4);
        for (let i = 0; i < salesToday; i++) {
          const first = seededProducts[(day + i) % seededProducts.length]!;
          const second = seededProducts[(day + i + 2) % seededProducts.length]!;
          const lines = [
            { p: first, qty: 1 + ((i + day) % 3) },
            ...(i % 2 === 0 ? [{ p: second, qty: 1 }] : []),
          ];
          const total = lines.reduce((sum, l) => sum + l.p.sell * l.qty, 0);
          const cost = lines.reduce((sum, l) => sum + l.p.buy * l.qty, 0);
          const when = new Date();
          when.setDate(when.getDate() - day);
          when.setHours(8 + i * 2, 20, 0, 0);
          await tx.sale.create({
            data: {
              businessId: business.id,
              shopId: shop.id,
              receiptNo: `MB-${10000 + day * 10 + i}`,
              sellerId: createdUser.id,
              customerId:
                day % 3 === 0
                  ? seededCustomers[i % seededCustomers.length]!.id
                  : null,
              saleDate: when,
              subtotal: total,
              total,
              costTotal: cost,
              profit: total - cost,
              paymentMethod: PaymentMethod.CASH,
              status: SaleStatus.COMPLETED,
              items: {
                create: lines.map((l) => ({
                  productId: l.p.id,
                  name: l.p.name,
                  quantity: l.qty,
                  price: l.p.sell,
                  buyingPrice: l.p.buy,
                  lineTotal: l.p.sell * l.qty,
                })),
              },
              payments: {
                create: [
                  {
                    businessId: business.id,
                    amount: total,
                    method: PaymentMethod.CASH,
                    paidAt: when,
                  },
                ],
              },
            },
          });
        }
      }

      for (const e of [
        { name: 'Kodi ya duka', amount: 250000, category: 'Bills', recurring: true, daysAgo: 20 },
        { name: 'Umeme (LUKU)', amount: 45000, category: 'Bills', recurring: false, daysAgo: 5 },
        { name: 'Usafiri wa mzigo', amount: 18000, category: 'Transport', recurring: false, daysAgo: 2 },
      ]) {
        await tx.expense.create({
          data: {
            businessId: business.id,
            shopId: shop.id,
            name: e.name,
            amount: e.amount,
            category: e.category,
            isRecurring: e.recurring,
            recurEvery: e.recurring ? 'MONTHLY' : null,
            date: new Date(Date.now() - e.daysAgo * 86_400_000),
            createdBy: createdUser.id,
          },
        });
      }

      await tx.debt.createMany({
        data: [
          {
            businessId: business.id,
            customerId: seededCustomers[0]!.id,
            personName: seededCustomers[0]!.name,
            personPhone: seededCustomers[0]!.phone,
            originalAmount: 32000,
            paidAmount: 10000,
            status: 'PARTIAL',
            description: 'Mkopo wa unga na sukari',
            dueDate: new Date(Date.now() - 2 * 86_400_000),
          },
          {
            businessId: business.id,
            customerId: seededCustomers[1]!.id,
            personName: seededCustomers[1]!.name,
            personPhone: seededCustomers[1]!.phone,
            originalAmount: 18000,
            paidAmount: 0,
            status: 'OPEN',
            description: 'Vinywaji kwa sherehe',
            dueDate: new Date(Date.now() + 7 * 86_400_000),
          },
        ],
      });

      // Ankara za mfano zenye templates tatu zilizoundwa (modern · classic · minimal)
      const invoiceSeeds = [
        {
          number: 'INV-DEMO-001',
          customerName: seededCustomers[0]!.name,
          customerPhone: seededCustomers[0]!.phone,
          template: 'modern',
          status: 'SENT' as const,
          items: [
            { description: 'Unga wa Sembe 1kg', quantity: 4, unitPrice: 2400 },
            { description: 'Sukari 1kg', quantity: 2, unitPrice: 3200 },
          ],
          discount: 1000,
          taxRate: 18,
          paid: 0,
          dueInDays: 9,
        },
        {
          number: 'INV-DEMO-002',
          customerName: seededCustomers[1]!.name,
          customerPhone: seededCustomers[1]!.phone,
          template: 'classic',
          status: 'OVERDUE' as const,
          items: [{ description: 'Mayai (trei)', quantity: 3, unitPrice: 11500 }],
          discount: 0,
          taxRate: 0,
          paid: 10000,
          dueInDays: -3,
        },
        {
          number: 'INV-DEMO-003',
          customerName: seededCustomers[2]!.name,
          customerPhone: seededCustomers[2]!.phone,
          template: 'minimal',
          status: 'PAID' as const,
          items: [{ description: 'Mafuta ya Kupikia 1L', quantity: 2, unitPrice: 5500 }],
          discount: 0,
          taxRate: 0,
          paid: 11000,
          dueInDays: 0,
        },
      ];

      for (const seedInvoice of invoiceSeeds) {
        const subtotal = seedInvoice.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );
        const taxable = Math.max(0, subtotal - seedInvoice.discount);
        const taxAmount = Math.round(taxable * (seedInvoice.taxRate / 100) * 100) / 100;
        const total = taxable + taxAmount;
        const amountPaid = Math.min(seedInvoice.paid, total);

        await tx.salesInvoice.create({
          data: {
            businessId: business.id,
            shopId: shop.id,
            customerId: seededCustomers[0]!.id,
            number: seedInvoice.number,
            customerName: seedInvoice.customerName,
            customerPhone: seedInvoice.customerPhone,
            status: seedInvoice.status,
            template: seedInvoice.template,
            issueDate: new Date(Date.now() - 4 * 86_400_000),
            dueDate: new Date(Date.now() + seedInvoice.dueInDays * 86_400_000),
            subtotal,
            discount: seedInvoice.discount,
            taxRate: seedInvoice.taxRate,
            taxAmount,
            total,
            amountPaid,
            currency: business.currency ?? 'TZS',
            notes: 'Asante kwa biashara yako. Malipo yoyote yanapaswa kuwa na namba ya ankara.',
            createdBy: createdUser.id,
            items: {
              create: seedInvoice.items.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.quantity * item.unitPrice,
                position: index,
              })),
            },
          },
        });
      }

      const member = await tx.membership.create({
        data: {
          businessId: business.id,
          userId: createdUser.id,
          role: Role.OWNER,
          shopIds: [shop.id],
        },
      });

      if (template) {
        await tx.subscription.create({
          data: {
            businessId: business.id,
            planId: template.id,
            status: 'TRIAL',
            endsAt: expiresAt,
            autoRenew: false,
          },
        });
      }

      return { user: createdUser, membership: member };
    });

    await this.growth
      .awardMilestone(user.id, 'onboarding', membership.businessId)
      .catch(() => null);

    const tokens = await this.issueTokens(user, membership);
    return {
      ...tokens,
      demo: true,
      businessName: `Duka Demo ${suffix.slice(0, 4).toUpperCase()}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ─── Password login ─────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthTokens> {
    const identifier = dto.identifier.trim();
    const phone = this.normalizePhone(identifier);

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { email: identifier }] },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Simu/email au password si sahihi.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Simu/email au password si sahihi.');
    }

    // A12 — 2FA ya OWNER (hiari). Inahitajika code ya authenticator au backup.
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const code = (dto.totp ?? '').trim();
      if (!code) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'TWO_FA_REQUIRED',
          message: 'Ingiza code ya uthibitisho (2FA) kuendelea.',
        });
      }
      await this.assertTwoFactorCode(user, code);
    }

    const membership = await this.firstMembership(user.id);
    if (!membership) {
      throw new UnauthorizedException(
        'Akaunti hii haijaunganishwa na biashara yoyote.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user, membership, dto.deviceId);
  }

  // ─── PIN login (cashier) ────────────────────────────────────
  async loginWithPin(dto: PinLoginDto): Promise<AuthTokens> {
    if (!dto.phone && !dto.memberId) {
      throw new BadRequestException('Toa simu au memberId.');
    }

    let membership: (Membership & { user: User }) | null = null;

    if (dto.memberId) {
      membership = await this.prisma.membership.findUnique({
        where: { id: dto.memberId },
        include: { user: true },
      });
    } else if (dto.phone) {
      const phone = this.normalizePhone(dto.phone);
      const user = await this.prisma.user.findFirst({ where: { phone } });
      if (user) {
        membership = await this.prisma.membership.findFirst({
          where: { userId: user.id, isActive: true, pinHash: { not: null } },
          include: { user: true },
        });
      }
    }

    if (!membership || !membership.isActive || !membership.pinHash) {
      throw new UnauthorizedException('PIN si sahihi au akaunti imezimwa.');
    }

    const valid = await bcrypt.compare(dto.pin, membership.pinHash);
    if (!valid) {
      throw new UnauthorizedException('PIN si sahihi.');
    }

    return this.issueTokens(
      membership.user,
      membership,
      dto.deviceId,
    );
  }

  // ─── OTP ────────────────────────────────────────────────────
  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const purpose = dto.purpose ?? 'LOGIN';

    // Zuia spam: OTP moja kwa sekunde 30
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, createdAt: { gte: new Date(Date.now() - 30_000) } },
    });
    if (recent) {
      throw new BadRequestException('Subiri sekunde 30 kabla ya kuomba tena.');
    }

    const code = `${randomInt(0, 1_000_000)}`.padStart(6, '0');

    await this.prisma.otpCode.create({
      data: {
        phone,
        purpose,
        codeHash: this.hash(`${phone}:${code}`),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    });

    const result = await this.sms.send(
      phone,
      `MyBoke: msimbo wako ni ${code}. Unadumu dakika ${OTP_TTL_MINUTES}. Usimpe mtu yeyote.`,
    );

    return {
      sent: result.sent,
      purpose,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      // Kwa maendeleo tu — production haitarudishi code
      ...(this.sms.isDev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const phone = this.normalizePhone(dto.phone);
    const purpose = dto.purpose ?? 'LOGIN';

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new UnauthorizedException('Hakuna OTP inayosubiri.');
    if (otp.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP imeisha muda. Omba mpya.');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Majaribio mengi. Omba OTP mpya.');
    }

    if (otp.codeHash !== this.hash(`${phone}:${dto.code}`)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('OTP si sahihi.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findFirst({ where: { phone } });
    let membership = user ? await this.firstMembership(user.id) : null;

    if (!user) {
      // Usajili wa kwanza kwa OTP
      const name = dto.name ?? `Mfanyabiashara ${phone.slice(-4)}`;
      const created = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { name, phone, isVerified: true },
        });
        const b = await tx.business.create({
          data: { name: `Biashara ya ${name}` },
        });
        const s = await tx.shop.create({
          data: { businessId: b.id, name: 'Duka Kuu' },
        });
        const m = await tx.membership.create({
          data: {
            businessId: b.id,
            userId: u.id,
            role: Role.OWNER,
            shopIds: [s.id],
          },
        });
        const plan = await tx.plan.findUnique({ where: { id: 'starter' } });
        if (plan) {
          await tx.subscription.create({
            data: {
              businessId: b.id,
              planId: plan.id,
              status: 'TRIAL',
              endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          });
        }
        return { u, m };
      });
      user = created.u;
      membership = created.m;
    }

    if (!membership) {
      throw new UnauthorizedException(
        'Akaunti hii haijaunganishwa na biashara yoyote.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), isVerified: true },
    });

    return this.issueTokens(user, membership);
  }

  // ─── Password reset ─────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const identifier = dto.identifier.trim();
    const phone = this.normalizePhone(identifier);

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { email: identifier }] },
    });

    // Usifichue kama mtumiaji hayupo
    if (!user) {
      return { sent: true, expiresInSeconds: 900 };
    }

    // Msimbo mfupi unaosomeka kwa SMS: herufi 8 bila 0/O/1/I.
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const code = Array.from(
      { length: 8 },
      () => alphabet[randomInt(0, alphabet.length)],
    ).join('');

    // Msimbo mmoja tu uwe halali kwa wakati mmoja.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(code),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });

    if (user.phone) {
      await this.sms.send(
        user.phone,
        `MyBoke: msimbo wa kubadilisha neno la siri ni ${code}. Unadumu dakika 15. Usimpe mtu yeyote.`,
      );
    }

    return {
      sent: true,
      expiresInSeconds: 900,
      ...(this.sms.isDev ? { devToken: code } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Msimbo hutumwa kwa herufi kubwa; tumia hivyo hivyo wakati wa kuhakiki.
    const code = dto.token.trim().toUpperCase();
    const match = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: this.hash(code), usedAt: null },
    });

    if (!match || match.expiresAt < new Date()) {
      throw new BadRequestException('Token si sahihi au imeisha muda.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: match.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: match.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: match.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new BadRequestException('Akaunti hii haina password.');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Password ya sasa si sahihi.');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  // ─── Set PIN (owner → cashier) ──────────────────────────────
  async setPin(businessId: string, memberId: string, dto: SetPinDto) {
    const member = await this.prisma.membership.findUnique({
      where: { id: memberId },
    });
    if (!member || member.businessId !== businessId) {
      throw new NotFoundException('Mwanachama haipo.');
    }

    const pinHash = await bcrypt.hash(dto.pin, 10);
    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: {
        pinHash,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.shopIds ? { shopIds: dto.shopIds } : {}),
        ...(dto.role ? { role: dto.role as Role } : {}),
      },
    });

    return { success: true, membershipId: updated.id, role: updated.role };
  }

  // ─── Session ────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token hauna nguvu. Ingia tena.');
    }

    const membership = await this.firstMembership(stored.userId);
    if (!membership) {
      throw new UnauthorizedException('Hakuna biashara inayohusiana.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.user,
      membership,
      stored.deviceId ?? undefined,
      stored.userAgent ?? undefined,
    );
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async logoutAll(userId: string) {
    const res = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true, revoked: res.count };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        locale: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          include: {
            business: {
              include: {
                shops: { where: { isActive: true } },
                subscription: true,
              },
            },
          },
        },
      },
    });
  }

  async updateLocale(userId: string, locale: SupportedLocale) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: { id: true, locale: true },
    });
    return user;
  }

  /** PDPA: pakua data yote ya mtumiaji. */
  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: { include: { business: { include: { shops: true } } } },
        devices: true,
        coinTx: true,
        missions: true,
      },
    });

    const consents = await this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        ...user,
        passwordHash: undefined,
        pinHash: undefined,
      },
      consents,
    };
  }

  /** PDPA — toleo la PDF la data export (?format=pdf). */
  async exportMyDataPdf(
    data: Awaited<ReturnType<AuthService['exportMyData']>>,
  ) {
    const user = data.user as unknown as Record<string, unknown>;
    const memberships = (user.memberships ?? []) as {
      role: string;
      business?: { name?: string; shops?: { name: string }[] };
    }[];
    const rows = memberships.map((m) => ({
      business: m.business?.name ?? '—',
      role: m.role,
      shops: (m.business?.shops ?? []).map((s) => s.name).join(', ') || '—',
    }));

    return reportPdf({
      title: 'MyBoke — Nakala ya Data Yako (PDPA)',
      businessName: rows[0]?.business ?? 'MyBoke',
      period: `Imezalishwa: ${new Date(data.exportedAt).toLocaleString('sw-TZ')}`,
      columns: [
        { header: 'Biashara', key: 'business', width: 2 },
        { header: 'Wajibu', key: 'role' },
        { header: 'Maduka', key: 'shops', width: 3 },
      ],
      rows,
      summary: [
        { label: 'Jina', value: String(user.name ?? '—') },
        { label: 'Simu', value: String(user.phone ?? '—') },
        { label: 'Barua pepe', value: String(user.email ?? '—') },
        { label: 'Lugha', value: String(user.locale ?? 'sw') },
        { label: 'Vifaa', value: String((user.devices as unknown[])?.length ?? 0) },
        { label: 'Coins', value: String(user.coins ?? 0) },
        { label: 'Ridhaa (consents)', value: String(data.consents.length) },
      ],
      footer:
        'Hati hii ina nakala ya data yako ya kibinafsi kama inavyotakiwa na PDPA Tanzania.',
    });
  }

  /** PDPA: kufuta akaunti (soft delete + revoke tokens). */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          phone: null,
          email: null,
          name: 'Akaunti imefutwa',
          passwordHash: null,
        },
      }),
      this.prisma.membership.updateMany({
        where: { userId },
        data: { isActive: false, pinHash: null },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true, note: 'Data ya kifedha inahifadhiwa miaka 5 kwa sheria za kodi.' };
  }
}
