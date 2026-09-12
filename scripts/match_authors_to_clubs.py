import json
import os
import re
import sys
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

dir1 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001\Upload 4 Action Pictures  (File responses)'
dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

files1 = os.listdir(dir1)

def extract_author(fname):
    m = re.search(r' - ([^.\(\)]+)', fname)
    if m:
        return m.group(1).strip()
    return fname

author_counts = {}
for f in files1:
    a = extract_author(f)
    author_counts[a] = author_counts.get(a, 0) + 1

print("Authors and their image counts in folder 1:")
for a, c in sorted(author_counts.items(), key=lambda x: -x[1]):
    print(f"  {a}: {c} images (sample file: {[f for f in files1 if a in f][0]})")
