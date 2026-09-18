import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EmailProviderPool } from '../../notifications/email/email-provider-pool.service';
import {
  RideParticipantsRepository,
  type ParticipantListFilter,
  type ParticipantRecord,
} from './ride-participants.repository';
import type { RegisterParticipantInput } from './dto/register-participant.dto';
import type { DispatchRideBroadcastDto } from './dto/dispatch-ride-broadcast.dto';

function generateBespokeRideEmailHtml(title: string, rawBody: string): string {
  const paragraphs = rawBody
    .split('\n\n')
    .filter((p) => p.trim());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .email-card { border-width: 2px !important; }
      .email-hero-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #171515;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FBC02D; border-bottom: 3px solid #171515;">
    <tr>
      <td style="padding: 10px 16px; text-align: center;">
        <span style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #171515;">
          DELHI MERI JAAN 2026 &bull; ROTARY INTERNATIONAL DISTRICT 3011 &bull; THE RIDE
        </span>
      </td>
    </tr>
  </table>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDFBF7; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 3px solid #171515; border-radius: 20px; box-shadow: 6px 6px 0px #171515; overflow: hidden;">
          <tr>
            <td style="padding: 24px 24px 18px; text-align: center; background-color: #FDFBF7; border-bottom: 2px solid #171515;">
              <span style="display: inline-block; padding: 4px 14px; background-color: #19539D; border: 2px solid #171515; border-radius: 999px; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                Official RIDE Communication &bull; RID 3011
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 28px 24px;">
              <h1 class="email-hero-title" style="margin: 0 0 16px; font-size: 24px; font-weight: 900; line-height: 1.25; text-transform: uppercase; color: #171515; letter-spacing: -0.5px;">
                ${title}
              </h1>

              ${paragraphs.map((p) => `<p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #374151;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px; padding-top: 16px; border-top: 2px dashed #E5E7EB; text-align: center;">
                <tr>
                  <td style="font-size: 11px; color: #6B7280; line-height: 1.5;">
                    Rotary International District 3011 &bull; Delhi Meri Jaan 2026<br/>
                    Delivered securely via the RIDE Operations Console.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function interpolateTokens(
  template: string,
  data: {
    fullName?: string;
    districtNumber?: string;
    passReference?: string;
    hostClub?: string;
  },
): string {
  let result = template
    .replace(/\{\{\s*(?:name|full_name)\s*\}\}/gi, data.fullName || 'Delegate')
    .replace(/\{\{\s*district_number\s*\}\}/gi, data.districtNumber || '3011')
    .replace(/\{\{\s*pass_reference\s*\}\}/gi, data.passReference || 'DMJ-2026-PASS')
    .replace(/\{\{\s*host_club\s*\}\}/gi, data.hostClub || 'Designated Host Club');

  // Sanitize any remaining unparsed {{...}} placeholders so raw brackets never appear
  return result.replace(/\{\{[^}]+\}\}/g, '').trim();
}

@Injectable()
export class RideParticipantsService {
  constructor(
    private readonly repo: RideParticipantsRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly emailPool?: EmailProviderPool,
  ) {}

  async register(
    data: RegisterParticipantInput,
  ): Promise<ParticipantRecord> {
    return this.repo.create(data);
  }

  async list(
    filter: ParticipantListFilter,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ items: ParticipantRecord[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async getById(id: string): Promise<ParticipantRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException(`Participant with ID ${id} not found`);
    }
    return record;
  }

  async getByEmail(email: string): Promise<ParticipantRecord | null> {
    return this.repo.findByEmail(email);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    return this.repo.deleteParticipant(id);
  }

  async updateStatus(
    id: string,
    status: string,
    hostClubId?: string | null,
    hostFamilyName?: string,
    hostFamilyPhone?: string,
  ): Promise<ParticipantRecord> {
    await this.getById(id);
    return this.repo.updateStatus(id, status, hostClubId, hostFamilyName, hostFamilyPhone);
  }

  async adminCreateParticipant(data: {
    fullName: string;
    email: string;
    phone?: string;
    homeDistrict?: string;
    homeClubName?: string;
    password: string;
    rotaryId?: string;
    participantType?: string;
  }): Promise<ParticipantRecord> {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(data.password, 12);
    return this.repo.createWithPassword({
      ...data,
      passwordHash,
    });
  }

  async adminResetPassword(id: string, password: string): Promise<ParticipantRecord> {
    await this.getById(id);
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 12);
    return this.repo.updatePassword(id, passwordHash);
  }

  async adminToggleActive(id: string, isActive: boolean): Promise<ParticipantRecord> {
    await this.getById(id);
    return this.repo.toggleActive(id, isActive);
  }

  async getStats() {
    return this.repo.countStats();
  }

  async dispatchBroadcast(dto: DispatchRideBroadcastDto): Promise<{
    recipientCount: number;
    dispatchedCount: number;
  }> {
    type Recipient = {
      email: string;
      fullName: string;
      districtNumber: string;
      passReference: string;
      hostClub: string;
    };

    const recipientMap = new Map<string, Recipient>();

    // 1. Process custom emails
    if (dto.customEmails && dto.customEmails.length > 0) {
      for (const rawEmail of dto.customEmails) {
        const cleanEmail = rawEmail.trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes('@')) {
          const pseudoPass = `GUEST-${Buffer.from(cleanEmail).toString('hex').slice(0, 8).toUpperCase()}`;
          recipientMap.set(cleanEmail, {
            email: cleanEmail,
            fullName: cleanEmail.split('@')[0],
            districtNumber: '3011',
            passReference: pseudoPass,
            hostClub: 'Designated Host Club',
          });
        }
      }
    }

    // 2. Query participants
    const participants = await this.prisma.rideParticipant.findMany({
      where: { isActive: true },
      include: { hostClub: true },
    });

    const targetDistrictsNormalized = (dto.districtNumbers || []).map((d) =>
      d.replace(/\D/g, ''),
    ).filter(Boolean);

    for (const p of participants) {
      if (!p.email || !p.email.includes('@')) continue;

      let isMatch = false;
      if (dto.all) {
        isMatch = true;
      } else if (dto.hostClubsOnly && p.hostClubId) {
        isMatch = true;
      } else if (targetDistrictsNormalized.length > 0) {
        const pDistDigits = (p.homeDistrict || '').replace(/\D/g, '');
        if (
          targetDistrictsNormalized.includes(pDistDigits) ||
          targetDistrictsNormalized.some((td) => p.homeDistrict?.toLowerCase().includes(td))
        ) {
          isMatch = true;
        }
      }

      if (isMatch) {
        const cleanEmail = p.email.trim().toLowerCase();
        recipientMap.set(cleanEmail, {
          email: cleanEmail,
          fullName: p.fullName,
          districtNumber: p.homeDistrict || '3011',
          passReference: p.id,
          hostClub: p.hostClub?.name || 'Designated Host Club',
        });
      }
    }

    const recipients = Array.from(recipientMap.values());

    // 3. If enabled (or by default), persist announcement into database
    if (dto.publishAsAnnouncement !== false) {
      try {
        await this.prisma.rideAnnouncement.create({
          data: {
            subject: dto.subject,
            body: dto.body,
            sender: 'RIDE Organizing Committee (RID 3011)',
            audienceScope: dto.all ? 'all' : (dto.districtNumbers?.length ? 'district' : 'individual'),
            targetDistricts: dto.districtNumbers || [],
            targetEmails: dto.customEmails || [],
            hostClubsOnly: !!dto.hostClubsOnly,
            recipientCount: recipients.length,
          },
        });
      } catch (err) {
        // Log error without breaking broadcast flow
        console.error('Failed to persist ride announcement to database:', err);
      }
    }

    if (recipients.length === 0) {
      return { recipientCount: 0, dispatchedCount: 0 };
    }

    // Trigger async email dispatch
    const sendBatch = async () => {
      for (const r of recipients) {
        try {
          const interpolatedSubject = interpolateTokens(dto.subject, r);
          const interpolatedBody = interpolateTokens(dto.body, r);
          const html = generateBespokeRideEmailHtml(interpolatedSubject, interpolatedBody);

          if (this.emailPool) {
            await this.emailPool.send({
              to: r.email,
              subject: interpolatedSubject,
              html,
              text: interpolatedBody,
            });
          }
        } catch {
          // continue
        }
      }
    };

    void sendBatch();

    return {
      recipientCount: recipients.length,
      dispatchedCount: recipients.length,
    };
  }

  async listAnnouncementsForParticipant(district?: string, email?: string) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanDistrict = district ? district.replace(/\D/g, '') : '';

    const allAnnouncements = await this.prisma.rideAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return allAnnouncements.filter((ann) => {
      if (ann.audienceScope === 'all') return true;

      if (cleanDistrict && ann.targetDistricts && ann.targetDistricts.length > 0) {
        const matchesDistrict = ann.targetDistricts.some((d) => {
          const digits = d.replace(/\D/g, '');
          return digits === cleanDistrict || d.toLowerCase().includes(cleanDistrict);
        });
        if (matchesDistrict) return true;
      }

      if (cleanEmail && ann.targetEmails && ann.targetEmails.length > 0) {
        const matchesEmail = ann.targetEmails.some((e) => e.toLowerCase() === cleanEmail);
        if (matchesEmail) return true;
      }

      return false;
    });
  }

  async getDistricts(): Promise<string[]> {
    const participants = await this.prisma.rideParticipant.findMany({
      select: { homeDistrict: true },
      distinct: ['homeDistrict'],
    });

    const set = new Set<string>();
    for (const p of participants) {
      if (!p.homeDistrict) continue;
      const clean = p.homeDistrict.trim();
      if (clean) set.add(clean);
    }

    // Include fallback standard RID districts if empty
    if (set.size === 0) {
      ['3011', '3040', '3054', '3070', '3080', '3110', '3120', '3131', '3141', '3142', '3190'].forEach((d) => set.add(d));
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  async resetRegistrations(
    actorId?: string | null,
    confirmation?: string,
    mode: 'soft' | 'hard' = 'soft',
  ): Promise<{ count: number; mode: 'soft' | 'hard' }> {
    if (confirmation !== 'RESET') {
      throw new BadRequestException('Confirmation token "RESET" is required to execute bulk reset');
    }

    const countBefore = await this.prisma.rideParticipant.count({
      where: mode === 'soft' ? { isActive: true } : undefined,
    });

    let affectedCount = 0;
    if (mode === 'hard') {
      const result = await this.prisma.rideParticipant.deleteMany({});
      affectedCount = result.count;
    } else {
      const result = await this.prisma.rideParticipant.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      affectedCount = result.count;
    }

    await this.audit.record({
      actorId: actorId ?? null,
      action: 'ride.participants.reset',
      resourceType: 'ride_participant',
      before: { activeCount: countBefore },
      after: { affectedCount, mode },
    });

    return { count: affectedCount, mode };
  }
}
