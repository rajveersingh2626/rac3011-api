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
          targetRoles: ['president', 'secretary', 'member'],
          targetClubIds: [],
          fields: DEFAULT_HOST_CLUB_FIELDS,
          isPublic: false,
        },
      });
    }

    const hostClubForm = existing ?? (await this.customForm.findUnique({
      where: { slug: CANONICAL_HOST_CLUB_SLUG },
    }));

    // Auto-migrate any existing applications from ride_support_clubs into custom_form_submissions
    if (hostClubForm) {
      try {
        const supportClubs: any[] = await (this.prisma as any).rideSupportClub.findMany({
          include: { club: true },
        });

        for (const sc of supportClubs) {
          const notesText = sc.notes || '';
          const driveMatch = notesText.match(/Google Drive Proposal:\s*([^\s|]+)/i);
          const proposalUrl = driveMatch ? driveMatch[1].trim() : '';
          const motivationMatch = notesText.match(/Motivation:\s*([^|]+)/i);
          const motivation = motivationMatch ? motivationMatch[1].trim() : notesText;
          const positionMatch = notesText.match(/Position:\s*([^|]+)/i);
          const position = positionMatch ? positionMatch[1].trim() : 'Club President';
          const zoneMatch = notesText.match(/Zone:\s*([^|]+)/i);
          const zone = zoneMatch ? zoneMatch[1].trim() : '';

          const alreadyExists = await this.customFormSubmission.findFirst({
            where: {
              formId: hostClubForm.id,
              OR: [
                { id: sc.id },
                { userId: sc.createdById },
                ...(sc.clubId ? [{ clubId: sc.clubId }] : []),
              ],
            },
          });

          if (!alreadyExists) {
            await this.customFormSubmission.create({
              data: {
                id: sc.id,
                formId: hostClubForm.id,
                userId: sc.createdById || null,
                clubId: sc.clubId || null,
                applicantName: sc.club?.name ? `Host Club (${sc.club.name})` : 'Host Club Applicant',
                applicantEmail: 'hostclub@district3011.org',
                applicantPhone: sc.contactPhone || '',
                clubName: sc.club?.name || 'District 3011',
                status: 'under_review',
                values: {
                  clubName: sc.club?.name || 'District 3011',
                  proposalDriveUrl: proposalUrl,
                  motivation,
                  position,
                  zone,
                  phone: sc.contactPhone || '',
                  capacityDelegates: sc.capacityDelegates || 10,
                  homestayAvailable: sc.homestayAvailable ?? true,
                },
                notes: sc.notes,
                submittedAt: sc.createdAt || new Date(),
              },
            });
          }
        }
      } catch {
        // Silently skip if table or relations are unavailable
      }
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
      // 1. If form accessMode is 'none', it is disabled for EVERYONE (including superadmin) on active dashboard
      if (form.accessMode === 'none') return false;

      if (isSuperAdmin) return true;

      // 2. Specific clubs check
      if (form.accessMode === 'specific') {
        const allowedClubs = Array.isArray(form.targetClubIds) ? (form.targetClubIds as string[]) : [];
        if (!userClubId || !allowedClubs.includes(userClubId)) return false;
      }

      // 3. Role check with normalized keys
      const targetRoles = Array.isArray(form.targetRoles) ? (form.targetRoles as string[]) : [];
      if (targetRoles.length > 0) {
        const hasRole = targetRoles.some((r: string) => {
          const lowerR = r.toLowerCase();
          return (
            userRoleKeys.has(r) ||
            userRoleKeys.has(lowerR) ||
            (lowerR === 'club_president' && userRoleKeys.has('president')) ||
            (lowerR === 'club_secretary' && userRoleKeys.has('secretary')) ||
            (lowerR === 'president' && userRoleKeys.has('club_president')) ||
            (lowerR === 'secretary' && userRoleKeys.has('club_secretary')) ||
            (lowerR === 'all_members' && (userRoleKeys.has('member') || userRoleKeys.has('president') || userRoleKeys.has('secretary')))
          );
        });
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
    formIdOrSlug: string,
    options?: { status?: string; search?: string },
  ) {
    const form = await this.customForm.findFirst({
      where: {
        OR: [{ id: formIdOrSlug }, { slug: formIdOrSlug }],
      },
    });

    const formId = form?.id ?? formIdOrSlug;
    const formSlug = form?.slug ?? formIdOrSlug;

    const where: Record<string, any> = {
      OR: [{ formId }, { formId: formSlug }],
    };

    if (options?.status && options.status !== 'all') {
      where.status = options.status;
    }
    if (options?.search) {
      const q = options.search.trim();
      where.AND = [
        {
          OR: [
            { applicantName: { contains: q, mode: 'insensitive' } },
            { applicantEmail: { contains: q, mode: 'insensitive' } },
            { clubName: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return this.customFormSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateSubmissionStatus(
    ctx: RequestContext,
    formIdOrSlug: string,
    submissionId: string,
    dto: UpdateSubmissionStatusInput,
  ) {
    const form = await this.customForm.findFirst({
      where: {
        OR: [{ id: formIdOrSlug }, { slug: formIdOrSlug }],
      },
    });
    const formId = form?.id ?? formIdOrSlug;
    const formSlug = form?.slug ?? formIdOrSlug;

    const submission = await this.customFormSubmission.findFirst({
      where: {
        id: submissionId,
        OR: [{ formId }, { formId: formSlug }],
      },
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
