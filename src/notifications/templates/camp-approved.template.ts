import { optionalSuffix, str } from './data';
import { defineTemplate } from './layout';
import { surfaceLink } from './links';

export const campApprovedTemplate = defineTemplate({
  subject: () => 'Your blood donation camp has been approved',
  body: (data) => ({
    heading: 'Camp approved',
    paragraphs: [
      'Your Mission 3011 camp has been approved and its units now count towards the district total.',
    ],
    facts: [['Units collected', str(data, 'unitsCollected')]],
    cta: { label: 'See the camps', url: surfaceLink('mission3011', '/camps') },
  }),
  push: (data) => ({
    title: 'Camp approved',
    body: `Your camp is approved${optionalSuffix(data, 'unitsCollected', (v) => ` with ${v} units counted`)}.`,
    // Relative to the mission3011 subdomain, not the main app — push isn't wired yet (see NotificationDispatchService).
    url: '/camps',
  }),
});
