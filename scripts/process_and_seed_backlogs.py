import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta
import unicodedata
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

# Author to Club mapping
author_to_club_id = {
    'nitika khatri': 'c58',             # DAVIM
    'sania khatter': 'c58',             # DAVIM
    'rishabh babber': 'c40',            # Delhi Elite
    'somya': 'c10',                     # Delhi Southend Next
    'happy kumar': 'c10',               # Delhi Southend Next
    'harshita gupta': 'c65',            # Delhi Yuva
    'gauri sharma': 'c31',              # DPSRU
    'rac dpsru': 'c31',                 # DPSRU
    'rashika yadav': 'c23',             # Delhi Heights
    'mohd arham': 'c17',                # SGGSCC
    'ashutosh bhandari': 'c19',         # Delhi Capital Circle
    'mishti bansal': 'c75',             # World Without Childhood Blindness
    'utkarsh dutta': 'c9',              # Delhi South Central
    'aryan yadav': 'c6',                # Delhi MAIMS
    'ajay chawla': 'c55',               # Trinity Institute Dwarka
    'srishty goyal': 'c30',             # Lakshmibai College
    'rishika ranjan': 'c20',            # Delhi Dynamic Leaders
    'yashika kapoor': 'c22',            # Delhi Rajdhani
    'ananya': 'c72',                    # The North'Cap University
    'sonal dhingra': 'c12',             # Ilmaura
    'mansi mishra': 'c54',              # Sushant University
    'aryan sanjeev': 'c61',             # Delhi Genesis
    'krishika bindal': 'c1',            # CVS
    'galgotia': 'c2',                   # Galgotias
    'leysha tewatia': 'c_maharaja_agarsain', # Maharaja Agarsain
    'anshita jain': 'c71',              # SRCC
    'delhi imperia': 'c21',             # Delhi Imperia
    'rotaract club of delhi imperia': 'c21',
    'yogya goyal': 'c28',               # IGDTUW
    'janhvee sharma': 'c37',            # Unified Spirits
    'rtr. janhvee sharma': 'c37',
    'nsit': 'c66',                      # NSIT Regency
    'rotaract club of nsit': 'c66',
    'srishti saxena': 'c7',             # Delhi Midtown Maitreyi
    'rotaract club': 'c68',             # Meraki
}

dir1 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001\Upload 4 Action Pictures  (File responses)'
dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

# Target web showcase images directory
web_img_dir = r'..\rac3011-web\public\showcase_images'
os.makedirs(web_img_dir, exist_ok=True)

# Load DB clubs
with open('backlogs_data/db_clubs.json', 'r', encoding='utf-8') as f:
    db_clubs = json.load(f)

# Helper: normalize club name to find club id
def normalize_name(s):
    if not s:
        return ""
    s = s.lower()
    s = re.sub(r'rotaract club of\s*', '', s)
    s = re.sub(r'rac\s*', '', s)
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

club_map = {}
for c in db_clubs:
    club_map[normalize_name(c['name'])] = c['id']
    club_map[normalize_name(c['shortName'])] = c['id']
    club_map[normalize_name(c['slug'])] = c['id']

aliases = {
    normalize_name("Rotaract Club of DPSRU"): "c31",
    normalize_name("Rotaract Club of Galgotias Educational Institutions"): "c2",
    normalize_name("Rotaract Club of Delhi Imperia"): "c21",
    normalize_name("Rotaract Club of Delhi Imperial"): "c21",
    normalize_name("Rotaract Club of NSIT"): "c66",
    normalize_name("Rotaract Club of NSIT Regency"): "c66",
    normalize_name("Rotaract Club of The NorthCap University"): "c72",
    normalize_name("Rotaract Club of The North'Cap University"): "c72",
    normalize_name("Rotaract Club of NorthCap"): "c72",
    normalize_name("Rotaract Club of SGTB Khalsa"): "c53",
    normalize_name("Rotaract Club of SGGSCC"): "c17",
    normalize_name("Rotaract Club of SRCC"): "c71",
    normalize_name("Rotaract Club of KMC"): "c49",
    normalize_name("Rotaract Club of IGDTUW"): "c28",
    normalize_name("Rotaract Club of GD Goenka"): "c11",
    normalize_name("Rotaract Club of ASU"): "c57",
    normalize_name("Rotaract Club of MAIMS"): "c6",
    normalize_name("Rotaract Club of TIAS"): "c55",
    normalize_name("Rotaract Club of NAB"): "c32",
    normalize_name("Rotaract Club of DUSC"): "c59",
    normalize_name("Rotaract Club of CVS"): "c1",
    normalize_name("Rotaract Club of Sri Guru Gobind Singh College of Commerce"): "c17",
    normalize_name("Rotaract Club of Delhi South East"): "c5",
    normalize_name("Rotaract Club of Ingenious Minds"): "c3",
}

