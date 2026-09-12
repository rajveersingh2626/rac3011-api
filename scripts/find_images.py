import os
import glob
import json

base_dir = 'backlogs_data'
all_images = []
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')):
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            all_images.append({
                'filename': f,
                'rel_path': rel_path,
                'full_path': full_path,
                'size': os.path.getsize(full_path)
            })

print(f"Total image files found: {len(all_images)}")
if all_images:
    for img in all_images[:10]:
        print(f" - {img['filename']} ({img['size']} bytes) at {img['rel_path']}")

with open(os.path.join(base_dir, 'images_inventory.json'), 'w', encoding='utf-8') as f:
    json.dump(all_images, f, indent=2)
