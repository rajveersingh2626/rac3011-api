import { Injectable } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { NotificationPort } from '../notifications/notification.port';
import { CreateEnquiryInput } from './dto/create-enquiry.dto';
import { EnquiriesRepository } from './enquiries.repository';

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
}
