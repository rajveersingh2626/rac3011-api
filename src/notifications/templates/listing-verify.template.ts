import { str } from './data';
import { defineTemplate } from './layout';

export const listingVerifyTemplate = defineTemplate({
  subject: () => 'Confirm your Career Bridge listing',
  body: (data) => ({
    heading: 'Confirm your email to submit the listing',
    paragraphs: [
      'You posted an opportunity on Career Bridge. Confirm this email address so the district team can review it. The link is single-use.',
    ],
    facts: [['Listing', str(data, 'title')]],
    cta: { label: 'Confirm my listing', url: str(data, 'verifyLink') },
  }),
  push: (data) => ({
    title: 'Confirm your Career Bridge listing',
    body: str(data, 'title', 'Check your email to confirm the listing.'),
    url: '/',
  }),
});
