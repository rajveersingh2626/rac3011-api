import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const bookingReminderTemplate = defineTemplate({
  subject: (data) => `Reminder: your DRR booking on ${str(data, 'startsAt', 'the confirmed slot')}`,
  body: (data) => ({
    heading: 'Your DRR booking is coming up',
    paragraphs: [
      'This is a reminder for the slot you booked with the District Rotaract Representative.',
    ],
    facts: [
      ['Reference', str(data, 'reference')],
      ['Slot', str(data, 'startsAt')],
      ['Purpose', str(data, 'purpose')],
    ],
    cta: { label: 'View the calendar', url: link('/drr-calendar') },
  }),
  push: (data) => ({
    title: 'DRR booking reminder',
    body: `Your booking is on ${str(data, 'startsAt', 'the confirmed slot')}.`,
    url: '/drr-calendar',
  }),
});
