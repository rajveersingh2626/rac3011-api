import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';
import { testPrisma } from './db';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';

type ReportResponse = {
  id: string;
  clubId: string;
  status: string;
  schemaVersion: number;
  filedOnTime: boolean | null;
  values: { activities: unknown[]; physical_meetings?: number };
  queries?: { id: string; question: string; reply: string | null }[];
};
type ReportListResponse = { items: ReportResponse[]; total: number };
type SchemaListResponse = { items: { version: number; status: string; fields?: unknown[] }[] };
type ReportRequestResponse = { id: string; title: string };

describe('Report schemas (§3.6, §5.2)', () => {
  let app: INestApplication;
  let dsc: TestAgent;
  let president: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'RPS-CLUB-A', name: 'RPS Club A', zoneName: 'Prithvi' });
    await createUser({
      email: 'rps-president@example.com',
      name: 'President RPS',
      clubId: 'RPS-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RPS-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'RPS-CLUB-A' },
      ],
    });
    await createUser({
      email: 'rps-dsc@example.com',
      name: 'DSC RPS',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    app = await createTestApp();
    president = await signInAndVerify(app, 'rps-president@example.com');
    dsc = await signInAndVerify(app, 'rps-dsc@example.com');
  });

  afterAll(async () => {
    // restore version 2 as active: later suites in this run depend on it via getActive()
    await dsc.patch('/report-schemas/2').send({ status: 'active' });
    await app.close();
  });

  it('reports:submit only sees active schemas; requests:manage sees all', async () => {
    const asPresident = (await president.get('/report-schemas').expect(200))
      .body as SchemaListResponse;
    expect(asPresident.items.every((s) => s.status === 'active')).toBe(true);

    const asDsc = (await dsc.get('/report-schemas').expect(200)).body as SchemaListResponse;
    expect(asDsc.items.some((s) => s.status === 'retired')).toBe(true);
    expect(asDsc.items.some((s) => s.status === 'active')).toBe(true);
  });

  it('a report keeps its original schema after that schema version is retired', async () => {
    const created = (
      await president.post('/reports').send({ clubId: 'RPS-CLUB-A', month: '2026-11' }).expect(201)
    ).body as ReportResponse;
    expect(created.schemaVersion).toBe(2);

    const draft = (await dsc.post('/report-schemas').expect(201)).body as { version: number };
    await dsc.patch(`/report-schemas/${draft.version}`).send({ status: 'active' }).expect(200);

    const reloaded = (await president.get(`/reports/${created.id}`).expect(200))
      .body as ReportResponse;
    expect(reloaded.schemaVersion).toBe(2);

    const schemas = (await dsc.get('/report-schemas').expect(200)).body as SchemaListResponse;
    expect(schemas.items.find((s) => s.version === 2)?.status).toBe('retired');
    expect(schemas.items.find((s) => s.version === draft.version)?.status).toBe('active');
  });

  it('rejects publishing an already-active schema', async () => {
    await dsc.patch('/report-schemas/1').send({ status: 'active' }).expect(200);
    await dsc.patch('/report-schemas/1').send({ status: 'active' }).expect(409);
  });
});

