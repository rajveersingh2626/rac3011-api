import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';

type BeneficiaryResponse = {
  id: string;
  club: { id: string };
  phone: string | null;
  stage: string;
  surgeries: { hospital: string; operatedOn: string }[];
};
type BeneficiaryListResponse = { items: BeneficiaryResponse[]; total: number };
type DashboardResponse = {
  operatedCount: number;
  target: number;
  pipelineCounts: Record<string, number>;
  hospitals: { hospital: string; surgeries: number }[];
  perClub: { clubId: string; beneficiaries: number; operated: number }[];
};

describe('Drishti beneficiaries (spec step 12)', () => {
  let app: INestApplication;
  let memberA: TestAgent;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let drishtiAdmin: TestAgent;
  let m3011Admin: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'DR-CLUB-A', name: 'Drishti Club A', zoneName: 'Vayu' });
    await createClub({ id: 'DR-CLUB-B', name: 'Drishti Club B', zoneName: 'Prithvi' });

    await createUser({
      email: 'dr-member-a@example.com',
      name: 'Member A',
      clubId: 'DR-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'DR-CLUB-A' }],
    });
    await createUser({
      email: 'dr-president-a@example.com',
      name: 'President A',
      clubId: 'DR-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'DR-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'DR-CLUB-A' },
      ],
    });
    await createUser({
      email: 'dr-president-b@example.com',
      name: 'President B',
      clubId: 'DR-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'DR-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'DR-CLUB-B' },
      ],
    });
    await createUser({
      email: 'dr-admin@example.com',
      name: 'Drishti Admin',
      roles: [{ key: 'project_admin:drishti', scopeType: 'project', scopeId: 'drishti' }],
    });
    await createUser({
      email: 'dr-m3011-admin@example.com',
      name: 'Mission 3011 Admin',
      roles: [{ key: 'project_admin:mission3011', scopeType: 'project', scopeId: 'mission3011' }],
    });

    app = await createTestApp();
    memberA = await signInAndVerify(app, 'dr-member-a@example.com');
    presidentA = await signInAndVerify(app, 'dr-president-a@example.com');
    presidentB = await signInAndVerify(app, 'dr-president-b@example.com');
    drishtiAdmin = await signInAndVerify(app, 'dr-admin@example.com');
    m3011Admin = await signInAndVerify(app, 'dr-m3011-admin@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a plain member cannot log a patient; a president can, for their own club', async () => {
    await memberA
      .post('/drishti/beneficiaries')
      .send({ name: 'Ram Kumar', eye: 'left', screenedOn: '2026-08-01', phone: '9876543210' })
      .expect(403);

    const created = (
      await presidentA
        .post('/drishti/beneficiaries')
        .send({ name: 'Ram Kumar', eye: 'left', screenedOn: '2026-08-01', phone: '9876543210' })
        .expect(201)
    ).body as BeneficiaryResponse;
    expect(created.club.id).toBe('DR-CLUB-A');
    expect(created.stage).toBe('screened');
    // Masked even for the officer who entered the number - only a project admin sees it in full.
    expect(created.phone).toBe('••••3210');

    const auditRow = await testPrisma().auditLog.findFirst({
      where: {
        resourceType: 'drishti_beneficiary',
        resourceId: created.id,
        action: 'drishti.beneficiary.created',
      },
    });
    expect(auditRow).toBeTruthy();
    expect(JSON.stringify(auditRow?.after)).not.toContain('9876543210');
  });

  it('phone is stored encrypted, never in plaintext, and unmasked only for the project admin', async () => {
    const created = (
      await presidentA
        .post('/drishti/beneficiaries')
        .send({ name: 'Sita Devi', eye: 'both', screenedOn: '2026-08-02', phone: '9123456780' })
        .expect(201)
    ).body as BeneficiaryResponse;

    const row = await testPrisma().drishtiBeneficiary.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(row.phoneEncrypted).toBeTruthy();
    expect(row.phoneEncrypted).not.toContain('9123456780');

    const asPresident = (await presidentA.get(`/drishti/beneficiaries/${created.id}`).expect(200))
      .body as BeneficiaryResponse;
    expect(asPresident.phone).toBe('••••6780');

    const asAdmin = (await drishtiAdmin.get(`/drishti/beneficiaries/${created.id}`).expect(200))
      .body as BeneficiaryResponse;
    expect(asAdmin.phone).toBe('9123456780');

    const listAsPresident = (await presidentA.get('/drishti/beneficiaries').expect(200))
      .body as BeneficiaryListResponse;
    for (const item of listAsPresident.items) {
      if (item.phone) expect(item.phone).not.toBe('9123456780');
    }
  });

  it('a plain member (no club_events:log, no manage grant) cannot list or read any beneficiary', async () => {
    await memberA.get('/drishti/beneficiaries').expect(403);
    const created = (
      await presidentA
        .post('/drishti/beneficiaries')
        .send({ name: 'Anil Sharma', eye: 'left', screenedOn: '2026-08-04' })
        .expect(201)
    ).body as BeneficiaryResponse;
    await memberA.get(`/drishti/beneficiaries/${created.id}`).expect(403);
  });

  it("a president cannot list or read another club's beneficiaries (club-scoped, 404 not 403)", async () => {
    const created = (
      await presidentA
        .post('/drishti/beneficiaries')
        .send({ name: 'Kavita Joshi', eye: 'both', screenedOn: '2026-08-05' })
        .expect(201)
    ).body as BeneficiaryResponse;

    // President B holds club_events:log (own club only) - list is scoped, never sees club A's rows.
    const listAsPresidentB = (await presidentB.get('/drishti/beneficiaries').expect(200))
      .body as BeneficiaryListResponse;
    expect(listAsPresidentB.items.some((i) => i.id === created.id)).toBe(false);
    expect(listAsPresidentB.items.some((i) => i.club.id === 'DR-CLUB-A')).toBe(false);

    // Direct-by-id read of an out-of-scope existing row 404s (prevents enumeration), not 403.
    await presidentB.get(`/drishti/beneficiaries/${created.id}`).expect(404);

    // The drishti project admin sees every club, including this one.
    const listAsAdmin = (await drishtiAdmin.get('/drishti/beneficiaries').expect(200))
      .body as BeneficiaryListResponse;
    expect(listAsAdmin.items.some((i) => i.id === created.id)).toBe(true);
  });

  it('only the drishti project admin can move stages; a mission3011 admin is denied', async () => {
    const created = (
      await presidentA
        .post('/drishti/beneficiaries')
        .send({ name: 'Geeta Rani', eye: 'right', screenedOn: '2026-08-03' })
        .expect(201)
    ).body as BeneficiaryResponse;

    await presidentA
      .patch(`/drishti/beneficiaries/${created.id}`)
      .send({ stage: 'scheduled' })
      .expect(403);
    await m3011Admin
      .patch(`/drishti/beneficiaries/${created.id}`)
      .send({ stage: 'scheduled' })
      .expect(403);

    const scheduled = (
      await drishtiAdmin
        .patch(`/drishti/beneficiaries/${created.id}`)
        .send({ stage: 'scheduled' })
        .expect(200)
    ).body as BeneficiaryResponse;
    expect(scheduled.stage).toBe('scheduled');

    await drishtiAdmin
      .patch(`/drishti/beneficiaries/${created.id}`)
      .send({ stage: 'operated' })
      .expect(400); // missing surgery details

    const operated = (
      await drishtiAdmin
        .patch(`/drishti/beneficiaries/${created.id}`)
        .send({
          stage: 'operated',
          surgery: { hospital: 'District Eye Hospital', operatedOn: '2026-08-10' },
        })
        .expect(200)
    ).body as BeneficiaryResponse;
    expect(operated.stage).toBe('operated');
    expect(operated.surgeries).toHaveLength(1);
    expect(operated.surgeries[0].hospital).toBe('District Eye Hospital');

    const auditRows = await testPrisma().auditLog.findMany({
      where: {
        resourceType: 'drishti_beneficiary',
        resourceId: created.id,
        action: 'drishti.beneficiary.stage_changed',
      },
    });
    expect(auditRows.length).toBeGreaterThanOrEqual(2);
  });

  it('public dashboard: operated count, pipeline counts and hospitals reflect real data', async () => {
    const dashboard = (await memberA.get('/public/drishti/dashboard').expect(200))
      .body as DashboardResponse;
    expect(dashboard.target).toBe(100);
    expect(dashboard.operatedCount).toBeGreaterThanOrEqual(1);
    expect(dashboard.hospitals.some((h) => h.hospital === 'District Eye Hospital')).toBe(true);
    const clubRow = dashboard.perClub.find((c) => c.clubId === 'DR-CLUB-A');
    expect(clubRow?.beneficiaries).toBeGreaterThanOrEqual(3);
    expect(clubRow?.operated).toBeGreaterThanOrEqual(1);
  });

  it('public dashboard works with zero auth and carries no beneficiary names, phones, or notes', async () => {
    const res = await request(httpServer(app)).get('/public/drishti/dashboard').expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('Ram Kumar');
    expect(body).not.toContain('9876543210');
    expect(body).not.toContain('phone');
    expect(body).not.toContain('name');
  });
});
