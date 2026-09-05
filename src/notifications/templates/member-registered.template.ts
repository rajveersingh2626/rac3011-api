import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const memberRegisteredTemplate = defineTemplate({
  subject: (data) => `New member registration: ${str(data, 'fullName', 'a new applicant')}`,
  body: (data) => ({
    heading: 'A new member is waiting for approval',
    paragraphs: [
      `${str(data, 'fullName', 'Someone')} has registered on the district portal and needs a club officer to approve or reject the application.`,
    ],
    facts: [
      ['Name', str(data, 'fullName')],
      ['Email', str(data, 'email')],
    ],
    cta: { label: 'Review the application', url: link('/portal/members') },
  }),
  push: (data) => ({
    title: 'New member registration',
    body: `${str(data, 'fullName', 'A new applicant')} is waiting for approval.`,
    url: '/portal/members',
  }),
});
