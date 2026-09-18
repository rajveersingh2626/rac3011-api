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
import { generateBespokeRideEmailHtml, interpolateTokens } from './templates/ride-email.template';

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

    const orClauses: any[] = [{ audienceScope: 'all' }];

    if (cleanDistrict) {
      orClauses.push({
        targetDistricts: { has: cleanDistrict },
      });
      if (district && district !== cleanDistrict) {
        orClauses.push({
          targetDistricts: { has: district },
        });
      }
    }

    if (cleanEmail) {
      orClauses.push({
        targetEmails: { has: cleanEmail },
      });
      if (email && email !== cleanEmail) {
        orClauses.push({
          targetEmails: { has: email },
        });
      }
    }

    return this.prisma.rideAnnouncement.findMany({
      where: {
        OR: orClauses,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
