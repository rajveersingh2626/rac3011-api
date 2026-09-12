import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('backlogs_data/showcase_submissions.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

print(f"Total submissions: {len(subs)}")
if subs:
    row = subs[0]
    for k, v in list(row.items()):
        print(f"  {k}: {str(v)[:100]}")
