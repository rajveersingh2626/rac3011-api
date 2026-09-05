import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import type { RequestContext } from '../../common/types/access';
import { NotificationPort } from '../../notifications/notification.port';
import { SettingsService } from '../../settings/settings.service';
import type { CreateListingInput } from './dto/create-listing.dto';
import type { UpdateListingInput } from './dto/update-listing.dto';
import { CareerbridgeListingsRepository } from './careerbridge-listings.repository';
import type { CareerbridgeStats, ListingListFilter, ListingRow } from './careerbridge.types';
import { careerbridgeVerifyLink } from './careerbridge.links';

const MANAGE_PERMISSION = 'subdomain:careerbridge:manage' as const;
export const DEFAULT_EXPIRY_DAYS = 60;

@Injectable()
export class CareerbridgeListingsService {
  constructor(
    private readonly repo: CareerbridgeListingsRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
    private readonly settings: SettingsService,
  ) {}

  list(
    ctx: RequestContext,
    filter: ListingListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: ListingRow[]; total: number }> {
    this.assertManage(ctx);
    return this.repo.findMany(filter, page, pageSize);
  }

  async get(ctx: RequestContext, id: string): Promise<ListingRow> {
    this.assertManage(ctx);
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async stats(ctx: RequestContext): Promise<CareerbridgeStats> {
    this.assertManage(ctx);
    return this.repo.stats();
  }

  listPublic(
    filter: Pick<ListingListFilter, 'type'>,
    page: number,
    pageSize: number,
  ): Promise<{ items: ListingRow[]; total: number }> {
    return this.repo.findManyPublic(filter, page, pageSize);
  }

  async getPublic(id: string): Promise<ListingRow> {
    const row = await this.repo.findById(id);
    const isVisible = row && (row.status === 'verified' || row.status === 'filled');
    const notExpired = row?.expiresAt ? row.expiresAt.getTime() > Date.now() : true;
    if (!isVisible || !notExpired) throw new NotFoundException();
    return row;
  }

  // Filled honeypot -> fake success, no DB write; a bot can't tell it apart (decisions.md).
  async submit(input: CreateListingInput): Promise<{ id: string; status: 'pending_email' }> {
    if (input.website) {
      return { id: randomUUID(), status: 'pending_email' };
    }

    const verifyToken = randomBytes(32).toString('hex');
    const created = await this.repo.create({
      title: input.title,
      company: input.company,
      type: input.type,
      location: input.location,
      mode: input.mode,
      stipend: input.stipend ?? null,
      description: input.description,
      applyUrl: input.applyUrl ?? null,
      contactEmail: input.contactEmail,
      postedByName: input.postedByName,
      postedByEmail: input.postedByEmail,
      rotaryAffiliation: input.rotaryAffiliation ?? null,
      verifyToken,
    });

    await this.notifications.notify({
      template: 'listing-verify',
      to: [{ email: created.postedByEmail }],
      data: {
        listingId: created.id,
        title: created.title,
        verifyLink: careerbridgeVerifyLink(verifyToken),
      },
    });

    return { id: created.id, status: 'pending_email' };
  }

  async verify(token: string): Promise<{ id: string; status: 'pending' }> {
    const row = await this.repo.findByVerifyToken(token);
    if (!row || row.status !== 'pending_email') {
      throw new BadRequestException('Invalid or already-used verification token');
    }
    const updated = await this.repo.markPending(row.id);
    return { id: updated.id, status: 'pending' as const };
  }

  async review(ctx: RequestContext, id: string, input: UpdateListingInput): Promise<ListingRow> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    if (input.status === 'verified' || input.status === 'rejected') {
      if (existing.status !== 'pending') {
        throw new BadRequestException(`Cannot review a ${existing.status} listing`);
      }
    } else if (input.status === 'filled') {
      if (existing.status !== 'verified') {
        throw new BadRequestException(`Cannot mark a ${existing.status} listing as filled`);
      }
    } else if (input.status === 'expired') {
      if (existing.status !== 'verified' && existing.status !== 'filled') {
        throw new BadRequestException(`Cannot expire a ${existing.status} listing`);
      }
    }
    if (input.status === 'rejected' && !input.rejectionReason) {
      throw new BadRequestException('rejectionReason is required to reject a listing');
    }

    let expiresAt = existing.expiresAt;
    if (input.status === 'verified') {
      const settings = await this.settings.listAll();
      const expiryDays =
        (settings['careerbridge.expiryDays'] as number | undefined) ?? DEFAULT_EXPIRY_DAYS;
      expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    const updated = await this.repo.review(existing.id, {
      status: input.status,
      verifiedById: input.status === 'verified' ? ctx.user.id : existing.verifiedById,
      verifiedAt: input.status === 'verified' ? new Date() : existing.verifiedAt,
      filledAt: input.status === 'filled' ? new Date() : existing.filledAt,
      expiresAt,
      rejectionReason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
    });

    await this.audit.record({
      actorId: ctx.user.id,
      action: `careerbridge.listing.${input.status}`,
      resourceType: 'cb_listing',
      resourceId: existing.id,
      before: { status: existing.status },
      after: { status: input.status, rejectionReason: input.rejectionReason ?? null },
    });

    if (input.status === 'verified') {
      await this.notifications.notify({
        template: 'listing-verified',
        to: [{ email: updated.postedByEmail }],
        data: { listingId: updated.id, title: updated.title },
      });
    }

    return updated;
  }

  private assertManage(ctx: RequestContext): void {
    if (!ctx.access.isSuperAdmin && (ctx.access.grants[MANAGE_PERMISSION] ?? []).length === 0) {
      throw new ForbiddenException();
    }
  }
}
