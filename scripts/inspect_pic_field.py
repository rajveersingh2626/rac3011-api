import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(os.path.join('backlogs_data', 'extracted_projects.json'), 'r', encoding='utf-8') as f:
    projects = json.load(f)

with open(os.path.join('backlogs_data', 'images_inventory.json'), 'r', encoding='utf-8') as f:
    images = json.load(f)

print(f"Loaded {len(projects)} projects and {len(images)} images.")

# Sample project pictures_raw
for p in projects[:10]:
    print(f"Project: {p['name']} | Club: {p['club_raw']}")
    print(f"  Pictures Raw: {p['pictures_raw']}")
    print("-" * 50)
