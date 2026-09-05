import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const certificateIssuedTemplate = defineTemplate({
  subject: (data) => `Your certificate is ready: ${str(data, 'title', 'Rotaract District 3011')}`,
  body: (data) => ({
    heading: 'A certificate has been issued to you',
    paragraphs: ['You can download it any time from your portal profile.'],
    facts: [
      ['Certificate', str(data, 'title')],
      ['Issued', str(data, 'issuedAt')],
    ],
    cta: { label: 'Download it', url: link('/portal/me/certificates') },
  }),
  push: (data) => ({
    title: 'Certificate issued',
    body: `${str(data, 'title', 'Your certificate')} is ready to download.`,
    url: '/portal/me/certificates',
  }),
});
