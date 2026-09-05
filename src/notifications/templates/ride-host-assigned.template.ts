import { str } from './data';
import { defineTemplate } from './layout';
import { surfaceLink } from './links';

export const rideHostAssignedTemplate = defineTemplate({
  subject: (data) =>
    `You are hosting a RIDE delegation from ${str(data, 'visitingDistrict', 'another district')}`,
  body: (data) => ({
    heading: 'Your club has been assigned a delegation',
    paragraphs: [
      'You are the host club for an incoming RIDE delegation. Please review the dates and plan the hosting.',
    ],
    facts: [
      ['District', str(data, 'visitingDistrict')],
      ['Country', str(data, 'country')],
      ['From', str(data, 'startsAt')],
      ['To', str(data, 'endsAt')],
    ],
    cta: { label: 'Open RIDE', url: surfaceLink('ride', '/incoming') },
  }),
  push: (data) => ({
    title: 'RIDE hosting assigned',
    body: `${str(data, 'visitingDistrict', 'A delegation')} visits ${str(data, 'startsAt')} to ${str(data, 'endsAt')}.`,
    // Relative to the ride subdomain, not the main app — push isn't wired yet (see NotificationDispatchService).
    url: '/incoming',
  }),
});
