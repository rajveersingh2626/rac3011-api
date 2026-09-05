import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const bookingConfirmedTemplate = defineTemplate({
  subject: (data) =>
    `Your DRR booking is confirmed for ${str(data, 'startsAt', 'the requested slot')}`,
  body: (data) => ({
    heading: 'Your DRR booking is confirmed',
    paragraphs: [
      'The District Rotaract Representative has confirmed your slot. Please keep the reference below for any correspondence.',
    ],
    facts: [
      ['Reference', str(data, 'reference')],
      ['Slot', str(data, 'startsAt')],
      ['Purpose', str(data, 'purpose')],
    ],
    cta: { label: 'View the calendar', url: link('/drr-calendar') },
  }),
  push: (data) => ({
    title: 'DRR booking confirmed',
    body: `Your slot on ${str(data, 'startsAt', 'the requested date')} is confirmed.`,
    url: '/drr-calendar',
  }),
});
