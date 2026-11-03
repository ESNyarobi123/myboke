import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateBusinessDto, InviteMemberDto, UpdateBusinessDto } from './dto/business.dto';

const MANAGERS: Role[] = [Role.OWNER, Role.MANAGER];

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Biashara zangu — kila moja inakuja na role/shopIds za mtumiaji. */
  async listMine(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, isActive: true },
      include: {
        business: {
          include: {
            shops: { where: { isActive: true } },
            subscription: true,
            _count: { select: { products: true, memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      count: memberships.length,
      data: memberships.map((m) => ({
        ...m.business,
        memberId: m.id,
        role: m.role,
        shopIds: m.shopIds,
        hasPin: Boolean(m.pinHash),
      })),
    };
  }

  async current(businessId: string) {
    return this.getById(businessId);
  }

  /** Ulinzi wa tenant: mtumiaji lazima awe mwanachama hai. */
  async assertAccess(userId: string, businessId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new NotFoundException('Biashara haipo.');
    }
    return this.getById(businessId);
  }

  async getById(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        shops: { where: { isActive: true } },
        subscription: true,
        _count: {
          select: { products: true, customers: true, sales: true, memberships: true },
        },
      },
    });
    if (!business) throw new NotFoundException('Biashara haipo.');
    return business;
  }

  /** Mtumiaji anayeweza kuwa na biashara zaidi ya moja (multi-tenant). */
  async create(userId: string, dto: CreateBusinessDto) {
    const count = await this.prisma.membership.count({
      where: { userId, role: Role.OWNER, isActive: true },
    });

    const plan = await this.prisma.plan.findUnique({ where: { id: 'starter' } });

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.name,
          type: dto.type,
          currency: dto.currency ?? 'TZS',
        },
      });

      const shop = await tx.shop.create({
        data: {
          businessId: business.id,
          name: dto.shopName ?? 'Duka Kuu',
          address: dto.address,
        },
      });

      const membership = await tx.membership.create({
        data: {
          businessId: business.id,
          userId,
          role: Role.OWNER,
          shopIds: [shop.id],
        },
      });

      if (plan && dto.withTrial !== false) {
        await tx.subscription.create({
          data: {
            businessId: business.id,
            planId: plan.id,
            status: 'TRIAL',
            endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return { business, shop, membership, isFirst: count === 0 };
    });

    return result;
  }

  async update(
    businessId: string,
    role: Role,
    dto: UpdateBusinessDto,
    userId?: string,
  ) {
    if (userId) await this.assertAccess(userId, businessId);
    if (role !== Role.OWNER) {
      throw new ForbiddenException('Ni OWNER pekee anayeweza kubadilisha biashara.');
    }
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.tin !== undefined ? { tin: dto.tin } : {}),
        ...(dto.vatEnabled !== undefined ? { vatEnabled: dto.vatEnabled } : {}),
        ...(dto.isVatRegistered !== undefined
          ? { isVatRegistered: dto.isVatRegistered }
          : {}),
        ...(dto.vatRate !== undefined ? { vatRate: dto.vatRate } : {}),
        ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber } : {}),
        ...(dto.efdSerial !== undefined ? { efdSerial: dto.efdSerial } : {}),
      },
    });
  }

  async members(businessId: string, userId?: string) {
    if (userId) await this.assertAccess(userId, businessId);
    return this.prisma.membership.findMany({
      where: { businessId },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async invite(
    businessId: string,
    role: Role,
    dto: InviteMemberDto,
    userId?: string,
  ) {
    if (userId) await this.assertAccess(userId, businessId);
    if (!MANAGERS.includes(role)) {
      throw new ForbiddenException('Huna ruhusa ya kuongeza mwanachama.');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (subscription) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: subscription.planId },
      });
      const sellers = await this.prisma.membership.count({
        where: { businessId, role: { in: [Role.CASHIER, Role.MANAGER] }, isActive: true },
      });
      if (plan && sellers >= plan.maxSellers) {
        throw new BadRequestException({
          code: 'PLAN_LIMIT_REACHED',
          message: `Plan yako (${plan.name}) inaruhusu wauzaji ${plan.maxSellers}. Panda plan kuongeza.`,
          limit: plan.maxSellers,
        });
      }
    }

    const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;
    const phone = this.normalizePhone(dto.phone);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { name: dto.name, phone, isVerified: false },
      });
    }

    const existing = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });
    if (existing) {
      throw new BadRequestException('Mtumiaji huyu ni mwanachama tayari.');
    }

    const shops = dto.shopIds?.length
      ? dto.shopIds
      : (
          await this.prisma.shop.findMany({
            where: { businessId, isActive: true },
            select: { id: true },
          })
        ).map((s) => s.id);

    return this.prisma.membership.create({
      data: {
        businessId,
        userId: user.id,
        role: dto.role,
        pinHash,
        shopIds: shops,
        invitedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
  }

  async updateMember(
    businessId: string,
    role: Role,
    membershipId: string,
    dto: { role?: Role; isActive?: boolean; shopIds?: string[] },
    userId?: string,
  ) {
    if (userId) await this.assertAccess(userId, businessId);
    if (!MANAGERS.includes(role)) {
      throw new ForbiddenException('Huna ruhusa.');
    }
    const member = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!member || member.businessId !== businessId) {
      throw new NotFoundException('Mwanachama haipo.');
    }
    if (member.role === Role.OWNER && dto.role && dto.role !== Role.OWNER) {
      throw new BadRequestException('Hauwezi kubadilisha role ya OWNER.');
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.shopIds ? { shopIds: dto.shopIds } : {}),
      },
    });
  }

  async removeMember(
    businessId: string,
    role: Role,
    membershipId: string,
    userId?: string,
  ) {
    if (userId) await this.assertAccess(userId, businessId);
    if (role !== Role.OWNER) {
      throw new ForbiddenException('Ni OWNER pekee.');
    }
    const member = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!member || member.businessId !== businessId) {
      throw new NotFoundException('Mwanachama haipo.');
    }
    if (member.role === Role.OWNER) {
      throw new BadRequestException('Hauwezi kumfuta OWNER.');
    }
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false, pinHash: null },
    });
    return { success: true };
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('255')) return `0${digits.slice(3)}`;
    return digits;
  }
}
