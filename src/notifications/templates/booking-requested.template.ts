import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const bookingRequestedTemplate = defineTemplate({
  subject: (data) => `New DRR booking request: ${str(data, 'startsAt', 'a slot')}`,
  body: (data) => ({
    heading: 'A DRR visit has been requested',
    paragraphs: ['Someone has requested a slot on the DRR calendar and is waiting for a decision.'],
    facts: [
      ['Reference', str(data, 'reference')],
      ['Requested by', str(data, 'requesterName')],
      ['Purpose', str(data, 'purpose')],
      ['Slot', str(data, 'startsAt')],
    ],
    cta: { label: 'Confirm or decline', url: link('/drr-calendar/admin') },
  }),
  push: (data) => ({
    title: 'New DRR booking request',
    body: `${str(data, 'requesterName', 'Someone')} requested ${str(data, 'startsAt', 'a slot')}.`,
    url: '/drr-calendar/admin',
  }),
});
