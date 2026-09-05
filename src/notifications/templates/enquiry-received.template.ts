import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const enquiryReceivedTemplate = defineTemplate({
  subject: (data) =>
    `New ${str(data, 'kind', 'website')} enquiry from ${str(data, 'name', 'a visitor')}`,
  body: (data) => ({
    heading: 'A new enquiry has been routed to you',
    paragraphs: [str(data, 'message')].filter((p) => p !== ''),
    facts: [
      ['Type', str(data, 'kind')],
      ['Name', str(data, 'name')],
      ['Email', str(data, 'email')],
    ],
    cta: { label: 'Open enquiries', url: link('/portal/admin/public-content/enquiries') },
  }),
  push: (data) => ({
    title: 'New enquiry',
    body: `${str(data, 'name', 'A visitor')}: ${str(data, 'message', 'sent an enquiry.')}`,
    url: '/portal/admin/public-content/enquiries',
  }),
});
