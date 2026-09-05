import { slugPath, str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

function publicPath(data: Record<string, unknown>): string {
  return slugPath(data, '/showcase', '/showcase');
}

export const showcasePublishedTemplate = defineTemplate({
  subject: (data) => `Your project is live: ${str(data, 'title', 'district showcase')}`,
  body: (data) => ({
    heading: 'Your project is published',
    paragraphs: [
      'The district has published your project on the public showcase. Anyone can now read about it.',
    ],
    facts: [['Project', str(data, 'title')]],
    cta: { label: 'See it live', url: link(publicPath(data)) },
  }),
  push: (data) => ({
    title: 'Project published',
    body: `${str(data, 'title', 'Your project')} is now live on the district showcase.`,
    url: publicPath(data),
  }),
});
