import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const showcaseRejectedTemplate = defineTemplate({
  subject: (data) => `Your showcase submission was not published: ${str(data, 'title', 'project')}`,
  body: (data) => ({
    heading: 'Your showcase submission needs changes',
    paragraphs: [
      'The district reviewed your project and did not publish it. You can edit the submission and send it again.',
    ],
    facts: [
      ['Project', str(data, 'title')],
      ['Reason', str(data, 'rejectionReason')],
    ],
    cta: { label: 'Open your submissions', url: link('/portal/showcase/mine') },
  }),
  push: (data) => ({
    title: 'Showcase submission not published',
    body: str(data, 'rejectionReason', 'The district asked for changes before publishing.'),
    url: '/portal/showcase/mine',
  }),
});
