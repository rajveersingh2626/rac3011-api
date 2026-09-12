import openpyxl
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook('backlogs_data/Club Project Submissions - July & August 2026 (Responses).xlsx', data_only=True)
sheet = wb.active

# Let's extract submitter names from image filenames
dir1 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001\Upload 4 Action Pictures  (File responses)'
dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

files1 = os.listdir(dir1)
files2 = os.listdir(dir2)

def extract_author(fname):
    # Pattern: "... - AuthorName.ext" or "... - AuthorName(1).ext"
    m = re.search(r' - ([^.\(\)]+)', fname)
    if m:
        return m.group(1).strip()
    return fname

authors1 = set(extract_author(f) for f in files1)
authors2 = set(extract_author(f) for f in files2)

print("Unique authors in Folder 1 (Project 1 photos):", len(authors1))
print("Authors 1:", sorted(list(authors1))[:20])

print("\nUnique authors in Folder 2 (Project 2 photos):", len(authors2))
print("Authors 2:", sorted(list(authors2))[:20])
