import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestContext } from '../common/types/access';
import type { CreateFormInput } from './dto/create-form.dto';
import type { UpdateFormInput } from './dto/update-form.dto';
import type { SubmitFormInput } from './dto/submit-form.dto';
import type { UpdateSubmissionStatusInput } from './dto/update-submission-status.dto';

const CANONICAL_HOST_CLUB_SLUG = 'delhi-meri-jaan-host-club-application-2026';

const DEFAULT_HOST_CLUB_FIELDS = [
  { id: 'hf1', name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'president@club.rotaract3011.org' },
  { id: 'hf2', name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Full Name' },
  { id: 'hf3', name: 'phone', label: 'Contact Number', type: 'phone', required: true, placeholder: '+91 98765 43210' },
  { id: 'hf4', name: 'position', label: 'Position in the Club', type: 'text', required: true, placeholder: 'e.g. Club President / Club Secretary' },
  { id: 'hf5', name: 'clubName', label: 'Rotaract Club Name', type: 'select', required: true },
  { id: 'hf6', name: 'parentRotaryClub', label: 'Parent Rotary Club Name', type: 'text', required: true, helperText: 'Mention NA if not applicable', placeholder: 'Rotary Club of ...' },
  { id: 'hf7', name: 'zone', label: 'Zone', type: 'select', required: true, options: ['Zone Prithvi', 'Zone Agni', 'Zone Vayu', 'Zone Akash'] },
  { id: 'hf8', name: 'motivation', label: 'Why your club should be selected as a Host Club?', type: 'textarea', required: true, placeholder: 'Describe your club motivation and hosting strengths...' },
  { id: 'hf9', name: 'pastHostingExperience', label: 'Has your club hosted inter-district/international Rotaractors before? If yes, share brief details.', type: 'textarea', required: true, placeholder: 'Share any previous hosting experience or NA...' },
  { 
    id: 'hf10', 
    name: 'proposalDriveUrl', 
    label: "Upload Your Club's Proposal (Google Drive Link)", 
    type: 'link', 
    required: true, 
    placeholder: 'https://drive.google.com/...',
    helperText: "Paste the Google Drive link to your club proposal document or presentation. Please ensure the link sharing permission is set to 'Anyone with the link can view'." 
  },
];

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  private get customForm(): any {
    return (this.prisma as any).customForm;
  }

  private get customFormSubmission(): any {
    return (this.prisma as any).customFormSubmission;
  }

  /**
   * Automatically ensure canonical host club application is seeded in DB
   */
  async ensureSeedForms(): Promise<void> {
    const existing = await this.customForm.findUnique({
      where: { slug: CANONICAL_HOST_CLUB_SLUG },
    });

    if (!existing) {
      await this.customForm.create({
        data: {
          slug: CANONICAL_HOST_CLUB_SLUG,
          title: 'Delhi Meri Jaan - Rotaract Inter-District Exchange (RIDE) – Host Club Application',
          description: 'Official application for RID 3011 Rotaract Clubs to host incoming national and international delegates.',
          category: 'Exchange Fellowship & Hosting',
          status: 'published',
          accessMode: 'all',
          targetSurface: 'dashboard',
          targetRoles: ['club_president', 'club_secretary'],
          targetClubIds: [],
          fields: DEFAULT_HOST_CLUB_FIELDS,
          isPublic: false,
        },
      });
    }
  }

  async listForms() {
    await this.ensureSeedForms();
    const forms: any[] = await this.customForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    // Also get counts by status for each form
    const submissions: any[] = await this.customFormSubmission.groupBy({
      by: ['formId', 'status'],
      _count: { id: true },
    });

    const statusCountsMap: Record<string, Record<string, number>> = {};
    for (const s of submissions) {
      if (!statusCountsMap[s.formId]) statusCountsMap[s.formId] = {};
      statusCountsMap[s.formId][s.status] = s._count.id;
    }

    return forms.map((f: any) => ({
      ...f,
      submissionCount: f._count.submissions,
      statusCounts: statusCountsMap[f.id] || {},
    }));
  }

  async getForm(idOrSlug: string) {
    await this.ensureSeedForms();
    const form = await this.customForm.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async createForm(ctx: RequestContext, dto: CreateFormInput) {
    const existing = await this.customForm.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Form with slug "${dto.slug}" already exists`);
    }

    return this.customForm.create({
      data: {
        ...dto,
        createdById: ctx.user.id,
      },
    });
  }

  async updateForm(ctx: RequestContext, id: string, dto: UpdateFormInput) {
    const form = await this.customForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');

    if (dto.slug && dto.slug !== form.slug) {
      const collision = await this.customForm.findUnique({ where: { slug: dto.slug } });
      if (collision) throw new BadRequestException(`Slug "${dto.slug}" is already in use`);
    }

    return this.customForm.update({
      where: { id },
      data: dto,
    });
  }

  async deleteForm(ctx: RequestContext, id: string) {
    const form = await this.customForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    return this.customForm.delete({ where: { id } });
  }

  /**
   * Get active forms targeted to current user / club on dashboard
   */
  async getDashboardActiveForms(ctx: RequestContext) {
    await this.ensureSeedForms();

    // Find current user profile
    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId: ctx.user.id },
      select: { id: true, clubId: true, fullName: true, phone: true },
    });

    const userClubId = profile?.clubId ?? null;
    const userRoleKeys = new Set(ctx.access.roles.map((r) => r.roleKey));
    const isSuperAdmin = ctx.access.isSuperAdmin;

    // Published forms
    const forms: any[] = await this.customForm.findMany({
      where: {
        status: 'published',
        targetSurface: 'dashboard',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check user's submissions for these forms
    const userSubmissions: any[] = await this.customFormSubmission.findMany({
      where: {
        formId: { in: forms.map((f: any) => f.id) },
        OR: [
          { userId: ctx.user.id },
          ...(userClubId ? [{ clubId: userClubId }] : []),
        ],
      },
      orderBy: { submittedAt: 'desc' },
    });

    const submissionByFormId = new Map<string, any>();
    for (const sub of userSubmissions) {
      if (!submissionByFormId.has(sub.formId)) {
        submissionByFormId.set(sub.formId, sub);
      }
    }

    // Filter by targeting
    const eligibleForms = forms.filter((form: any) => {
      if (isSuperAdmin) return true;

      // Access Mode check
      if (form.accessMode === 'none') return false;
      if (form.accessMode === 'specific') {
        const allowedClubs = Array.isArray(form.targetClubIds) ? (form.targetClubIds as string[]) : [];
        if (!userClubId || !allowedClubs.includes(userClubId)) return false;
      }

      // Role check
      const targetRoles = Array.isArray(form.targetRoles) ? (form.targetRoles as string[]) : [];
      if (targetRoles.length > 0) {
        const hasRole = targetRoles.some((r: string) => userRoleKeys.has(r));
        if (!hasRole) return false;
      }

      return true;
    });

    return eligibleForms.map((form: any) => ({
      ...form,
      mySubmission: submissionByFormId.get(form.id) || null,
      hasSubmitted: submissionByFormId.has(form.id),
    }));
  }

  async submitForm(ctx: RequestContext, formIdOrSlug: string, dto: SubmitFormInput) {
    const form = await this.getForm(formIdOrSlug);

    // Profile lookup
    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId: ctx.user.id },
      include: { club: true },
    });

    const applicantName = dto.applicantName || profile?.fullName || ctx.user.name;
    const applicantEmail = dto.applicantEmail || ctx.user.email;
    const applicantPhone = dto.applicantPhone || profile?.phone || '';
    const clubId = dto.clubId || profile?.clubId || null;
    const clubName = dto.clubName || profile?.club?.name || null;

    // Create submission
    return this.customFormSubmission.create({
      data: {
        formId: form.id,
        userId: ctx.user.id,
        applicantName,
        applicantEmail,
        applicantPhone,
        clubId,
        clubName,
        values: dto.values,
        status: 'submitted',
      },
    });
  }

  async listSubmissions(
    formId: string,
    options?: { status?: string; search?: string },
  ) {
    const where: Record<string, any> = { formId };
    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }
    if (options?.search) {
      const q = options.search.trim();
      where.OR = [
        { applicantName: { contains: q, mode: 'insensitive' } },
        { applicantEmail: { contains: q, mode: 'insensitive' } },
        { clubName: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.customFormSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateSubmissionStatus(
    ctx: RequestContext,
    formId: string,
    submissionId: string,
    dto: UpdateSubmissionStatusInput,
  ) {
    const submission = await this.customFormSubmission.findFirst({
      where: { id: submissionId, formId },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    return this.customFormSubmission.update({
      where: { id: submissionId },
      data: {
        status: dto.status,
        notes: dto.notes !== undefined ? dto.notes : submission.notes,
        reviewedById: ctx.user.id,
        reviewedAt: new Date(),
      },
    });
  }
}
