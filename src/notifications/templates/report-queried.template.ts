import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const reportQueriedTemplate = defineTemplate({
  subject: () => 'A question was raised on your monthly report',
  body: (data) => ({
    heading: 'The district has a question on your report',
    paragraphs: [
      'A reviewer has raised a query on a report your club submitted. Your report cannot be scored until it is answered.',
    ],
    facts: [['Question', str(data, 'question')]],
    cta: { label: 'Answer the query', url: link(`/portal/reports/${str(data, 'reportId')}`) },
  }),
  push: (data) => ({
    title: 'Query on your report',
    body: str(data, 'question', 'A reviewer has raised a query on your report.'),
    url: `/portal/reports/${str(data, 'reportId')}`,
  }),
});
