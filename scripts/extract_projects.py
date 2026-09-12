import json
import os

with open(os.path.join('backlogs_data', 'showcase_submissions.json'), 'r', encoding='utf-8') as f:
    submissions = json.load(f)

print(f"Total submission forms: {len(submissions)}")

all_projects = []
for idx, s in enumerate(submissions):
    club_raw = s.get('Rotaract Club', '').strip()
    # Submission Form can contain Project 1 and Project 2
    # Project 1
    p1_name = s.get('Project / Event Name ', '').strip()
    if p1_name:
        all_projects.append({
            'form_index': idx + 1,
            'project_number': 1,
            'club_raw': club_raw,
            'name': p1_name,
            'date': s.get('Date of the Project / Event ', '').strip(),
            'venue': s.get('Venue / Location ', '').strip(),
            'focus': s.get("Rotary's Area of Focus ", '').strip(),
            'avenue': s.get('Avenue of Service ', '').strip(),
            'beneficiaries': s.get('Total Number of Beneficiaries ', '').strip(),
            'budget': s.get('Total Project Budget ', '').strip(),
            'one_liner': s.get('Project in One Line  ', '').strip(),
            'summary': s.get('Project Summary ', '').strip(),
            'pictures_raw': s.get('Upload 4 Action Pictures ', '').strip(),
        })
    
    # Project 2
    p2_name = s.get('Project / Event Name  2', '').strip()
    if p2_name:
        all_projects.append({
            'form_index': idx + 1,
            'project_number': 2,
            'club_raw': club_raw,
            'name': p2_name,
            'date': s.get('Date of the Project / Event  2', '').strip(),
            'venue': s.get('Venue / Location  2', '').strip(),
            'focus': s.get("Rotary's Area of Focus  2", '').strip(),
            'avenue': s.get('Avenue of Service  2', '').strip(),
            'beneficiaries': s.get('Total Number of Beneficiaries  2', '').strip(),
            'budget': s.get('Total Project Budget  2', '').strip(),
            'one_liner': s.get('Project in One Line', '').strip(),
            'summary': s.get('Project Summary  2', '').strip(),
            'pictures_raw': s.get('Upload 4 Action Pictures  2', '').strip(),
        })

print(f"Total distinct project entries extracted: {len(all_projects)}")

with open(os.path.join('backlogs_data', 'extracted_projects.json'), 'w', encoding='utf-8') as f:
    json.dump(all_projects, f, indent=2, ensure_ascii=False)

# Inspect picture folders
pic_dir1 = os.path.join('backlogs_data', 'Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001')
pic_dir2 = os.path.join('backlogs_data', 'Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001')

pics1 = os.listdir(pic_dir1) if os.path.exists(pic_dir1) else []
pics2 = os.listdir(pic_dir2) if os.path.exists(pic_dir2) else []

print(f"Photos in folder 1: {len(pics1)}")
print(f"Photos in folder 2: {len(pics2)}")
if pics1:
    print(f"Sample pics in folder 1: {pics1[:5]}")
if pics2:
    print(f"Sample pics in folder 2: {pics2[:5]}")
