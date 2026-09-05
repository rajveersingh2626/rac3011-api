import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';
import { testPrisma } from './db';

describe('Announcements (spec §6.6, acceptance test #11)', () => {
  let app: INestApplication;
  let dsc: TestAgent;
  let secretaryAgni: TestAgent;
  let presidentAgni: TestAgent;
  let presidentVayu: TestAgent;
  let memberAgni: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'ANN-CLUB-AGNI', name: 'Announcements Club Agni', zoneName: 'Agni' });
    await createClub({ id: 'ANN-CLUB-VAYU', name: 'Announcements Club Vayu', zoneName: 'Vayu' });
    // A second Agni club so the acceptance-test estimate (secretaries of Agni) is more than one.
    await createClub({
      id: 'ANN-CLUB-AGNI-2',
      name: 'Announcements Club Agni 2',
      zoneName: 'Agni',
    });

    await createUser({
      email: 'ann-dsc@example.com',
      name: 'DSC Announcements',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    await createUser({
      email: 'ann-secretary-agni@example.com',
      name: 'Secretary Agni',
      clubId: 'ANN-CLUB-AGNI',
      roles: [{ key: 'secretary', scopeType: 'club', scopeId: 'ANN-CLUB-AGNI' }],
    });
    await createUser({
      email: 'ann-secretary-agni-2@example.com',
      name: 'Secretary Agni 2',
      clubId: 'ANN-CLUB-AGNI-2',
      roles: [{ key: 'secretary', scopeType: 'club', scopeId: 'ANN-CLUB-AGNI-2' }],
    });
    await createUser({
      email: 'ann-secretary-vayu@example.com',
      name: 'Secretary Vayu',
      clubId: 'ANN-CLUB-VAYU',
      roles: [{ key: 'secretary', scopeType: 'club', scopeId: 'ANN-CLUB-VAYU' }],
    });
    await createUser({
      email: 'ann-president-agni@example.com',
      name: 'President Agni',
      clubId: 'ANN-CLUB-AGNI',
      roles: [{ key: 'president', scopeType: 'club', scopeId: 'ANN-CLUB-AGNI' }],
    });
    await createUser({
      email: 'ann-president-vayu@example.com',
      name: 'President Vayu',
      clubId: 'ANN-CLUB-VAYU',
      roles: [{ key: 'president', scopeType: 'club', scopeId: 'ANN-CLUB-VAYU' }],
    });
    await createUser({
      email: 'ann-member-agni@example.com',
      name: 'Member Agni',
      clubId: 'ANN-CLUB-AGNI',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'ANN-CLUB-AGNI' }],
    });

    // "Acting secretary" grant on a club they aren't a member of; their own profile club
    // is a third, unused zone so only the grant explains a match on zoneIds:[Vayu].
    await createClub({
      id: 'ANN-CLUB-VAYU-3',
      name: 'Announcements Club Vayu 3',
      zoneName: 'Vayu',
    });
    await createClub({ id: 'ANN-CLUB-AKASH', name: 'Announcements Club Akash', zoneName: 'Akash' });
    await createUser({
      email: 'ann-acting-secretary@example.com',
      name: 'Acting Secretary',
      clubId: 'ANN-CLUB-AKASH',
      roles: [{ key: 'secretary', scopeType: 'club', scopeId: 'ANN-CLUB-VAYU-3' }],
    });

    app = await createTestApp();
    dsc = await signInAndVerify(app, 'ann-dsc@example.com');
    secretaryAgni = await signInAndVerify(app, 'ann-secretary-agni@example.com');
    presidentAgni = await signInAndVerify(app, 'ann-president-agni@example.com');
    presidentVayu = await signInAndVerify(app, 'ann-president-vayu@example.com');
    memberAgni = await signInAndVerify(app, 'ann-member-agni@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('empty audience is rejected with 400', async () => {
    await dsc.post('/announcements/audience/estimate').send({ audience: {} }).expect(400);
    await dsc.post('/announcements').send({ title: 'x', body: 'y', audience: {} }).expect(400);
  });

  it('acceptance test #11: {roleKeys:[secretary], zoneIds:[Agni]} estimates the Agni secretaries', async () => {
    const zone = await testPrisma().zone.findUniqueOrThrow({ where: { name: 'Agni' } });
    const audience = { roleKeys: ['secretary'], zoneIds: [zone.id] };

    const estimate = (
      await dsc.post('/announcements/audience/estimate').send({ audience }).expect(200)
    ).body as { count: number };
    expect(estimate.count).toBe(2);

    const created = (
      await dsc
        .post('/announcements')
        .send({
          title: 'Agni secretaries only',
          body: 'Zone update',
          audience,
          channels: ['portal', 'email'],
        })
        .expect(201)
    ).body as { id: string; recipientCount: number };
    expect(created.recipientCount).toBe(2);

    const outboxRows = await testPrisma().notificationOutbox.findMany({
      where: { template: 'announcement', subject: { contains: 'Agni secretaries only' } },
    });
    expect(outboxRows).toHaveLength(2);
    expect(new Set(outboxRows.map((r) => r.channel))).toEqual(new Set(['email']));
  });

  it('a member cannot send an announcement', async () => {
    await memberAgni
      .post('/announcements')
      .send({ title: 'x', body: 'y', audience: { clubIds: ['ANN-CLUB-AGNI'] } })
      .expect(403);
  });

  it('clubIds alone select nobody: §6.6 only narrows a roleKeys selection, it is not its own selector', async () => {
    // Deliberate per spec §6.6: clubIds/zoneIds only narrow a roleKeys selection, they select no one alone.
    const sent = (
      await dsc
        .post('/announcements')
        .send({
          title: 'club only, no roleKeys',
          body: 'should reach nobody',
          audience: { clubIds: ['ANN-CLUB-AGNI'] },
        })
        .expect(201)
    ).body as { recipientCount: number };
    expect(sent.recipientCount).toBe(0);
  });

  it('a president can send to their own club but not another club (403)', async () => {
    await presidentAgni
      .post('/announcements')
      .send({
        title: 'Agni club update',
        body: 'hello',
        audience: { roleKeys: ['secretary'], clubIds: ['ANN-CLUB-AGNI'] },
      })
      .expect(201);

    await presidentAgni
      .post('/announcements')
      .send({
        title: 'Vayu club update',
        body: 'hello',
        audience: { clubIds: ['ANN-CLUB-VAYU'] },
      })
      .expect(403);
  });

  it('a president cannot send an unrestricted district-wide roleKeys audience', async () => {
    await presidentVayu
      .post('/announcements')
      .send({ title: 'all secretaries', body: 'hello', audience: { roleKeys: ['secretary'] } })
      .expect(403);
  });

  it('a president cannot escalate via zoneIds to a zone containing another club', async () => {
    const zone = await testPrisma().zone.findUniqueOrThrow({ where: { name: 'Agni' } });
    await presidentAgni
      .post('/announcements')
      .send({
        title: 'zone escalation attempt',
        body: 'hello',
        audience: { roleKeys: ['secretary'], zoneIds: [zone.id] },
      })
      .expect(403);
  });

  it('a president cannot target a memberId from another club', async () => {
    const otherClubMember = await testPrisma().memberProfile.findFirstOrThrow({
      where: { clubId: 'ANN-CLUB-VAYU' },
    });
    await presidentAgni
      .post('/announcements')
      .send({
        title: 'member escalation attempt',
        body: 'hello',
        audience: { memberIds: [otherClubMember.id] },
      })
      .expect(403);
  });

  it('audience/estimate itself enforces the sender scope, not only send', async () => {
    await presidentVayu
      .post('/announcements/audience/estimate')
      .send({ audience: { clubIds: ['ANN-CLUB-AGNI'] } })
      .expect(403);
  });

  it('a role grant scoped to a club matches a zoneIds query even if the holder is a member elsewhere', async () => {
    const zone = await testPrisma().zone.findUniqueOrThrow({ where: { name: 'Vayu' } });
    const byZone = (
      await dsc
        .post('/announcements/audience/estimate')
        .send({ audience: { roleKeys: ['secretary'], zoneIds: [zone.id] } })
        .expect(200)
    ).body as { count: number };
    expect(byZone.count).toBe(2); // secretaryVayu (own club/zone) + the acting secretary (grant only)

    const byClub = (
      await dsc
        .post('/announcements/audience/estimate')
        .send({ audience: { roleKeys: ['secretary'], clubIds: ['ANN-CLUB-VAYU-3'] } })
        .expect(200)
    ).body as { count: number };
    expect(byClub.count).toBe(1); // the acting secretary, despite their own profile club being Agni
  });

  it('the feed only returns sent announcements and marks them read', async () => {
    const draftAudienceSent = await dsc
      .post('/announcements')
      .send({
        title: 'Feed visible',
        body: 'for everyone',
        audience: { clubIds: ['ANN-CLUB-AGNI'] },
      })
      .expect(201);
    const sentId = (draftAudienceSent.body as { id: string }).id;

    const feed = (await secretaryAgni.get('/announcements').expect(200)).body as {
      items: { id: string }[];
    };
    expect(feed.items.some((a) => a.id === sentId)).toBe(true);

    const read = await testPrisma().announcementRead.findFirst({
      where: { announcementId: sentId },
    });
    expect(read).not.toBeNull();
  });
});