for k, v in aliases.items():
    club_map[k] = v

def find_club_id(club_raw):
    norm = normalize_name(club_raw)
    if norm in club_map:
        return club_map[norm]
    for k, v in club_map.items():
        if norm in k or k in norm:
            return v
    return None

def parse_date(d_val):
    if not d_val or str(d_val).strip() == '' or str(d_val).lower() == 'na':
        return datetime(2026, 8, 15).date()
    try:
        if isinstance(d_val, (int, float)) or (isinstance(d_val, str) and d_val.replace('.', '', 1).isdigit()):
            base = datetime(1899, 12, 30)
            res = base + timedelta(days=float(d_val))
            if res.year < 2026:
                res = res.replace(year=2026)
            return res.date()
    except Exception:
        pass
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%B %d, %Y', '%d %B %Y'):
        try:
            res = datetime.strptime(str(d_val).strip(), fmt)
            if res.year < 2026:
                res = res.replace(year=2026)
            return res.date()
        except ValueError:
            pass
    return datetime(2026, 8, 15).date()

def parse_beneficiaries(b_val):
    if not b_val:
        return None
    s = str(b_val).strip()
    nums = re.findall(r'\d+', s)
    if nums:
        return int(nums[-1])
    return None

def map_avenue(a_val):
    if not a_val:
        return "community_service"
    s = str(a_val).lower().strip()
    if 'community' in s:
        return 'community_service'
    if 'club' in s:
        return 'club_service'
    if 'prof' in s or 'career' in s or 'entrepreneur' in s:
        return 'professional_development'
    if 'inter' in s or 'is' in s:
        return 'international_service'
    if 'youth' in s:
        return 'youth_service'
    if 'sport' in s or 'fellowship' in s:
        return 'sports_fellowship'
    return 'community_service'

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def get_folder_photos_by_club(folder_path):
    club_photos = {}
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.jfif')):
                full_p = os.path.join(folder_path, f)
                matched_cid = None
                for k, cid in author_to_club_id.items():
                    if k in f.lower():
                        matched_cid = cid
                        break
                if matched_cid:
                    if matched_cid not in club_photos:
                        club_photos[matched_cid] = []
                    club_photos[matched_cid].append({'filename': f, 'full_path': full_p})
    return club_photos

photos1_by_club = get_folder_photos_by_club(dir1)
photos2_by_club = get_folder_photos_by_club(dir2)

# Load workbook
wb = openpyxl.load_workbook('backlogs_data/Club Project Submissions - July & August 2026 (Responses).xlsx', data_only=True)
sheet = wb.active

# Deduplicate submissions by keeping latest submission per club
latest_rows = {}
for r_idx in range(2, 37):
    row = [cell.value for cell in sheet[r_idx]]
    if not row[1]:
        continue
    c_id = find_club_id(row[1])
    if c_id:
        latest_rows[c_id] = (r_idx, row)

print(f"Unique clubs with submissions: {len(latest_rows)}")

final_projects = []
used_slugs = set()
proj_counter = 1

