import json

with open('backlogs_data/images_inventory.json', 'r', encoding='utf-8') as f:
    images = json.load(f)

print(f"Total images: {len(images)}")
if images:
    print("Sample 5 images:")
    for img in images[:5]:
        print(img)
