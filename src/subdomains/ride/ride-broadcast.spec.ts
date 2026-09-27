import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RideParticipantsService } from './ride-participants.service';

describe('RideParticipantsService - Email Studio & Broadcast Dispatch', () => {
  let service: RideParticipantsService;
  let mockRepo: any;
  let mockPrisma: any;
  let mockAudit: any;
  let mockEmailPool: any;
  let sentMessages: any[];

  beforeEach(() => {
    sentMessages = [];
    mockRepo = {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'part-1',
            fullName: 'Rtr. Alice',
            email: 'alice@rotaract3141.org',
            homeDistrict: '3141',
            referenceNumber: 'DMJ-001',
          },
        ],
        total: 1,
      }),
    };

    const settingsStore = new Map<string, any>();

    mockPrisma = {
      rideParticipant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'part-1',
            fullName: 'Rtr. Alice',
            email: 'alice@rotaract3141.org',
            homeDistrict: '3141',
            referenceNumber: 'DMJ-001',
          },
        ]),
      },
      rideAnnouncement: {
        create: vi.fn().mockResolvedValue({ id: 'ann-1' }),
      },
      setting: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          const val = settingsStore.get(where.key);
          return Promise.resolve(val ? { key: where.key, value: val } : null);
        }),
        upsert: vi.fn().mockImplementation(({ where, create, update }) => {
          const val = create?.value ?? update?.value;
          settingsStore.set(where.key, val);
          return Promise.resolve({ key: where.key, value: val });
        }),
      },
    };

    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockEmailPool = {
      send: vi.fn().mockImplementation((msg) => {
        sentMessages.push(msg);
        return Promise.resolve({ provider: 'resend' });
      }),
    };

    service = new RideParticipantsService(mockRepo, mockPrisma, mockAudit, mockEmailPool);
  });

  it('dispatches emails with strictly RIDE sender address and reply-to', async () => {
    await service.dispatchBroadcast({
      subject: 'Welcome to Delhi Meri Jaan 2026',
      body: 'Your delegation details have arrived.',
      all: true,
      publishAsAnnouncement: false,
    });

    // Wait for async sendBatch to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0].from).toBe('Delhi Meri Jaan • The RIDE <delhimerijaan@rotaract3011.org>');
    expect(sentMessages[0].replyTo).toBe('delhimerijaan@rotaract3011.org');
    expect(sentMessages[0].to).toBe('alice@rotaract3141.org');
  });

  it('correctly passes CC stakeholders in email dispatch payload', async () => {
    const ccList = ['chair@rotaract3011.org', 'secretariat@rotaract3011.org'];

    await service.dispatchBroadcast({
      subject: 'Itinerary Briefing',
      body: 'Please find attached the schedule.',
      all: true,
      cc: ccList,
      publishAsAnnouncement: false,
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0].cc).toEqual(ccList);
    expect(sentMessages[0].from).toBe('Delhi Meri Jaan • The RIDE <delhimerijaan@rotaract3011.org>');
    expect(sentMessages[0].replyTo).toBe('delhimerijaan@rotaract3011.org');
  });

  it('persists and re-uses default CC stakeholders when saveCcAsDefault is set', async () => {
    const defaultCc = ['core-team@rotaract3011.org'];

    // 1. Dispatch with saveCcAsDefault
    await service.dispatchBroadcast({
      subject: 'Initial Broadcast',
      body: 'Testing default CC save',
      all: true,
      cc: defaultCc,
      saveCcAsDefault: true,
      publishAsAnnouncement: false,
    });

    await new Promise((r) => setTimeout(r, 50));

    // Verify stored
    const saved = await service.getDefaultCc();
    expect(saved).toEqual(defaultCc);

    // 2. Next broadcast without explicit CC should use the default CC
    sentMessages = [];
    await service.dispatchBroadcast({
      subject: 'Subsequent Broadcast',
      body: 'Should automatically include saved default CC',
      all: true,
      publishAsAnnouncement: false,
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0].cc).toEqual(defaultCc);
  });
});
