import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Automated proof of the spec's non-negotiable isolation requirement
 * (section 5.4: "Isolation: tests automatisés systématiques garantissant
 * qu'aucune requête ne peut franchir la frontière d'un tenant"). Run via
 * `npm run test:e2e --workspace=apps/api`, which provisions a disposable
 * database first (test/setup-e2e-db.sh) so this never touches dev/seed
 * data.
 *
 * Three independent layers are exercised on purpose, because each one
 * catches a different class of regression:
 *  1. HTTP-level: tenant B genuinely cannot read or reach tenant A's
 *     data through the API, whether by listing or by guessing an id.
 *  2. Module-gating: a tenant without a module subscribed is refused,
 *     not merely shown an empty/greyed screen.
 *  3. Database-level: even a raw SQL connection with no tenant context
 *     set gets zero rows from a tenant-scoped table with data in it —
 *     proving RLS holds as a backstop independent of the application code.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let rawPrisma: PrismaClient;

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let tenantAId: string;
  let employeeAId: string;
  let employeeBId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    rawPrisma = new PrismaClient();

    const uniqueSuffix = Date.now();

    const subA = await request(app.getHttpServer())
      .post('/api/auth/subscribe')
      .send({
        companyName: `Isolation Test Co A ${uniqueSuffix}`,
        adminFirstName: 'Admin',
        adminLastName: 'A',
        adminEmail: `admin-a-${uniqueSuffix}@test.praxis`,
        password: 'Password123!',
        modules: ['RH'],
      })
      .expect(201);
    tokenA = subA.body.accessToken;
    tenantAId = subA.body.tenant.id;

    const subB = await request(app.getHttpServer())
      .post('/api/auth/subscribe')
      .send({
        companyName: `Isolation Test Co B ${uniqueSuffix}`,
        adminFirstName: 'Admin',
        adminLastName: 'B',
        adminEmail: `admin-b-${uniqueSuffix}@test.praxis`,
        password: 'Password123!',
        modules: ['RH', 'IPM', 'INTERIM'],
      })
      .expect(201);
    tokenB = subB.body.accessToken;

    const employeeA = await request(app.getHttpServer())
      .post('/api/rh/employees')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        firstName: 'Secret',
        lastName: 'EmployeeOfA',
        employeeNumber: `EMP-A-${uniqueSuffix}`,
        position: 'Test position',
        employmentCategory: 'employe',
        hireDate: '2026-01-01',
        contractType: 'CDI',
        baseSalaryFcfa: 100000,
      })
      .expect(201);
    employeeAId = employeeA.body.employee.id;

    const subC = await request(app.getHttpServer())
      .post('/api/auth/subscribe')
      .send({
        companyName: `Isolation Test Co C ${uniqueSuffix}`,
        adminFirstName: 'Admin',
        adminLastName: 'C',
        adminEmail: `admin-c-${uniqueSuffix}@test.praxis`,
        password: 'Password123!',
        modules: ['RH', 'IPM', 'INTERIM'],
      })
      .expect(201);
    tokenC = subC.body.accessToken;

    const employeeB = await request(app.getHttpServer())
      .post('/api/rh/employees')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        firstName: 'Secret',
        lastName: 'EmployeeOfB',
        employeeNumber: `EMP-B-${uniqueSuffix}`,
        position: 'Test position',
        employmentCategory: 'employe',
        hireDate: '2026-01-01',
        contractType: 'CDI',
        baseSalaryFcfa: 100000,
      })
      .expect(201);
    employeeBId = employeeB.body.employee.id;
  });

  afterAll(async () => {
    await rawPrisma.$disconnect();
    await app.close();
  });

  describe('HTTP layer', () => {
    it("tenant B's employee list never includes tenant A's employee", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rh/employees')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(employeeAId);
    });

    it("tenant B cannot fetch tenant A's employee by id directly", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/rh/employees/${employeeAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).not.toBe(200);
    });

    it("tenant A retrieves its own employee just fine", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/rh/employees/${employeeAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      expect(res.body.id).toBe(employeeAId);
    });

    it('a request with no token is rejected before reaching any tenant data', async () => {
      await request(app.getHttpServer()).get('/api/rh/employees').expect(401);
    });
  });

  describe('Module gating', () => {
    it('tenant A (RH only) is refused access to the IPM module', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ipm/beneficiaries')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
    });

    it('tenant B (RH + IPM) is granted access to the IPM module', async () => {
      await request(app.getHttpServer())
        .get('/api/ipm/beneficiaries')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
    });

    it('tenant A (RH only) is refused access to the Pack Intérim module', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interim/missions')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Phase 2 modules (talents, performance, recruitment)', () => {
    it("tenant B's competence catalogue never includes a competence tenant A created", async () => {
      const uniqueSuffix = Date.now();
      const competenceName = `Compétence secrète de A ${uniqueSuffix}`;
      await request(app.getHttpServer())
        .post('/api/rh/talents/competences')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: competenceName })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/rh/talents/competences')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(competenceName);
    });

    it("tenant B cannot fetch tenant A's internal job posting by id", async () => {
      const posting = await request(app.getHttpServer())
        .post('/api/rh/talents/postes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Poste secret de A', requirements: [] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/rh/talents/postes/${posting.body.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).not.toBe(200);
    });

    it("tenant B's job postings list never includes tenant A's posting", async () => {
      const uniqueSuffix = Date.now();
      const title = `Poste ouvert chez A ${uniqueSuffix}`;
      await request(app.getHttpServer())
        .post('/api/rh/recruitment/postings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/rh/recruitment/postings')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(title);
    });
  });

  describe('Praxis IPM module', () => {
    let beneficiaryBId: string;
    let beneficiaryCardNumber: string;

    it('tenant B can activate an IPM beneficiary for its own employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ipm/beneficiaries')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ employeeId: employeeBId })
        .expect(201);
      beneficiaryBId = res.body.id;
      beneficiaryCardNumber = res.body.cardNumber;
      expect(beneficiaryCardNumber).toMatch(/^IPM-/);
    });

    it("tenant C's beneficiary list never includes tenant B's beneficiary", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ipm/beneficiaries')
        .set('Authorization', `Bearer ${tokenC}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(beneficiaryBId);
      expect(JSON.stringify(res.body)).not.toContain(beneficiaryCardNumber);
    });

    it("tenant C cannot fetch tenant B's beneficiary by id directly", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/ipm/beneficiaries/${beneficiaryBId}`)
        .set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).not.toBe(200);
    });

    it("tenant C cannot look up tenant B's beneficiary by card number", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/ipm/providers/eligibility/${beneficiaryCardNumber}`)
        .set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).not.toBe(200);
    });

    it('tenant B can configure an annual reimbursement cap', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ipm/reimbursements/caps')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ category: 'PHARMACIE', annualCapFcfa: 100000 })
        .expect(201);
      expect(res.body.category).toBe('PHARMACIE');
    });

    it("tenant C's annual caps never include tenant B's configured cap", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ipm/reimbursements/caps')
        .set('Authorization', `Bearer ${tokenC}`)
        .expect(200);
      expect(res.body.find((c: any) => c.category === 'PHARMACIE')).toBeUndefined();
    });
  });

  describe('Pack Intérim module', () => {
    let missionBId: string;

    it('tenant B can create a mission and assign its own employee', async () => {
      const uniqueSuffix = Date.now();
      const mission = await request(app.getHttpServer())
        .post('/api/interim/missions')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          clientName: `Client secret de B ${uniqueSuffix}`,
          siteName: 'Site B',
          startDate: '2026-07-01',
          billingRateFcfaPerHour: 2000,
          payRateFcfaPerHour: 1200,
        })
        .expect(201);
      missionBId = mission.body.id;

      await request(app.getHttpServer())
        .post(`/api/interim/missions/${missionBId}/assignments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ employeeId: employeeBId, startDate: '2026-07-01' })
        .expect(201);
    });

    it("tenant C's mission list never includes tenant B's mission", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interim/missions')
        .set('Authorization', `Bearer ${tokenC}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(missionBId);
    });

    it("tenant C cannot fetch tenant B's mission by id directly", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/interim/missions/${missionBId}`)
        .set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).not.toBe(200);
    });

    it('tenant B can blacklist its own employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interim/blacklist')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ employeeId: employeeBId, reason: 'Test isolation' })
        .expect(201);
      expect(res.body.employeeId).toBe(employeeBId);
    });

    it("tenant C's blacklist never includes tenant B's blacklisted employee", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interim/blacklist')
        .set('Authorization', `Bearer ${tokenC}`)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain(employeeBId);
    });
  });

  describe('Database layer (Row-Level Security backstop)', () => {
    it('a raw connection with no app.tenant_id session variable sees zero rows from a tenant-scoped table that has data', async () => {
      // Deliberately bypasses both the Prisma Client Extension and the
      // API entirely — this is what protects the data if the
      // application-layer enforcement is ever bypassed by a bug, a raw
      // query, or a compromised credential.
      const employees = await rawPrisma.employee.findMany({ where: { id: employeeAId } });
      expect(employees).toEqual([]);
    });

    it('the same row IS visible once app.tenant_id is set to the owning tenant', async () => {
      const rows = await rawPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantAId}'`);
        return tx.employee.findMany({ where: { id: employeeAId } });
      });
      expect(rows).toHaveLength(1);
    });

    it('the row stays invisible when app.tenant_id is set to a DIFFERENT tenant', async () => {
      const otherTenantId = '00000000-0000-0000-0000-000000000099';
      const rows = await rawPrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${otherTenantId}'`);
        return tx.employee.findMany({ where: { id: employeeAId } });
      });
      expect(rows).toEqual([]);
    });
  });
});
