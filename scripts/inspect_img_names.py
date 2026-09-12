import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('backlogs_data/images_inventory.json', 'r', encoding='utf-8') as f:
    images = json.load(f)

print(f"Total images: {len(images)}")
unique_names = set(img['filename'] for img in images)
print(f"Unique image filenames: {len(unique_names)}")
for i, name in enumerate(sorted(list(unique_names))[:30]):
    print(f"{i+1}: {name}")
