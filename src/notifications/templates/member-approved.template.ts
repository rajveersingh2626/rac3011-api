import { defineTemplate } from './layout';
import { link } from './links';

export const memberApprovedTemplate = defineTemplate({
  subject: () => 'Your Rotaract District 3011 membership is approved',
  body: () => ({
    heading: 'Welcome to the district portal',
    paragraphs: [
      'Your membership has been approved. You can now sign in to the portal to see your club, file reports, submit projects and track your contributions.',
    ],
    cta: { label: 'Open the portal', url: link('/portal/dashboard') },
  }),
  push: () => ({
    title: 'Membership approved',
    body: 'Your district portal account is now active.',
    url: '/portal/dashboard',
  }),
});
