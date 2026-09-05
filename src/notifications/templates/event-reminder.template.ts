import { slugPath, str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

function eventPath(data: Record<string, unknown>): string {
  return slugPath(data, '/calendar', '/portal/events');
}

export const eventReminderTemplate = defineTemplate({
  subject: (data) => `Tomorrow: ${str(data, 'title', 'a district event you are attending')}`,
  body: (data) => ({
    heading: str(data, 'title', 'Your event is tomorrow'),
    paragraphs: ['You said you are going to this event. It starts within the next 24 hours.'],
    facts: [
      ['Starts', str(data, 'startsAt')],
      ['Venue', str(data, 'venue')],
    ],
    cta: { label: 'Event details', url: link(eventPath(data)) },
  }),
  push: (data) => ({
    title: str(data, 'title', 'Event reminder'),
    body: `Starts ${str(data, 'startsAt', 'within 24 hours')}. ${str(data, 'venue')}`.trim(),
    url: eventPath(data),
  }),
});
