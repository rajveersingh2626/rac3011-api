import type { TemplateKey } from '../notification.port';
import { genericTemplate } from './generic.template';
import { otpTemplate } from './otp.template';
import { passwordResetRequiredTemplate } from './password-reset-required.template';
import type { NotificationTemplate } from './template.types';

export type { NotificationTemplate } from './template.types';

// Record<TemplateKey, ...> makes TS refuse to compile if a TemplateKey is ever added to
// notification.port.ts without a corresponding entry here (falls back to genericTemplate(key)).
export const TEMPLATES: Record<TemplateKey, NotificationTemplate> = {
  otp: otpTemplate,
  'member-registered': genericTemplate('member-registered'),
  'member-approved': genericTemplate('member-approved'),
  'member-rejected': genericTemplate('member-rejected'),
  'report-queried': genericTemplate('report-queried'),
  'report-replied': genericTemplate('report-replied'),
  'report-scored': genericTemplate('report-scored'),
  'showcase-submitted': genericTemplate('showcase-submitted'),
  'showcase-published': genericTemplate('showcase-published'),
  'showcase-rejected': genericTemplate('showcase-rejected'),
  announcement: genericTemplate('announcement'),
  'feedback-replied': genericTemplate('feedback-replied'),
  'booking-requested': genericTemplate('booking-requested'),
  'booking-confirmed': genericTemplate('booking-confirmed'),
  'booking-declined': genericTemplate('booking-declined'),
  'booking-reminder': genericTemplate('booking-reminder'),
  'link-broken': genericTemplate('link-broken'),
  'event-reminder': genericTemplate('event-reminder'),
  'enquiry-received': genericTemplate('enquiry-received'),
  'listing-verify': genericTemplate('listing-verify'),
  'listing-verified': genericTemplate('listing-verified'),
  'camp-submitted': genericTemplate('camp-submitted'),
  'camp-approved': genericTemplate('camp-approved'),
  'ride-host-assigned': genericTemplate('ride-host-assigned'),
  'contribution-approved': genericTemplate('contribution-approved'),
  'certificate-issued': genericTemplate('certificate-issued'),
  'password-reset-required': passwordResetRequiredTemplate,
};

export function renderEmail(
  key: TemplateKey,
  data: Record<string, unknown>,
): { subject: string; html: string; text: string } {
  const template = TEMPLATES[key];
  return { subject: template.subject(data), html: template.html(data), text: template.text(data) };
}

export function renderPush(
  key: TemplateKey,
  data: Record<string, unknown>,
): { title: string; body: string; url: string } {
  return TEMPLATES[key].push(data);
}
