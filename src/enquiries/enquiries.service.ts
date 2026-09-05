import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ContentService } from '../content/content.service';
import { NotificationPort } from '../notifications/notification.port';
import { CreateEnquiryInput } from './dto/create-enquiry.dto';
import type { CreateAdminEnquiryInput } from './dto/create-admin-enquiry.dto';
import type { UpdateEnquiryInput } from './dto/update-enquiry.dto';
import { EnquiriesRepository } from './enquiries.repository';
import type { EnquiryRow } from './enquiries.types';

type RoutingTable = Record<'new_club' | 'sponsor' | 'contact', { name: string; email: string }>;

const FALLBACK_ROUTING: RoutingTable = {
  new_club: { name: '', email: '' },
  sponsor: { name: '', email: '' },
  contact: { name: '', email: '' },
};

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly repo: EnquiriesRepository,
    private readonly content: ContentService,
    private readonly notifications: NotificationPort,
    private readonly audit: AuditService,
  ) {}

  async submit(
    input: CreateEnquiryInput,
  ): Promise<{ id: string; routedToName: string } | { honeypot: true }> {
    if (input.website) return { honeypot: true };
    const routing = await this.content.setting<RoutingTable>('enquiry_routing', FALLBACK_ROUTING);
    const target = routing[input.kind] ?? FALLBACK_ROUTING[input.kind];
    const { id } = await this.repo.create({
      kind: input.kind,
      name: input.name,
      email: input.email,
      phone: input.phone,
      organisation: input.organisation,
      message: input.message,
      payload: input.payload,
      routedTo: target.email || 'unrouted',
    });
    if (target.email) {
      await this.notifications.notify({
        template: 'enquiry-received',
        to: [{ email: target.email }],
        data: { kind: input.kind, name: input.name, email: input.email, message: input.message },
      });
    }
    return { id, routedToName: target.name };
  }

  list(status?: string): Promise<EnquiryRow[]> {
    return this.repo.findAll(status);
  }

  async get(id: string): Promise<EnquiryRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async createAdmin(actorId: string, input: CreateAdminEnquiryInput): Promise<EnquiryRow> {
    const { id } = await this.repo.create(input);
    const row = await this.get(id);
    await this.audit.record({
      actorId,
      action: 'enquiry.created',
      resourceType: 'enquiry',
      resourceId: id,
      after: row,
    });
    return row;
  }

  async update(actorId: string, id: string, input: UpdateEnquiryInput): Promise<EnquiryRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'enquiry.updated',
      resourceType: 'enquiry',
      resourceId: id,
      before,
      after: row,
    });
    return row;
  }

  async remove(actorId: string, id: string): Promise<void> {
    const before = await this.get(id);
    await this.repo.delete(id);
    await this.audit.record({
      actorId,
      action: 'enquiry.deleted',
      resourceType: 'enquiry',
      resourceId: id,
      before,
    });
  }
}
