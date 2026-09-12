import json

with open('backlogs_data/extracted_projects.json', 'r', encoding='utf-8') as f:
    projects = json.load(f)

print(f"Total extracted projects: {len(projects)}")
if projects:
    print("Sample project:")
    print(json.dumps(projects[0], indent=2))
