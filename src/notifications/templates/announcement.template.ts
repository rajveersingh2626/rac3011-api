import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const announcementTemplate = defineTemplate({
  subject: (data) => str(data, 'title', 'Announcement from Rotaract District 3011'),
  body: (data) => ({
    heading: str(data, 'title', 'Announcement'),
    paragraphs: [str(data, 'body')].filter((p) => p !== ''),
    facts: [['From', str(data, 'senderName')]],
    cta: { label: 'Open the portal', url: link('/portal/announcements') },
  }),
  push: (data) => ({
    title: str(data, 'title', 'District announcement'),
    body: str(data, 'body', 'A new announcement is waiting in the portal.'),
    url: '/portal/announcements',
  }),
});
