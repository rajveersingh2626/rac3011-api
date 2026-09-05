import { str } from './data';
import { defineTemplate } from './layout';
import { surfaceLink } from './links';

export const listingVerifiedTemplate = defineTemplate({
  subject: (data) => `Your Career Bridge listing is live: ${str(data, 'title', 'opportunity')}`,
  body: (data) => ({
    heading: 'Your listing has been approved',
    paragraphs: [
      'The district team has reviewed your opportunity and it is now visible on Career Bridge.',
    ],
    facts: [['Listing', str(data, 'title')]],
    cta: {
      label: 'View the listing',
      url: surfaceLink('careerbridge', `/opportunities/${str(data, 'listingId')}`),
    },
  }),
  push: (data) => ({
    title: 'Career Bridge listing approved',
    body: `${str(data, 'title', 'Your listing')} is now live.`,
    // Relative to the careerbridge subdomain, not the main app — push isn't wired yet (see NotificationDispatchService).
    url: `/opportunities/${str(data, 'listingId')}`,
  }),
});
