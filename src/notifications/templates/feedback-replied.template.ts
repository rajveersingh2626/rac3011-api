import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const feedbackRepliedTemplate = defineTemplate({
  subject: () => 'The district has replied to your feedback',
  body: (data) => ({
    heading: 'You have a reply',
    paragraphs: ['Someone from the district team has responded to the feedback you sent.'],
    facts: [['Reply', str(data, 'reply')]],
    cta: { label: 'Open feedback', url: link('/portal/feedback') },
  }),
  push: (data) => ({
    title: 'Reply to your feedback',
    body: str(data, 'reply', 'The district team has responded.'),
    url: '/portal/feedback',
  }),
});
