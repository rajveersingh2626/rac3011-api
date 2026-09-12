import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta
import unicodedata

sys.stdout.reconfigure(encoding='utf-8')

# Load DB clubs
with open('backlogs_data/db_clubs.json', 'r', encoding='utf-8') as f:
    db_clubs = json.load(f)

# Load extracted projects
with open('backlogs_data/extracted_projects.json', 'r', encoding='utf-8') as f:
    extracted_projects = json.load(f)

# Load images inventory
with open('backlogs_data/images_inventory.json', 'r', encoding='utf-8') as f:
    images_inventory = json.load(f)

# Target web showcase images directory
web_img_dir = r'..\rac3011-web\public\showcase_images'
os.makedirs(web_img_dir, exist_ok=True)

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

# Manual aliases if any
aliases = {
    normalize_name("Rotaract Club of DPSRU"): "c31",
    normalize_name("Rotaract Club of Galgotias Educational Institutions"): "c2",
    normalize_name("Rotaract Club of Delhi Imperia"): "c21",
    normalize_name("Rotaract Club of Delhi Imperial"): "c21",
    normalize_name("Rotaract Club of NSIT"): "c66",
    normalize_name("Rotaract Club of NSIT Regency"): "c66",
    normalize_name("Rotaract Club of The NorthCap University"): "c72",
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
}

for k, v in aliases.items():
    club_map[k] = v

def find_club_id(club_raw):
    norm = normalize_name(club_raw)
    if norm in club_map:
        return club_map[norm]
    # Partial match
    for k, v in club_map.items():
        if norm in k or k in norm:
            return v
    return None

# Helper: parse date
def parse_date(d_val):
    if not d_val or str(d_val).strip() == '' or str(d_val).lower() == 'na':
        return datetime(2026, 8, 15).date()
    try:
        if isinstance(d_val, (int, float)) or (isinstance(d_val, str) and d_val.replace('.', '', 1).isdigit()):
            # Excel serial date
            base = datetime(1899, 12, 30)
            res = base + timedelta(days=float(d_val))
            # If year is 2024 or earlier, make it 2026 for July/August RY 2026-27
            if res.year < 2026:
                res = res.replace(year=2026)
            return res.date()
    except Exception:
        pass
    
    # Try parsing string dates
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%B %d, %Y', '%d %B %Y'):
        try:
            res = datetime.strptime(str(d_val).strip(), fmt)
            if res.year < 2026:
                res = res.replace(year=2026)
            return res.date()
        except ValueError:
            pass
    return datetime(2026, 8, 15).date()

# Helper: parse beneficiaries
def parse_beneficiaries(b_val):
    if not b_val:
        return None
    s = str(b_val).strip()
    nums = re.findall(r'\d+', s)
    if nums:
        # Take the maximum or last number in range (e.g. 50-60 -> 60)
        return int(nums[-1])
    return None

# Helper: map avenue
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

# Helper: slugify
def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

# Map author/submitter in image filenames to form responses
# Let's map images in folder 1 to project 1, and folder 2 to project 2
dir1 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001\Upload 4 Action Pictures  (File responses)'
dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

print("Matching and processing projects...")

unmapped_clubs = set()
processed_projects = []
used_slugs = set()

# Index image files by author / submitter snippet
def get_images_by_folder(folder_path):
    imgs = []
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                full_p = os.path.join(folder_path, f)
                # extract author
                m = re.search(r' - ([^.\(\)]+)', f)
                author = m.group(1).strip() if m else ""
                imgs.append({'filename': f, 'full_path': full_p, 'author': author})
    return imgs

imgs1 = get_images_by_folder(dir1)
imgs2 = get_images_by_folder(dir2)

print(f"Loaded {len(imgs1)} images from Folder 1 and {len(imgs2)} images from Folder 2.")

