import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const showcaseSubmittedTemplate = defineTemplate({
  subject: (data) => `Project submitted for showcase: ${str(data, 'title', 'untitled')}`,
  body: (data) => ({
    heading: 'A project is waiting for review',
    paragraphs: ['A club has submitted a project for the district showcase.'],
    facts: [['Project', str(data, 'title')]],
    cta: { label: 'Review the submission', url: link('/portal/admin/showcase') },
  }),
  push: (data) => ({
    title: 'Project submitted for showcase',
    body: str(data, 'title', 'A project is waiting for review.'),
    url: '/portal/admin/showcase',
  }),
});
