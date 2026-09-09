import type { TemplateKey } from '../notification.port';
import { announcementTemplate } from './announcement.template';
import { bookingConfirmedTemplate } from './booking-confirmed.template';
import { bookingDeclinedTemplate } from './booking-declined.template';
import { bookingReminderTemplate } from './booking-reminder.template';
import { bookingRequestedTemplate } from './booking-requested.template';
import { campApprovedTemplate } from './camp-approved.template';
import { campSubmittedTemplate } from './camp-submitted.template';
import { certificateIssuedTemplate } from './certificate-issued.template';
import { contributionApprovedTemplate } from './contribution-approved.template';
import { enquiryReceivedTemplate } from './enquiry-received.template';
import { eventReminderTemplate } from './event-reminder.template';
import { feedbackRepliedTemplate } from './feedback-replied.template';
import { linkBrokenTemplate } from './link-broken.template';
import { listingVerifiedTemplate } from './listing-verified.template';
import { listingVerifyTemplate } from './listing-verify.template';
import { memberApprovedTemplate } from './member-approved.template';
import { memberRegisteredTemplate } from './member-registered.template';
import { memberRejectedTemplate } from './member-rejected.template';
import { otpTemplate } from './otp.template';
import { passwordResetRequiredTemplate } from './password-reset-required.template';
import { passwordResetTemplate } from './password-reset.template';
import { reportQueriedTemplate } from './report-queried.template';
import { reportRepliedTemplate } from './report-replied.template';
import { reportScoredTemplate } from './report-scored.template';
import { rideHostAssignedTemplate } from './ride-host-assigned.template';
import { showcasePublishedTemplate } from './showcase-published.template';
import { showcaseRejectedTemplate } from './showcase-rejected.template';
import { showcaseSubmittedTemplate } from './showcase-submitted.template';
import type { NotificationTemplate } from './template.types';

export type { NotificationTemplate } from './template.types';

// Record<TemplateKey, ...> makes TS refuse to compile if a TemplateKey is ever added to
// notification.port.ts without a corresponding entry here.
export const TEMPLATES: Record<TemplateKey, NotificationTemplate> = {
  otp: otpTemplate,
  'member-registered': memberRegisteredTemplate,
  'member-approved': memberApprovedTemplate,
  'member-rejected': memberRejectedTemplate,
  'report-queried': reportQueriedTemplate,
  'report-replied': reportRepliedTemplate,
  'report-scored': reportScoredTemplate,
  'showcase-submitted': showcaseSubmittedTemplate,
  'showcase-published': showcasePublishedTemplate,
  'showcase-rejected': showcaseRejectedTemplate,
  announcement: announcementTemplate,
  'feedback-replied': feedbackRepliedTemplate,
  'booking-requested': bookingRequestedTemplate,
  'booking-confirmed': bookingConfirmedTemplate,
  'booking-declined': bookingDeclinedTemplate,
  'booking-reminder': bookingReminderTemplate,
  'link-broken': linkBrokenTemplate,
  'event-reminder': eventReminderTemplate,
  'enquiry-received': enquiryReceivedTemplate,
  'listing-verify': listingVerifyTemplate,
  'listing-verified': listingVerifiedTemplate,
  'camp-submitted': campSubmittedTemplate,
  'camp-approved': campApprovedTemplate,
  'ride-host-assigned': rideHostAssignedTemplate,
  'contribution-approved': contributionApprovedTemplate,
  'certificate-issued': certificateIssuedTemplate,
  'password-reset-required': passwordResetRequiredTemplate,
  'password-reset': passwordResetTemplate,
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