for idx, p in enumerate(extracted_projects):
    club_id = find_club_id(p['club_raw'])
    if not club_id:
        unmapped_clubs.add(p['club_raw'])
        continue

    title = str(p['name']).strip()
    if not title or title.lower() in ('na', 'n/a', 'none', '-'):
        continue

    # Date
    p_date = parse_date(p['date'])
    
    # Category
    category = map_avenue(p['avenue'])
    
    # Beneficiaries
    beneficiaries = parse_beneficiaries(p['beneficiaries'])
    
    # Summary & Body
    summary = str(p.get('one_liner') or '').strip()
    full_body = str(p.get('summary') or '').strip()
    if not summary:
        summary = full_body[:200] if full_body else title
    if not full_body:
        full_body = summary

    # Venue & Focus & Budget append to body
    extra_details = []
    if p.get('venue') and str(p['venue']).strip().lower() not in ('na', 'n/a', ''):
        extra_details.append(f"**Venue / Location:** {str(p['venue']).strip()}")
    if p.get('focus') and str(p['focus']).strip().lower() not in ('na', 'n/a', ''):
        extra_details.append(f"**Area of Focus:** {str(p['focus']).strip()}")
    if p.get('budget') and str(p['budget']).strip().lower() not in ('na', 'n/a', ''):
        extra_details.append(f"**Project Budget:** {str(p['budget']).strip()}")

    if extra_details:
        full_body = full_body + "\n\n" + "\n\n".join(extra_details)

    # Slug
    base_slug = slugify(f"{title}-{club_id}")
    if not base_slug:
        base_slug = f"project-{club_id}-{idx+1}"
    slug = base_slug
    counter = 1
    while slug in used_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    used_slugs.add(slug)

    # Match photos from folder 1 or folder 2
    # Check project number
    proj_num = p.get('project_number', 1)
    cand_imgs = imgs1 if proj_num == 1 else imgs2
    
    # Match candidate images to this club by club name tokens or submitter
    matched_photos = []
    club_tokens = set(re.findall(r'\w+', p['club_raw'].lower()))
    club_tokens.discard('rotaract')
    club_tokens.discard('club')
    club_tokens.discard('of')

    for img in cand_imgs:
        author_norm = img['author'].lower()
        if any(tok in author_norm for tok in club_tokens if len(tok) > 2):
            matched_photos.append(img)

    # If no photos matched by club tokens, look at all cand_imgs or fallback
    photo_urls = []
    for p_idx, m_img in enumerate(matched_photos[:4]):
        ext = os.path.splitext(m_img['filename'])[1].lower()
        new_filename = f"{slug}-{p_idx+1}{ext}"
        dest_path = os.path.join(web_img_dir, new_filename)
        shutil.copyfile(m_img['full_path'], dest_path)
        photo_urls.append(f"/showcase_images/{new_filename}")

    processed_projects.append({
        "id": f"proj_backlog_{idx+1}",
        "slug": slug,
        "title": title,
        "category": category,
        "date": p_date.isoformat(),
        "summary": summary,
        "body": full_body,
        "beneficiaries": beneficiaries,
        "photos": photo_urls,
        "status": "published",
        "consentConfirmed": True,
        "publishedTitle": title,
        "publishedSummary": summary,
        "publishedBody": full_body,
        "publishedAt": f"{p_date.isoformat()}T10:00:00.000Z",
        "submittedAt": f"{p_date.isoformat()}T09:00:00.000Z",
        "clubId": club_id,
        "clubRaw": p['club_raw']
    })

print(f"\nSuccessfully processed {len(processed_projects)} showcase projects!")
if unmapped_clubs:
    print(f"Unmapped clubs ({len(unmapped_clubs)}): {unmapped_clubs}")

# Save processed projects
with open('backlogs_data/final_showcase_projects.json', 'w', encoding='utf-8') as f:
    json.dump(processed_projects, f, indent=2)

print("Saved backlogs_data/final_showcase_projects.json")
