import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const linkBrokenTemplate = defineTemplate({
  subject: () => 'A link on the district site has stopped working',
  body: (data) => ({
    heading: 'Broken link detected',
    paragraphs: [
      'The automatic link check could not reach a URL you own. Visitors following it are hitting an error.',
    ],
    facts: [
      ['URL', str(data, 'url')],
      ['Status', str(data, 'status')],
    ],
    cta: { label: 'Fix it in the portal', url: link('/portal/admin/public-content') },
  }),
  push: (data) => ({
    title: 'Broken link detected',
    body: str(data, 'url', 'A link on the district site is unreachable.'),
    url: '/portal/admin/public-content',
  }),
});
