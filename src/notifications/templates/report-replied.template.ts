import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const reportRepliedTemplate = defineTemplate({
  subject: () => 'Your report query has a reply',
  body: (data) => ({
    heading: 'The club has replied to your query',
    paragraphs: ['The query you raised on a monthly report has been answered.'],
    facts: [['Reply', str(data, 'reply')]],
    cta: { label: 'Open the report', url: link(`/portal/reports/${str(data, 'reportId')}`) },
  }),
  push: (data) => ({
    title: 'Reply on a report query',
    body: str(data, 'reply', 'Your query has been answered.'),
    url: `/portal/reports/${str(data, 'reportId')}`,
  }),
});