describe('Reports CRUD, scope, and validation (§4.8, §5.2, §12.2)', () => {
  let app: INestApplication;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let zrrSameZone: TestAgent;
  let zrrOtherZone: TestAgent;
  let dsc: TestAgent;

  beforeAll(async () => {
    const prisma = testPrisma();
    const prithvi = await prisma.zone.findUniqueOrThrow({ where: { name: 'Prithvi' } });
    const agni = await prisma.zone.findUniqueOrThrow({ where: { name: 'Agni' } });

    await createClub({ id: 'RP-CLUB-A', name: 'RP Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'RP-CLUB-B', name: 'RP Club B', zoneName: 'Agni' });

    await createUser({
      email: 'rp-president-a@example.com',
      name: 'President A',
      clubId: 'RP-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RP-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'RP-CLUB-A' },
      ],
    });
    await createUser({
      email: 'rp-president-b@example.com',
      name: 'President B',
      clubId: 'RP-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RP-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'RP-CLUB-B' },
      ],
    });
    await createUser({
      email: 'rp-zrr-prithvi@example.com',
      name: 'ZRR Prithvi',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: prithvi.id }],
    });
    await createUser({
      email: 'rp-zrr-agni@example.com',
      name: 'ZRR Agni',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: agni.id }],
    });
    await createUser({
      email: 'rp-dsc@example.com',
      name: 'DSC',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    presidentA = await signInAndVerify(app, 'rp-president-a@example.com');
    presidentB = await signInAndVerify(app, 'rp-president-b@example.com');
    zrrSameZone = await signInAndVerify(app, 'rp-zrr-prithvi@example.com');
    zrrOtherZone = await signInAndVerify(app, 'rp-zrr-agni@example.com');
    dsc = await signInAndVerify(app, 'rp-dsc@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a draft report for the caller club and 409s a duplicate month', async () => {
    const res = await presidentA
      .post('/reports')
      .send({ clubId: 'RP-CLUB-A', month: '2026-08' })
      .expect(201);
    const body = res.body as ReportResponse;
    expect(body.clubId).toBe('RP-CLUB-A');
    expect(body.status).toBe('draft');

    await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2026-08' }).expect(409);
  });

  it('404s (not 403) creating a report for a club outside the caller scope', async () => {
    // RP-CLUB-B exists but is out of president A's scope: 404, not 403, so club ids can't be enumerated (§4.8.4)
    await presidentA.post('/reports').send({ clubId: 'RP-CLUB-B', month: '2026-08' }).expect(404);
  });

  it('president A cannot read or touch club B report (404 not 403)', async () => {
    const bReport = (
      await presidentB.post('/reports').send({ clubId: 'RP-CLUB-B', month: '2026-08' }).expect(201)
    ).body as ReportResponse;

    await presidentA.get(`/reports/${bReport.id}`).expect(404);
    await presidentA.patch(`/reports/${bReport.id}`).send({ notes: 'x' }).expect(404);
  });

  it('ZRR sees only their zone; other-zone ZRR sees an empty list; DSC sees all', async () => {
    const sameZone = (
      await zrrSameZone.get('/reports').query({ 'filter[clubId]': 'RP-CLUB-A' }).expect(200)
    ).body as ReportListResponse;
    expect(sameZone.items.some((r) => r.clubId === 'RP-CLUB-A')).toBe(true);

    const otherZone = (
      await zrrOtherZone.get('/reports').query({ 'filter[clubId]': 'RP-CLUB-A' }).expect(200)
    ).body as ReportListResponse;
    expect(otherZone.items).toHaveLength(0);

    const dscAll = (await dsc.get('/reports').expect(200)).body as ReportListResponse;
    expect(dscAll.items.some((r) => r.clubId === 'RP-CLUB-A')).toBe(true);
    expect(dscAll.items.some((r) => r.clubId === 'RP-CLUB-B')).toBe(true);
  });

  it('rejects a clubs-type field value that is not a real club id', async () => {
    const created = (
      await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2026-09' }).expect(201)
    ).body as ReportResponse;

    await presidentA
      .patch(`/reports/${created.id}`)
      .send({
        values: {
          physical_meetings: 2,
          activities: [
            {
              activity_title: 'Community drive',
              activity_date: '2026-09-10',
              avenue: 'community',
              area_of_focus: 'Environment',
              initiated_by: 'rotaract',
              members_participated: 5,
              collaborating_clubs: ['NOT-A-REAL-CLUB'],
            },
          ],
        },
      })
      .expect(400);
  });

  it('submits with valid values and computes filedOnTime from the deadline', async () => {
    const onTime = (
      await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2026-12' }).expect(201)
    ).body as ReportResponse;
    const submittedOnTime = (
      await presidentA
        .patch(`/reports/${onTime.id}`)
        .send({ values: { physical_meetings: 3, activities: [] }, status: 'submitted' })
        .expect(200)
    ).body as ReportResponse;
    expect(submittedOnTime.status).toBe('submitted');
    expect(submittedOnTime.filedOnTime).toBe(true);

    const late = (
      await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2020-01' }).expect(201)
    ).body as ReportResponse;
    const submittedLate = (
      await presidentA
        .patch(`/reports/${late.id}`)
        .send({ values: { physical_meetings: 1, activities: [] }, status: 'submitted' })
        .expect(200)
    ).body as ReportResponse;
    expect(submittedLate.filedOnTime).toBe(false);
  });

  it('query -> reply -> resubmit', async () => {
    const created = (
      await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2027-01' }).expect(201)
    ).body as ReportResponse;
    await presidentA
      .patch(`/reports/${created.id}`)
      .send({ values: { physical_meetings: 2, activities: [] }, status: 'submitted' })
      .expect(200);

    // president has no reports:review grant at all, so the guard rejects before any scope check
    await presidentB.post(`/reports/${created.id}/queries`).send({ question: 'x' }).expect(403);
    // zrr does hold reports:review, but Agni's zone scope doesn't cover an RP-CLUB-A (Prithvi) report
    await zrrOtherZone.post(`/reports/${created.id}/queries`).send({ question: 'x' }).expect(404);

    const queried = (
      await zrrSameZone
        .post(`/reports/${created.id}/queries`)
        .send({ question: 'Please clarify attendance figures' })
        .expect(201)
    ).body as ReportResponse;
    expect(queried.status).toBe('queried');
    const queryId = queried.queries?.[0]?.id;
    expect(queryId).toBeTruthy();

    await presidentB
      .patch(`/reports/${created.id}/queries/${queryId}`)
      .send({ reply: 'x' })
      .expect(404);

    const resubmitted = (
      await presidentA
        .patch(`/reports/${created.id}/queries/${queryId}`)
        .send({ reply: 'Confirmed 12 attendees' })
        .expect(200)
    ).body as ReportResponse;
    expect(resubmitted.status).toBe('submitted');
    expect(resubmitted.queries?.[0]?.reply).toBe('Confirmed 12 attendees');

    // zrr has no reports:submit grant at all, so the guard rejects before any scope/state check
    await zrrSameZone
      .patch(`/reports/${created.id}/queries/${queryId}`)
      .send({ reply: 'again' })
      .expect(403);
    // president A does hold reports:submit and owns the club, but this query already has a reply
    await presidentA
      .patch(`/reports/${created.id}/queries/${queryId}`)
      .send({ reply: 'again' })
      .expect(409);
  });

  it('reports:score can call assist; others cannot', async () => {
    const created = (
      await presidentA.post('/reports').send({ clubId: 'RP-CLUB-A', month: '2027-02' }).expect(201)
    ).body as ReportResponse;
    await presidentA.get(`/reports/${created.id}/assist`).expect(403);
    const res = await dsc.get(`/reports/${created.id}/assist`).expect(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('suggestions');
  });
});

describe('Report requests (§5.2)', () => {
  let app: INestApplication;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let dsc: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'RQ-CLUB-A', name: 'RQ Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'RQ-CLUB-B', name: 'RQ Club B', zoneName: 'Agni' });
    await createUser({
      email: 'rq-president-a@example.com',
      name: 'President A',
      clubId: 'RQ-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RQ-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'RQ-CLUB-A' },
      ],
    });
    await createUser({
      email: 'rq-president-b@example.com',
      name: 'President B',
      clubId: 'RQ-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RQ-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'RQ-CLUB-B' },
      ],
    });
    await createUser({
      email: 'rq-dsc@example.com',
      name: 'DSC',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    presidentA = await signInAndVerify(app, 'rq-president-a@example.com');
    presidentB = await signInAndVerify(app, 'rq-president-b@example.com');
    dsc = await signInAndVerify(app, 'rq-dsc@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a zone-scoped ad-hoc request; only the matching club can respond', async () => {
    const prisma = testPrisma();
    const prithvi = await prisma.zone.findUniqueOrThrow({ where: { name: 'Prithvi' } });
    const created = (
      await dsc
        .post('/report-requests')
        .send({
          title: 'Prithvi zone check-in',
          questions: ['How many members attended?'],
          audience: { zoneIds: [prithvi.id] },
          dueAt: new Date('2026-12-31T00:00:00Z').toISOString(),
        })
        .expect(201)
    ).body as ReportRequestResponse;

    const listA = (await presidentA.get('/report-requests').expect(200)).body as {
      items: ReportRequestResponse[];
    };
    expect(listA.items.some((r) => r.id === created.id)).toBe(true);

    const listB = (await presidentB.get('/report-requests').expect(200)).body as {
      items: ReportRequestResponse[];
    };
    expect(listB.items.some((r) => r.id === created.id)).toBe(false);

    await presidentB
      .put(`/report-requests/${created.id}/responses/RQ-CLUB-B`)
      .send({ answers: { count: 5 } })
      .expect(404);
    await presidentA
      .put(`/report-requests/${created.id}/responses/RQ-CLUB-A`)
      .send({ answers: { count: 12 } })
      .expect(200);
    await presidentB
      .put(`/report-requests/${created.id}/responses/RQ-CLUB-A`)
      .send({ answers: { count: 99 } })
      .expect(404);
  });
});
