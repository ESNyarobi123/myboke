import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'MyBoke@2026';
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? '0700000001';
const PARTNER_PHONE = process.env.SEED_PARTNER_PHONE ?? '0700000002';
const BCRYPT_ROUNDS = 10;

const plans = [
  {
    id: 'free',
    name: 'Bure',
    monthlyPrice: '0.00',
    maxShops: 1,
    maxSellers: 1,
    maxProducts: 50,
    features: {
      products: 50,
      reports: 'basic',
      exports: false,
      aiCoach: false,
      demandReports: false,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: '10000.00',
    maxShops: 1,
    maxSellers: 3,
    maxProducts: null,
    features: {
      products: 'unlimited',
      reports: 'standard',
      exports: true,
      whatsappReceipts: true,
      aiCoach: false,
      demandReports: false,
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: '25000.00',
    maxShops: 3,
    maxSellers: 10,
    maxProducts: null,
    features: {
      products: 'unlimited',
      reports: 'advanced',
      exports: true,
      whatsappReceipts: true,
      aiCoach: true,
      demandReports: true,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: '50000.00',
    maxShops: 6,
    maxSellers: 999,
    maxProducts: null,
    features: {
      products: 'unlimited',
      reports: 'advanced',
      exports: true,
      whatsappReceipts: true,
      aiCoach: true,
      demandReports: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`✓ plan: ${plan.name} (${plan.monthlyPrice} TZS)`);
  }

  // ── Platform business (hosts SUPER_ADMIN + PARTNER accounts) ──
  const platform = await prisma.business.upsert({
    where: { id: 'platform' },
    update: {},
    create: {
      id: 'platform',
      name: 'MyBoke Platform',
      type: 'PLATFORM',
      currency: 'TZS',
      country: 'TZ',
      vatEnabled: true,
      isVatRegistered: true,
      vatRate: 0.18,
      vatNumber: 'PLATFORM-VAT',
      efdSerial: 'PLATFORM-EFD',
    },
  });
  await prisma.shop.upsert({
    where: { id: 'platform-hq' },
    update: {},
    create: {
      id: 'platform-hq',
      businessId: platform.id,
      name: 'Platform HQ',
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { passwordHash, isVerified: true, isActive: true },
    create: {
      phone: ADMIN_PHONE,
      name: 'Platform Admin',
      passwordHash,
      isVerified: true,
      locale: 'sw',
    },
  });
  await prisma.membership.upsert({
    where: {
      businessId_userId: { businessId: platform.id, userId: admin.id },
    },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      businessId: platform.id,
      userId: admin.id,
      role: 'SUPER_ADMIN',
      isActive: true,
      shopIds: ['platform-hq'],
    },
  });
  console.log(`✓ super admin: ${ADMIN_PHONE}`);

  // ── Demo partner account ──
  const partnerUser = await prisma.user.upsert({
    where: { phone: PARTNER_PHONE },
    update: { passwordHash, isVerified: true, isActive: true },
    create: {
      phone: PARTNER_PHONE,
      name: 'Demo Partner',
      passwordHash,
      isVerified: true,
      locale: 'sw',
    },
  });
  await prisma.membership.upsert({
    where: {
      businessId_userId: { businessId: platform.id, userId: partnerUser.id },
    },
    update: { role: 'PARTNER', isActive: true },
    create: {
      businessId: platform.id,
      userId: partnerUser.id,
      role: 'PARTNER',
      isActive: true,
      shopIds: [],
    },
  });
  const partner = await prisma.partner.findFirst({
    where: { phone: PARTNER_PHONE },
  });
  if (partner) {
    await prisma.partner.update({
      where: { id: partner.id },
      data: { name: 'Demo Partner', isActive: true },
    });
  } else {
    await prisma.partner.create({
      data: {
        name: 'Demo Partner',
        phone: PARTNER_PHONE,
        code: 'DEMO-PARTNER',
        type: 'AGENT',
        commissionRate: 10,
      },
    });
  }
  console.log(`✓ partner account: ${PARTNER_PHONE} (code DEMO-PARTNER)`);
  console.log(`   demo password: ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
