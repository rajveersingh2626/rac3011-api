import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RideFormsService } from './ride-forms.service';

describe('RideFormsService', () => {
  let service: RideFormsService;
  let prisma: any;

  const mockForm = {
    id: 'form_123',
    slug: 'dmj-delegate-kit',
    title: 'DMJ Delegate Intake Form',
    description: 'Official intake form for DMJ 2026',
    schema: {
      fields: [
        { id: 'f1', name: 'tShirtSize', label: 'T-Shirt Size', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
        { id: 'f2', name: 'arrivalProof', label: 'Ticket / Flight PDF Link', type: 'link', required: false },
      ],
      category: 'intake',
      status: 'published',
      targetRoles: ['all'],
    },
    isActive: true,
    isPublic: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { submissions: 1 },
  };

  const mockSubmission = {
    id: 'sub_123',
    formId: 'form_123',
    participantId: 'part_123',
    values: {
      tShirtSize: 'L',
      arrivalProof: 'https://drive.google.com/test-ticket',
      _reviewStatus: 'submitted',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Vitest Test Agent',
    createdAt: new Date(),
  };

  const mockParticipant = {
    id: 'part_123',
    fullName: 'Rahul Sharma',
    email: 'rahul@example.com',
    homeDistrict: '3131',
    participantType: 'external',
    dossierData: {},
    dossierStatus: 'incomplete',
  };

  beforeEach(() => {
    prisma = {
      rideRegistrationForm: {
        findMany: vi.fn().mockResolvedValue([mockForm]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.slug === mockForm.slug || where.id === mockForm.id) {
            return Promise.resolve(mockForm);
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const match = where.OR?.some((cond: any) => cond.id === mockForm.id || cond.slug === mockForm.slug);
          return Promise.resolve(match ? mockForm : null);
        }),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'form_new',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        })),
        update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
          ...mockForm,
          ...data,
          _count: { submissions: 1 },
        })),
        delete: vi.fn().mockResolvedValue({ id: 'form_123' }),
      },
      rideFormSubmission: {
        findMany: vi.fn().mockResolvedValue([
          {
            ...mockSubmission,
            participant: mockParticipant,
          },
        ]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === mockSubmission.id) {
            return Promise.resolve({
              ...mockSubmission,
              participant: mockParticipant,
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'sub_new',
          ...data,
          createdAt: new Date(),
        })),
        update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
          ...mockSubmission,
          ...data,
          participant: mockParticipant,
        })),
      },
      rideParticipant: {
        findUnique: vi.fn().mockResolvedValue(mockParticipant),
        update: vi.fn().mockResolvedValue({
          ...mockParticipant,
          dossierStatus: 'complete',
        }),
      },
    };

    service = new RideFormsService(prisma);
  });

  describe('listAdminForms', () => {
    it('should return a list of unpacked forms with submission counts', async () => {
      const forms = await service.listAdminForms();
      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('form_123');
      expect(forms[0].fields).toHaveLength(2);
      expect(forms[0].submissionCount).toBe(1);
    });
  });

  describe('createForm', () => {
    it('should reject duplicate slug creation', async () => {
      await expect(
        service.createForm({
          title: 'Duplicate Slug Form',
          slug: 'dmj-delegate-kit',
          fields: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a valid form and pack fields into schema JSON', async () => {
      const created = await service.createForm({
        title: 'New Intake Form',
        slug: 'new-intake-form',
        category: 'Travel',
        fields: [
          { id: 'f1', name: 'mode', label: 'Mode of Travel', type: 'select', required: true, options: ['Flight', 'Train'] },
        ],
      });

      expect(created.title).toBe('New Intake Form');
      expect(created.slug).toBe('new-intake-form');
      expect(prisma.rideRegistrationForm.create).toHaveBeenCalled();
    });
  });

  describe('submitFormForParticipant', () => {
    it('should reject submission if required field is missing', async () => {
      await expect(
        service.submitFormForParticipant(
          'dmj-delegate-kit',
          mockParticipant,
          { arrivalProof: 'https://test.link' }, // missing tShirtSize
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid submission and update participant dossier', async () => {
      const result = await service.submitFormForParticipant(
        'dmj-delegate-kit',
        mockParticipant,
        { tShirtSize: 'M', arrivalProof: 'https://test.link' },
        '1.2.3.4',
        'Mozilla/5.0',
      );

      expect(result).toBeDefined();
      expect(prisma.rideFormSubmission.create).toHaveBeenCalled();
      expect(prisma.rideParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockParticipant.id },
          data: expect.objectContaining({
            dossierStatus: 'complete',
          }),
        }),
      );
    });
  });

  describe('updateSubmissionReviewStatus', () => {
    it('should update review status and notes', async () => {
      const updated = await service.updateSubmissionReviewStatus(
        'form_123',
        'sub_123',
        'approved',
        'All documents verified',
      );

      expect(updated.status).toBe('approved');
      expect(updated.reviewNotes).toBe('All documents verified');
      expect(prisma.rideFormSubmission.update).toHaveBeenCalled();
    });
  });
});