for c_id, (r_idx, row) in sorted(latest_rows.items(), key=lambda x: x[0]):
    club_name = row[1]
    
    # Project 1
    p1_title = str(row[2] or '').strip()
    if p1_title and p1_title.lower() not in ('na', 'n/a', 'none', '-', 'na ', 'none.'):
        p1_date = parse_date(row[3])
        p1_venue = str(row[4] or '').strip()
        p1_focus = str(row[5] or '').strip()
        p1_avenue = str(row[6] or '').strip()
        p1_beneficiaries = parse_beneficiaries(row[7])
        p1_budget = str(row[8] or '').strip()
        p1_one_liner = str(row[9] or '').strip()
        p1_summary = str(row[10] or '').strip()

        if not p1_one_liner:
            p1_one_liner = p1_summary[:200] if p1_summary else p1_title
        if not p1_summary:
            p1_summary = p1_one_liner

        extra = []
        if p1_venue and p1_venue.lower() not in ('na', 'n/a'):
            extra.append(f"**Venue / Location:** {p1_venue}")
        if p1_focus and p1_focus.lower() not in ('na', 'n/a'):
            extra.append(f"**Area of Focus:** {p1_focus}")
        if p1_budget and p1_budget.lower() not in ('na', 'n/a'):
            extra.append(f"**Project Budget:** {p1_budget}")

        p1_body = p1_summary
        if extra:
            p1_body = p1_body + "\n\n" + "\n\n".join(extra)

        base_slug = slugify(f"{p1_title}-{c_id}")
        if not base_slug:
            base_slug = f"showcase-{c_id}-{proj_counter}"
        slug = base_slug
        c_num = 1
        while slug in used_slugs:
            slug = f"{base_slug}-{c_num}"
            c_num += 1
        used_slugs.add(slug)

        # Copy photos for project 1
        matched_imgs = photos1_by_club.get(c_id, [])
        photo_urls = []
        for i_idx, m_img in enumerate(matched_imgs[:4]):
            ext = os.path.splitext(m_img['filename'])[1].lower()
            if ext == '.jfif':
                ext = '.jpg'
            new_fname = f"{slug}-{i_idx+1}{ext}"
            dest = os.path.join(web_img_dir, new_fname)
            shutil.copyfile(m_img['full_path'], dest)
            photo_urls.append(f"/showcase_images/{new_fname}")

        final_projects.append({
            "id": f"proj_backlog_{proj_counter}",
            "slug": slug,
            "title": p1_title,
            "category": map_avenue(p1_avenue),
            "date": p1_date.isoformat(),
            "summary": p1_one_liner,
            "body": p1_body,
            "beneficiaries": p1_beneficiaries,
            "photos": photo_urls,
            "status": "published",
            "consentConfirmed": True,
            "publishedTitle": p1_title,
            "publishedSummary": p1_one_liner,
            "publishedBody": p1_body,
            "publishedAt": f"{p1_date.isoformat()}T10:00:00.000Z",
            "submittedAt": f"{p1_date.isoformat()}T09:00:00.000Z",
            "clubId": c_id,
            "clubName": club_name
        })
        proj_counter += 1

    # Project 2
    if len(row) > 12:
        p2_title = str(row[12] or '').strip()
        if p2_title and p2_title.lower() not in ('na', 'n/a', 'none', '-', 'na ', 'none.'):
            p2_date = parse_date(row[13])
            p2_venue = str(row[14] or '').strip()
            p2_focus = str(row[15] or '').strip()
            p2_avenue = str(row[16] or '').strip()
            p2_beneficiaries = parse_beneficiaries(row[17])
            p2_budget = str(row[18] or '').strip()
            p2_one_liner = str(row[19] or '').strip()
            p2_summary = str(row[20] or '').strip()

            if not p2_one_liner:
                p2_one_liner = p2_summary[:200] if p2_summary else p2_title
            if not p2_summary:
                p2_summary = p2_one_liner

            extra = []
            if p2_venue and p2_venue.lower() not in ('na', 'n/a'):
                extra.append(f"**Venue / Location:** {p2_venue}")
            if p2_focus and p2_focus.lower() not in ('na', 'n/a'):
                extra.append(f"**Area of Focus:** {p2_focus}")
            if p2_budget and p2_budget.lower() not in ('na', 'n/a'):
                extra.append(f"**Project Budget:** {p2_budget}")

            p2_body = p2_summary
            if extra:
                p2_body = p2_body + "\n\n" + "\n\n".join(extra)

            base_slug = slugify(f"{p2_title}-{c_id}")
            if not base_slug:
                base_slug = f"showcase-{c_id}-{proj_counter}"
            slug = base_slug
            c_num = 1
            while slug in used_slugs:
                slug = f"{base_slug}-{c_num}"
                c_num += 1
            used_slugs.add(slug)

            matched_imgs = photos2_by_club.get(c_id, [])
            photo_urls = []
            for i_idx, m_img in enumerate(matched_imgs[:4]):
                ext = os.path.splitext(m_img['filename'])[1].lower()
                if ext == '.jfif':
                    ext = '.jpg'
                new_fname = f"{slug}-{i_idx+1}{ext}"
                dest = os.path.join(web_img_dir, new_fname)
                shutil.copyfile(m_img['full_path'], dest)
                photo_urls.append(f"/showcase_images/{new_fname}")

            final_projects.append({
                "id": f"proj_backlog_{proj_counter}",
                "slug": slug,
                "title": p2_title,
                "category": map_avenue(p2_avenue),
                "date": p2_date.isoformat(),
                "summary": p2_one_liner,
                "body": p2_body,
                "beneficiaries": p2_beneficiaries,
                "photos": photo_urls,
                "status": "published",
                "consentConfirmed": True,
                "publishedTitle": p2_title,
                "publishedSummary": p2_one_liner,
                "publishedBody": p2_body,
                "publishedAt": f"{p2_date.isoformat()}T10:00:00.000Z",
                "submittedAt": f"{p2_date.isoformat()}T09:00:00.000Z",
                "clubId": c_id,
                "clubName": club_name
            })
            proj_counter += 1

