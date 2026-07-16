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
import { COTE_DIVOIRE_RULES_2026, SENEGAL_RULES_2026 } from '@praxis/shared';

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

  // Second country activated purely as data (section 2.3) — no service or
  // controller anywhere references "CI" specifically; RulesService reads
  // whichever CountryRuleSet row matches a tenant's own countryCode.
  await prisma.countryRuleSet.upsert({
    where: { countryCode_effectiveFrom: { countryCode: 'CI', effectiveFrom: new Date(COTE_DIVOIRE_RULES_2026.effectiveFrom) } },
    update: { payload: COTE_DIVOIRE_RULES_2026 as any },
    create: {
      countryCode: 'CI',
      effectiveFrom: new Date(COTE_DIVOIRE_RULES_2026.effectiveFrom),
      payload: COTE_DIVOIRE_RULES_2026 as any,
    },
  });
  console.log("Country rule set (Côte d'Ivoire) seeded.");

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
    await tx.moduleActivation.upsert({
      where: { tenantId_moduleCode: { tenantId: tenant.id, moduleCode: 'IPM' } },
      update: { isActive: true },
      create: { tenantId: tenant.id, moduleCode: 'IPM' },
    });
    await tx.moduleActivation.upsert({
      where: { tenantId_moduleCode: { tenantId: tenant.id, moduleCode: 'INTERIM' } },
      update: { isActive: true },
      create: { tenantId: tenant.id, moduleCode: 'INTERIM' },
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

    // -- IPM gestionnaire --
    const ipmPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000060' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000060',
        tenantId: tenant.id,
        firstName: 'Astou',
        lastName: 'Diagne',
        email: 'ipm@demo.praxis',
      },
    });
    await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000061' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000061',
        tenantId: tenant.id,
        personId: ipmPerson.id,
        email: 'ipm@demo.praxis',
        passwordHash,
        role: 'IPM_MANAGER',
      },
    });

    // -- Praxis IPM demo data: adherent, dependent, provider, cap, dossier --
    const ipmBeneficiary = await tx.ipmBeneficiary.upsert({
      where: { id: '00000000-0000-0000-0000-000000000070' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000070',
        tenantId: tenant.id,
        employeeId: employee.id,
        cardNumber: 'IPM-00000001',
        coverageRatePercent: 80,
      },
    });
    await tx.ipmDependent.upsert({
      where: { id: '00000000-0000-0000-0000-000000000071' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000071',
        tenantId: tenant.id,
        beneficiaryId: ipmBeneficiary.id,
        firstName: 'Omar',
        lastName: 'Sow',
        dateOfBirth: new Date('2020-03-15'),
        relationship: 'ENFANT',
        cardNumber: 'IPM-00000002',
      },
    });
    await tx.ipmContribution.upsert({
      where: { beneficiaryId_periodYear_periodMonth: { beneficiaryId: ipmBeneficiary.id, periodYear: 2026, periodMonth: 6 } },
      update: {},
      create: {
        tenantId: tenant.id,
        beneficiaryId: ipmBeneficiary.id,
        periodYear: 2026,
        periodMonth: 6,
        grossSalaryFcfa: 150000,
        assietteFcfa: 150000,
        ratePercent: 10,
        employerShareFcfa: 10000,
        employeeShareFcfa: 5000,
        status: 'PAID',
      },
    });

    const ipmProvider = await tx.ipmProvider.upsert({
      where: { id: '00000000-0000-0000-0000-000000000080' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000080',
        tenantId: tenant.id,
        name: 'Clinique du Plateau',
        category: 'Clinique',
        address: 'Avenue Léopold Sédar Senghor, Dakar',
        phone: '+221338000000',
      },
    });
    await tx.ipmTariff.upsert({
      where: { id: '00000000-0000-0000-0000-000000000081' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000081',
        tenantId: tenant.id,
        providerId: ipmProvider.id,
        actCode: 'CONS-GEN',
        actLabel: 'Consultation généraliste',
        tariffFcfa: 10000,
      },
    });

    await tx.ipmAnnualCap.upsert({
      where: { tenantId_category: { tenantId: tenant.id, category: 'PHARMACIE' } },
      update: {},
      create: { tenantId: tenant.id, category: 'PHARMACIE', annualCapFcfa: 150000 },
    });

    await tx.ipmReimbursementCase.upsert({
      where: { tenantId_beneficiaryId_invoiceNumber: { tenantId: tenant.id, beneficiaryId: ipmBeneficiary.id, invoiceNumber: 'FAC-DEMO-001' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000090',
        tenantId: tenant.id,
        beneficiaryId: ipmBeneficiary.id,
        category: 'PHARMACIE',
        invoiceNumber: 'FAC-DEMO-001',
        providerName: 'Pharmacie du Plateau',
        amountClaimedFcfa: 20000,
        status: 'SUBMITTED',
      },
    });

    // -- Intérim gestionnaire --
    const interimPerson = await tx.person.upsert({
      where: { id: '00000000-0000-0000-0000-000000000100' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000100',
        tenantId: tenant.id,
        firstName: 'Modou',
        lastName: 'Diagne',
        email: 'interim@demo.praxis',
      },
    });
    await tx.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000101' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000101',
        tenantId: tenant.id,
        personId: interimPerson.id,
        email: 'interim@demo.praxis',
        passwordHash,
        role: 'INTERIM_MANAGER',
      },
    });

    // -- Pack Intérim demo data: mission, affectation, pointages, incident, acompte --
    const interimMission = await tx.interimMission.upsert({
      where: { id: '00000000-0000-0000-0000-000000000110' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000110',
        tenantId: tenant.id,
        clientName: 'Supermarché Casino',
        clientContactName: 'Bineta Sy',
        clientContactEmail: 'bineta.sy@casino-demo.sn',
        siteName: 'Hypermarché Sea Plaza',
        startDate: new Date('2026-07-01'),
        billingRateFcfaPerHour: 2500,
        payRateFcfaPerHour: 1500,
      },
    });
    const interimAssignment = await tx.interimAssignment.upsert({
      where: { id: '00000000-0000-0000-0000-000000000111' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000111',
        tenantId: tenant.id,
        missionId: interimMission.id,
        employeeId: employee.id,
        startDate: new Date('2026-07-01'),
      },
    });
    await tx.interimTimesheet.upsert({
      where: { assignmentId_date: { assignmentId: interimAssignment.id, date: new Date('2026-07-14') } },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000112',
        tenantId: tenant.id,
        assignmentId: interimAssignment.id,
        date: new Date('2026-07-14'),
        hours: 8,
        siteQrVerified: true,
        status: 'APPROVED',
        validationToken: 'demo-validation-token-approved-0001',
        validatedAt: new Date('2026-07-14T18:00:00Z'),
        validatedByName: 'Bineta Sy',
      },
    });
    await tx.interimTimesheet.upsert({
      where: { assignmentId_date: { assignmentId: interimAssignment.id, date: new Date('2026-07-15') } },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000113',
        tenantId: tenant.id,
        assignmentId: interimAssignment.id,
        date: new Date('2026-07-15'),
        hours: 8,
        siteQrVerified: true,
        status: 'SUBMITTED',
        validationToken: 'demo-validation-token-pending-0002',
      },
    });
    await tx.interimIncident.upsert({
      where: { id: '00000000-0000-0000-0000-000000000114' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000114',
        tenantId: tenant.id,
        employeeId: employee.id,
        missionId: interimMission.id,
        description: 'Oubli de pointage en fin de journée le 2026-07-10.',
        severity: 'LOW',
      },
    });
    await tx.interimAdvance.upsert({
      where: { id: '00000000-0000-0000-0000-000000000115' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000115',
        tenantId: tenant.id,
        employeeId: employee.id,
        amountFcfa: 25000,
        status: 'REQUESTED',
      },
    });

    console.log('Demo tenant seeded:');
    console.log('  Company admin : admin@demo.praxis /', DEMO_PASSWORD);
    console.log('  HR admin      : drh@demo.praxis /', DEMO_PASSWORD);
    console.log('  Manager       : manager@demo.praxis /', DEMO_PASSWORD);
    console.log('  Employee      : employe@demo.praxis /', DEMO_PASSWORD);
    console.log('  IPM manager   : ipm@demo.praxis /', DEMO_PASSWORD);
    console.log('  Intérim manager : interim@demo.praxis /', DEMO_PASSWORD);
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
