import { str } from './data';
import { defineTemplate } from './layout';
import { link } from './links';

export const announcementTemplate = defineTemplate({
  subject: (data) => str(data, 'title', 'Announcement from Rotaract District 3011'),
  body: (data) => {
    const rawBody = str(data, 'body');
    const paragraphs = rawBody
      ? rawBody.split(/\r?\n\r?\n+/).map((p) => p.trim()).filter(Boolean)
      : [];
    return {
      heading: str(data, 'title', 'Announcement'),
      paragraphs: paragraphs.length ? paragraphs : [rawBody].filter((p) => p !== ''),
      facts: [['From', str(data, 'senderName')]],
      cta: { label: 'Open in District Portal', url: link('/portal/announcements') },
    };
  },
  push: (data) => ({
    title: str(data, 'title', 'District announcement'),
    body: str(data, 'body', 'A new announcement is waiting in the portal.'),
    url: '/portal/announcements',
  }),
});