print(f"Generated {len(final_projects)} clean showcase projects!")
with open('backlogs_data/final_seeded_projects.json', 'w', encoding='utf-8') as f:
    json.dump(final_projects, f, indent=2)

# Generate SQL Seed Script
sql_lines = [
    "-- Showcase Backlogs Seeding Script",
    "BEGIN;",
]

for p in final_projects:
    p_id = p['id']
    slug = p['slug'].replace("'", "''")
    title = p['title'].replace("'", "''")
    cat = p['category']
    date_val = p['date']
    summary = p['summary'].replace("'", "''")
    body = p['body'].replace("'", "''")
    beneficiaries = p['beneficiaries'] if p['beneficiaries'] is not None else 'NULL'
    if p['photos']:
        escaped_urls = [f"'{url.replace("'", "''")}'" for url in p['photos']]
        photos_sql = "ARRAY[" + ", ".join(escaped_urls) + "]::text[]"
    else:
        photos_sql = "ARRAY[]::text[]"
    pub_at = p['publishedAt']
    sub_at = p['submittedAt']
    c_id = p['clubId']

    sql_lines.append(f"""
INSERT INTO projects (
    id, slug, title, category, date, summary, body, beneficiaries, photos,
    status, consent_confirmed, submitted_at, published_title, published_summary,
    published_body, published_at, created_at, updated_at
) VALUES (
    '{p_id}', '{slug}', '{title}', '{cat}', '{date_val}'::date, '{summary}', '{body}', {beneficiaries}, {photos_sql},
    'published'::\"ProjectStatus\", true, '{sub_at}'::timestamptz, '{title}', '{summary}',
    '{body}', '{pub_at}'::timestamptz, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    date = EXCLUDED.date,
    summary = EXCLUDED.summary,
    body = EXCLUDED.body,
    beneficiaries = EXCLUDED.beneficiaries,
    photos = EXCLUDED.photos,
    status = EXCLUDED.status,
    consent_confirmed = EXCLUDED.consent_confirmed,
    published_title = EXCLUDED.published_title,
    published_summary = EXCLUDED.published_summary,
    published_body = EXCLUDED.published_body,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

INSERT INTO project_clubs (project_id, club_id, role, created_at, updated_at)
VALUES ('{p_id}', '{c_id}', 'lead'::\"ProjectClubRole\", NOW(), NOW())
ON CONFLICT (project_id, club_id) DO NOTHING;

INSERT INTO audit_log (id, actor_id, action, resource_type, resource_id, after, at, created_at, updated_at)
VALUES (
    'audit_{p_id}',
    NULL,
    'showcase.published',
    'project',
    '{p_id}',
    '{{"source": "backlog_import", "clubId": "{c_id}", "title": "{title}"}}'::jsonb,
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
""")

sql_lines.append("COMMIT;")

with open('backlogs_data/seed_showcase_backlogs.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print("Saved backlogs_data/seed_showcase_backlogs.sql successfully!")
