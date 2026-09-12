import json

with open('backlogs_data/final_showcase_projects.json', 'r', encoding='utf-8') as f:
    projects = json.load(f)

has_photos = [p for p in projects if len(p['photos']) > 0]
no_photos = [p for p in projects if len(p['photos']) == 0]

print(f"Total projects: {len(projects)}")
print(f"Projects with photos: {len(has_photos)}")
print(f"Projects without photos: {len(no_photos)}")

if no_photos:
    print("\nSample projects without photos:")
    for p in no_photos[:10]:
        print(f"  [{p['clubRaw']}] - {p['title']}")
