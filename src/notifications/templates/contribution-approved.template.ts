import { optionalSuffix, str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const contributionApprovedTemplate = defineTemplate({
  subject: () => 'Your contribution has been approved',
  body: (data) => ({
    heading: 'Your contribution has been credited',
    paragraphs: [
      'The district has approved an entry in your effort log and credited the points to your profile.',
    ],
    facts: [
      ['Contribution', str(data, 'title')],
      ['Points', str(data, 'points')],
    ],
    cta: { label: 'See your contributions', url: link('/portal/me/contributions') },
  }),
  push: (data) => ({
    title: 'Contribution approved',
    body: `${str(data, 'title', 'Your contribution')} has been credited${optionalSuffix(data, 'points', (v) => ` with ${v} points`)}.`,
    url: '/portal/me/contributions',
  }),
});
