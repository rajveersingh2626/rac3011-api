export type TemplateKey =
  | 'otp'
  | 'member-registered'
  | 'member-approved'
  | 'member-rejected'
  | 'report-queried'
  | 'report-replied'
  | 'report-scored'
  | 'showcase-submitted'
  | 'showcase-published'
  | 'showcase-rejected'
  | 'announcement'
  | 'feedback-replied'
  | 'booking-requested'
  | 'booking-confirmed'
  | 'booking-declined'
  | 'booking-reminder'
  | 'link-broken'
  | 'event-reminder'
  | 'enquiry-received'
  | 'listing-verify'
  | 'listing-verified'
  | 'camp-submitted'
  | 'camp-approved'
  | 'ride-host-assigned'
  | 'contribution-approved'
  | 'certificate-issued'
  | 'password-reset-required';

export interface NotifyInput {
  template: TemplateKey;
  to: { userId?: string; email?: string }[];
  data: Record<string, unknown>;
  channels?: ('email' | 'push')[];
}

export abstract class NotificationPort {
  abstract notify(input: NotifyInput): Promise<void>;
}
