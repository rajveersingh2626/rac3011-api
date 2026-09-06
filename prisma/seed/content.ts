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
    // The four RY 2026-27 district projects from the client's project ownership bidding document.
    // No targets or counts: these are still being bid out to clubs, so any figure would read as
    // something already achieved.
    value: [
      { title: 'Mission 3011', summary: 'Clubs across the district run their own blood donation camps, counted together as one district campaign.' },
      { title: 'Project Drishti', summary: 'Facilitating cataract surgeries for people who need them, through hospital and NGO partners.' },
      { title: 'Rotaract Cricket League', summary: 'A district-wide cricket tournament for Rotaract clubs.' },
      { title: 'Career Bridge', summary: 'A platform where Rotarians post jobs, internships, mentorship and volunteering opportunities for Rotaractors.' },
    ],
  },
  {
    pageKey: 'home',
    sectionKey: 'impact-stats',
    type: 'list',
    // Only figures that can be checked against the roster. The legacy import published lives
    // impacted, funds mobilised, project counts and blood units; nothing in the schema tracks any
    // of them. `suffix` is stored but not rendered by the site.
    value: [
      { label: 'Active Clubs', value: '75', suffix: 'Clubs', note: 'RY 2026-27 Roster', color: '#D81B60' },
      { label: 'Zones', value: '4', suffix: 'Zones', note: 'Prithvi, Agni, Vayu, Akash', color: '#123499' },
      { label: 'Clubs Chartered', value: '5', suffix: 'New Charters', note: 'New charters this year', color: '#880E4F' },
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

// Titles from the invented flagship list an earlier seed published. Same marker role as the labels
// below: they identify a block that still holds the fiction.
export const RETIRED_FLAGSHIP_TITLES = [
  'Mahadan 9.0',
  'Clean Yamuna & Green NCR',
  'Digital Literacy Labs',
  'Pediatric Health Screening',
  'Youth Leadership Assembly',
];

// Labels from the legacy import's impact-stats tiles. Their presence marks a block that still
// carries the unverifiable numbers, which the seed republishes; once gone the repair never re-fires.
export const RETIRED_IMPACT_STAT_LABELS = [
  'Lives Impacted',
  'Funds Mobilized',
  'High-Impact Projects',
  'Blood Units Donated',
];
