export type ContentSeed = { pageKey: string; sectionKey: string; type: 'text' | 'richtext' | 'image' | 'link' | 'list'; value: unknown };

const text = (pageKey: string, sectionKey: string, value: string): ContentSeed => ({ pageKey, sectionKey, type: 'text', value });
const rich = (pageKey: string, sectionKey: string, value: string): ContentSeed => ({ pageKey, sectionKey, type: 'richtext', value });

export const CONTENT_BLOCKS: ContentSeed[] = [
  text('home', 'hero_badge', 'Rotaract District 3011'),
  text('home', 'hero_title', 'Service above self, across Delhi NCR'),
  text('home', 'hero_subtitle', 'Young leaders in clubs across four zones, working on community, vocational and international service.'),
  text('home', 'cta_primary', 'Explore our clubs'),
  text('home', 'cta_secondary', 'See the showcase'),
  text('home', 'footer_tagline', 'Rotaract District 3011 · Rotary International District 3011'),
  {
    pageKey: 'home',
    sectionKey: 'flagship',
    type: 'list',
    value: [
      { title: 'Mahadan 9.0', summary: 'The district-wide blood donation drive, now in its ninth edition.' },
      { title: 'Clean Yamuna & Green NCR', summary: 'River clean-ups and plantation drives across the NCR.' },
      { title: 'Digital Literacy Labs', summary: 'Computer literacy labs for under-served schools.' },
      { title: 'Pediatric Health Screening', summary: 'Health camps screening children in partnership with hospitals.' },
      { title: 'Youth Leadership Assembly', summary: 'The annual leadership assembly for Rotaractors of the district.' },
    ],
  },
  rich('privacy-policy', 'body', '<p>Placeholder privacy policy. Replace before launch.</p>'),
  rich('terms-of-service', 'body', '<p>Placeholder terms of service. Replace before launch.</p>'),
  rich('get-involved', 'new_club_intro', '<p>Interested in chartering a Rotaract club? Tell us about your group.</p>'),
  rich('get-involved', 'sponsor_intro', '<p>Partner with the district to fund projects that reach thousands.</p>'),
  rich('contact', 'intro', '<p>Reach the district secretariat.</p>'),
  text('contact', 'address', 'Rotaract District 3011, New Delhi'),
  rich('about', 'heritage_intro', '<p>Past District Rotaract Representatives who shaped the district.</p>'),
  rich('about', 'leadership_intro', '<p>The district team for the current Rotary year.</p>'),
];
