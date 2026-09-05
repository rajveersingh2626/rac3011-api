import { str } from './data';
import { defineTemplate } from './layout';
import { surfaceLink } from './links';

export const campSubmittedTemplate = defineTemplate({
  subject: () => 'New blood donation camp submitted for review',
  body: (data) => ({
    heading: 'A camp is waiting for approval',
    paragraphs: [
      'A club has submitted a Mission 3011 blood donation camp. It needs review before the units count.',
    ],
    facts: [
      ['Venue', str(data, 'venue')],
      ['Lead club', str(data, 'leadClubName')],
    ],
    cta: { label: 'Review the camp', url: surfaceLink('mission3011', '/admin') },
  }),
  push: (data) => ({
    title: 'Camp submitted for review',
    body: str(data, 'venue', 'A blood donation camp is waiting for approval.'),
    url: '/admin',
  }),
});
