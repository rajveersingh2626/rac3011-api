import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const bookingReceivedTemplate = defineTemplate({
  subject: (data) =>
    `DRR visit request received (${str(data, 'reference', 'Request')})`,
  body: (data) => ({
    heading: 'We have received your DRR visit request',
    paragraphs: [
      'Thank you for requesting an official DRR presence visit. Your request has been recorded and submitted to the District Rotaract Representative for review.',
      'You will receive an update once your booking has been reviewed and decided.',
    ],
    facts: [
      ['Reference', str(data, 'reference')],
      ['Slot', str(data, 'startsAt')],
      ['Purpose', str(data, 'purpose')],
    ],
    cta: { label: 'View DRR calendar', url: link('/calendar') },
  }),
  push: (data) => ({
    title: 'DRR visit request received',
    body: `Your request (${str(data, 'reference', 'Request')}) for ${str(data, 'startsAt', 'a slot')} was submitted.`,
    url: '/calendar',
  }),
});
