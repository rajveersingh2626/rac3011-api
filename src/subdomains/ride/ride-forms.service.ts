import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateRideFormDto,
  RideFormFieldDefinition,
  UpdateRideFormDto,
} from './dto/ride-form.dto';

export interface UnpackedRideForm {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  status: 'draft' | 'published' | 'archived';
  targetRoles: string[];
  fields: RideFormFieldDefinition[];
  isActive: boolean;
  isPublic: boolean;
  version: number;
  submissionCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RideFormsService {
  constructor(private readonly prisma: PrismaService) {}

  private unpackForm(form: any, submissionCount?: number): UnpackedRideForm {
    const rawSchema = (form.schema as any) || {};
    const fields: RideFormFieldDefinition[] = Array.isArray(rawSchema.fields)
      ? rawSchema.fields
      : [];
    const category: string = typeof rawSchema.category === 'string'
      ? rawSchema.category
      : 'General';
    const status: 'draft' | 'published' | 'archived' = rawSchema.status ||
      (form.isActive ? 'published' : 'draft');
    const targetRoles: string[] = Array.isArray(rawSchema.targetRoles)
      ? rawSchema.targetRoles
      : ['all'];

    return {
      id: form.id,
      slug: form.slug,
      title: form.title,
      description: form.description,
      category,
      status,
      targetRoles,
      fields,
      isActive: form.isActive,
      isPublic: form.isPublic,
      version: form.version,
      submissionCount: submissionCount ?? form._count?.submissions ?? 0,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    };
  }

  async listAdminForms(): Promise<UnpackedRideForm[]> {
    const forms = await this.prisma.rideRegistrationForm.findMany({
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return forms.map((f) => this.unpackForm(f));
  }

  async getFormByIdOrSlug(idOrSlug: string): Promise<UnpackedRideForm> {
    const form = await this.prisma.rideRegistrationForm.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`RIDE form with identifier '${idOrSlug}' not found`);
    }

    return this.unpackForm(form);
  }

  async createForm(dto: CreateRideFormDto): Promise<UnpackedRideForm> {
    const existing = await this.prisma.rideRegistrationForm.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(`A form with slug '${dto.slug}' already exists`);
    }

    const schema = {
      fields: dto.fields || [],
      category: dto.category || 'General',
      status: dto.status || 'published',
      targetRoles: dto.targetRoles || ['all'],
    };

    const isPublished = dto.status !== 'draft';
    const isActive = dto.isActive !== undefined ? dto.isActive : isPublished;

    const created = await this.prisma.rideRegistrationForm.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description || null,
        schema: schema as any,
        isActive,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
      },
    });

    return this.unpackForm(created, 0);
  }

  async updateForm(id: string, dto: UpdateRideFormDto): Promise<UnpackedRideForm> {
    const existing = await this.prisma.rideRegistrationForm.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`RIDE form with ID '${id}' not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugCheck = await this.prisma.rideRegistrationForm.findUnique({
        where: { slug: dto.slug },
      });
      if (slugCheck) {
        throw new BadRequestException(`A form with slug '${dto.slug}' already exists`);
      }
    }

    const currentSchema = (existing.schema as any) || {};
    const updatedSchema = {
      fields: dto.fields !== undefined ? dto.fields : (currentSchema.fields || []),
      category: dto.category !== undefined ? dto.category : (currentSchema.category || 'General'),
      status: dto.status !== undefined ? dto.status : (currentSchema.status || 'published'),
      targetRoles: dto.targetRoles !== undefined ? dto.targetRoles : (currentSchema.targetRoles || ['all']),
    };

    const isPublished = updatedSchema.status !== 'draft';
    const isActive = dto.isActive !== undefined
      ? dto.isActive
      : isPublished;

    const updated = await this.prisma.rideRegistrationForm.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title : existing.title,
        slug: dto.slug !== undefined ? dto.slug : existing.slug,
        description: dto.description !== undefined ? dto.description : existing.description,
        schema: updatedSchema as any,
        isActive,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : existing.isPublic,
        version: { increment: 1 },
      },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    return this.unpackForm(updated);
  }

  async deleteForm(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.rideRegistrationForm.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`RIDE form with ID '${id}' not found`);
    }

    await this.prisma.rideRegistrationForm.delete({
      where: { id },
    });

    return { success: true, id };
  }

  async listFormSubmissions(formIdOrSlug: string, statusFilter?: string) {
    const form = await this.prisma.rideRegistrationForm.findFirst({
      where: {
        OR: [{ id: formIdOrSlug }, { slug: formIdOrSlug }],
      },
    });

    if (!form) {
      throw new NotFoundException(`RIDE form '${formIdOrSlug}' not found`);
    }

    const submissions = await this.prisma.rideFormSubmission.findMany({
      where: { formId: form.id },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            homeDistrict: true,
            homeClubName: true,
            participantType: true,
            status: true,
            approvalStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = submissions.map((sub) => {
      const vals = (sub.values as any) || {};
      const status = vals._reviewStatus || 'submitted';
      return {
        id: sub.id,
        formId: sub.formId,
        participantId: sub.participantId,
        participant: sub.participant,
        status,
        reviewNotes: vals._reviewNotes || null,
        reviewedAt: vals._reviewedAt || null,
        values: vals,
        createdAt: sub.createdAt,
      };
    });

    if (statusFilter && statusFilter !== 'all') {
      return mapped.filter((s) => s.status === statusFilter);
    }

    return mapped;
  }

  async updateSubmissionReviewStatus(
    formId: string,
    submissionId: string,
    status: 'submitted' | 'under_review' | 'approved' | 'declined',
    notes?: string,
  ) {
    const sub = await this.prisma.rideFormSubmission.findUnique({
      where: { id: submissionId },
      include: { participant: true },
    });

    if (!sub) {
      throw new NotFoundException(`Submission '${submissionId}' not found`);
    }

    const currentValues = (sub.values as any) || {};
    const updatedValues = {
      ...currentValues,
      _reviewStatus: status,
      _reviewNotes: notes !== undefined ? notes : currentValues._reviewNotes,
      _reviewedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.rideFormSubmission.update({
      where: { id: submissionId },
      data: { values: updatedValues },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            homeDistrict: true,
            homeClubName: true,
            participantType: true,
            status: true,
            approvalStatus: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      formId: updated.formId,
      participantId: updated.participantId,
      participant: updated.participant,
      status,
      reviewNotes: updatedValues._reviewNotes || null,
      reviewedAt: updatedValues._reviewedAt,
      values: updated.values,
      createdAt: updated.createdAt,
    };
  }

  async getActiveFormsForParticipant(participant: any) {
    const forms = await this.prisma.rideRegistrationForm.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const mySubmissions = await this.prisma.rideFormSubmission.findMany({
      where: { participantId: participant.id },
    });

    const subMap = new Map(mySubmissions.map((s) => [s.formId, s]));

    const participantType = participant.participantType || 'external';

    const result = [];
    for (const f of forms) {
      const unpacked = this.unpackForm(f);
      if (unpacked.status !== 'published') continue;

      // Filter by targetRoles
      const roles = unpacked.targetRoles || ['all'];
      const applies =
        roles.includes('all') ||
        roles.includes(participantType) ||
        (participantType === 'delhi_host' && roles.includes('host')) ||
        (participantType === 'external' && roles.includes('delegate'));

      if (!applies) continue;

      const mySub = subMap.get(f.id);
      result.push({
        ...unpacked,
        hasSubmitted: Boolean(mySub),
        mySubmission: mySub
          ? {
              id: mySub.id,
              values: mySub.values,
              createdAt: mySub.createdAt,
            }
          : null,
      });
    }

    return result;
  }

  async submitFormForParticipant(
    formIdOrSlug: string,
    participant: any,
    values: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const form = await this.prisma.rideRegistrationForm.findFirst({
      where: {
        OR: [{ id: formIdOrSlug }, { slug: formIdOrSlug }],
      },
    });

    if (!form) {
      throw new NotFoundException(`RIDE form '${formIdOrSlug}' not found`);
    }

    if (!form.isActive) {
      throw new BadRequestException('This form is currently closed to new submissions');
    }

    const schema = (form.schema as any) || {};
    const fields: RideFormFieldDefinition[] = schema.fields || [];

    // Validate required fields
    for (const field of fields) {
      if (field.required) {
        const val = values[field.name];
        if (val === undefined || val === null || val === '') {
          throw new BadRequestException(`Field '${field.label || field.name}' is required`);
        }
      }
    }

    const cleanValues = { ...values };
    delete cleanValues._reviewStatus;
    delete cleanValues._reviewNotes;
    delete cleanValues._reviewedAt;
    cleanValues._reviewStatus = 'submitted';

    const existingSub = await this.prisma.rideFormSubmission.findFirst({
      where: {
        formId: form.id,
        participantId: participant.id,
      },
    });

    let submission;
    if (existingSub) {
      submission = await this.prisma.rideFormSubmission.update({
        where: { id: existingSub.id },
        data: {
          values: cleanValues,
          ipAddress: ipAddress || existingSub.ipAddress,
          userAgent: userAgent || existingSub.userAgent,
        },
      });
    } else {
      submission = await this.prisma.rideFormSubmission.create({
        data: {
          formId: form.id,
          participantId: participant.id,
          values: cleanValues,
          ipAddress,
          userAgent,
        },
      });
    }

    // Sync to RideParticipant dossierData
    try {
      const participantRecord = await this.prisma.rideParticipant.findUnique({
        where: { id: participant.id },
      });
      if (participantRecord) {
        const currentDossier = (participantRecord.dossierData as any) || {};
        const updatedDossier = {
          ...currentDossier,
          [form.slug]: cleanValues,
        };
        await this.prisma.rideParticipant.update({
          where: { id: participant.id },
          data: {
            dossierData: updatedDossier,
            dossierStatus: 'complete',
          },
        });
      }
    } catch {
      // Non-blocking dossier sync
    }

    return {
      id: submission.id,
      formId: submission.formId,
      participantId: submission.participantId,
      values: submission.values,
      createdAt: submission.createdAt,
    };
  }
}
