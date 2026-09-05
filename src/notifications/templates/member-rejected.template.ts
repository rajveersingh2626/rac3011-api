import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const memberRejectedTemplate = defineTemplate({
  subject: () => 'Your Rotaract District 3011 membership request',
  body: (data) => ({
    heading: 'Your membership request was not approved',
    paragraphs: [
      'Your club officers have reviewed your registration and were not able to approve it.',
      'If you think this is a mistake, please contact your club president or secretary.',
    ],
    facts: [['Reason', str(data, 'rejectionReason')]],
    cta: { label: 'Contact the district', url: link('/contact') },
  }),
  push: (data) => ({
    title: 'Membership request',
    body: str(
      data,
      'rejectionReason',
      'Your registration was not approved. Contact your club officers.',
    ),
    url: '/',
  }),
});
