/**
 * Demo/dev seed data: one tenant, one country rule set, a full role
 * roster (COMPANY_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE) and a couple of
 * employees so a fresh environment has something to click through
 * immediately after `docker compose up`.
 *
 * Runs as a script outside any HTTP request, so there is no tenant in
 * AsyncLocalStorage context yet and no `TenantTransactionInterceptor` to
 * set `app.tenant_id` for RLS. It opens its own transaction and sets
 * `app.bypass_rls` the same way core/prisma/rls-bypass.ts does for the
 * handful of legitimate cross-tenant call sites in the running app.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SENEGAL_RULES_2026 } from '@praxis/shared';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';

async function main() {
  await prisma.countryRuleSet.upsert({
    where: { countryCode_effectiveFrom: { countryCode: 'SN', effectiveFrom: new Date(SENEGAL_RULES_2026.effectiveFrom) } },
    update: { payload: SENEGAL_RULES_2026 as any },
    create: {
      countryCode: 'SN',
      effectiveFrom: new Date(SENEGAL_RULES_2026.effectiveFrom),
      payload: SENEGAL_RULES_2026 as any,
    },
  });
  console.log('Country rule set (Sénégal) seeded.');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Boulangerie Demo Praxis',
        sector: 'Restauration',
        countryCode: 'SN',
      },
    });

    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on'`);

    await tx.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    await tx.moduleActivation.upsert({
      where: { tenantId_moduleCode: { tenantId: tenant.id, moduleCode: 'RH' } },
      update: { isActive: true },
      create: { tenantId: tenant.id, moduleCode: 'RH' },
    });

    const establishment = await tx.establishment.upsert({
      where: { id: '00000000-0000-0000-0000-000000000010' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000010',
        tenantId: tenant.id,
        name: 'Boutique Plateau',
        city: 'Dakar',
      },
    });

    // -- Company admin --
    const adminPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000020' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000020',
        tenantId: tenant.id,
        firstName: 'Aïda',
        lastName: 'Fall',
        email: 'admin@demo.praxis',
        phone: '+221770000000',
      },
    });
    await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000021' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000021',
        tenantId: tenant.id,
        personId: adminPerson.id,
        email: 'admin@demo.praxis',
        passwordHash,
        role: 'COMPANY_ADMIN',
      },
    });

    // -- HR admin --
    const hrPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000030' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000030',
        tenantId: tenant.id,
        firstName: 'Cheikh',
        lastName: 'Ba',
        email: 'drh@demo.praxis',
      },
    });
    await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000031' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000031',
        tenantId: tenant.id,
        personId: hrPerson.id,
        email: 'drh@demo.praxis',
        passwordHash,
        role: 'HR_ADMIN',
      },
    });

    // -- Manager --
    const managerPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000040' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000040',
        tenantId: tenant.id,
        firstName: 'Mariama',
        lastName: 'Sarr',
        email: 'manager@demo.praxis',
      },
    });
    const managerUser = await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000041' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000041',
        tenantId: tenant.id,
        personId: managerPerson.id,
        email: 'manager@demo.praxis',
        passwordHash,
        role: 'MANAGER',
      },
    });

    // -- Employee (active, with a contract, reporting to the manager) --
    const empPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000050' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000050',
        tenantId: tenant.id,
        firstName: 'Fatou',
        lastName: 'Sow',
        email: 'employe@demo.praxis',
        phone: '+221770000005',
        mobileMoneyProvider: 'WAVE',
        mobileMoneyNumber: '+221770000005',
      },
    });
    await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000051' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000051',
        tenantId: tenant.id,
        personId: empPerson.id,
        email: 'employe@demo.praxis',
        passwordHash,
        role: 'EMPLOYEE',
      },
    });
    const employee = await tx.employee.upsert({
      where: { id: '00000000-0000-0000-0000-000000000052' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000052',
        tenantId: tenant.id,
        personId: empPerson.id,
        employeeNumber: 'EMP-0001',
        establishmentId: establishment.id,
        position: 'Vendeuse',
        employmentCategory: 'employe',
        status: 'ACTIVE',
        hireDate: new Date('2025-09-01'),
        managerUserId: managerUser.id,
      },
    });
    await tx.contract.upsert({
      where: { id: '00000000-0000-0000-0000-000000000053' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000053',
        tenantId: tenant.id,
        employeeId: employee.id,
        type: 'CDI',
        status: 'ACTIVE',
        startDate: new Date('2025-09-01'),
        baseSalaryFcfa: 150000,
        weeklyHours: 40,
        signedAt: new Date('2025-09-01'),
      },
    });

    console.log('Demo tenant seeded:');
    console.log('  Company admin : admin@demo.praxis /', DEMO_PASSWORD);
    console.log('  HR admin      : drh@demo.praxis /', DEMO_PASSWORD);
    console.log('  Manager       : manager@demo.praxis /', DEMO_PASSWORD);
    console.log('  Employee      : employe@demo.praxis /', DEMO_PASSWORD);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
