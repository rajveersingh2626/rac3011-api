import { optionalSuffix, str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

function scoreSuffix(data: Record<string, unknown>): string {
  return optionalSuffix(data, 'score', (v) => `: ${v} points`);
}

export const reportScoredTemplate = defineTemplate({
  subject: (data) => `Your monthly report has been scored${scoreSuffix(data)}`,
  body: (data) => ({
    heading: 'Your monthly report has been scored',
    paragraphs: ['The district has finished reviewing your club report and awarded points.'],
    facts: [
      ['Month', str(data, 'month')],
      ['Points', str(data, 'score')],
    ],
    cta: { label: 'See the scoring', url: link(`/portal/reports/${str(data, 'reportId')}`) },
  }),
  push: (data) => ({
    title: 'Report scored',
    body: `Your monthly report has been scored${scoreSuffix(data)}.`,
    url: `/portal/reports/${str(data, 'reportId')}`,
  }),
});
