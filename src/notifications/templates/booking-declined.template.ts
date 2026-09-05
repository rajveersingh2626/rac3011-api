import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const bookingDeclinedTemplate = defineTemplate({
  subject: () => 'Your DRR booking could not be confirmed',
  body: (data) => ({
    heading: 'Your DRR booking was declined',
    paragraphs: [
      'The slot you requested is not available. You are welcome to pick another one on the calendar.',
    ],
    facts: [
      ['Reference', str(data, 'reference')],
      ['Slot', str(data, 'startsAt')],
      ['Reason', str(data, 'decisionReason')],
    ],
    cta: { label: 'Pick another slot', url: link('/drr-calendar') },
  }),
  push: (data) => ({
    title: 'DRR booking declined',
    body: str(data, 'decisionReason', 'Your requested slot is not available.'),
    url: '/drr-calendar',
  }),
});
