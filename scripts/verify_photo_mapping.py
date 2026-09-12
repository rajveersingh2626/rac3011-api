import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta
import unicodedata
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

# Author to Club mapping
author_to_club_id = {
    'nitika khatri': 'c58',             # DAVIM
    'sania khatter': 'c58',             # DAVIM
    'rishabh babber': 'c40',            # Delhi Elite
    'somya': 'c10',                     # Delhi Southend Next
    'harshita gupta': 'c65',            # Delhi Yuva
    'gauri sharma': 'c31',              # DPSRU
    'rac dpsru': 'c31',                 # DPSRU
    'rashika yadav': 'c23',             # Delhi Heights
    'mohd arham': 'c17',                # SGGSCC
    'ashutosh bhandari': 'c19',         # Delhi Capital Circle
    'mishti bansal': 'c75',             # World Without Childhood Blindness
    'utkarsh dutta': 'c9',              # Delhi South Central
    'aryan yadav': 'c6',                # Delhi MAIMS
    'ajay chawla': 'c55',               # Trinity Institute Dwarka
    'srishty goyal': 'c30',             # Lakshmibai College
    'rishika ranjan': 'c20',            # Delhi Dynamic Leaders
    'yashika kapoor': 'c22',            # Delhi Rajdhani
    'ananya': 'c72',                    # The North'Cap University
    'sonal dhingra': 'c12',             # Ilmaura
    'mansi mishra': 'c54',              # Sushant University
    'aryan sanjeev': 'c61',             # Delhi Genesis
    'krishika bindal': 'c49',           # CVS / Kirori Mal
    'galgotia': 'c2',                   # Galgotias
    'leysha tewatia': 'c_maharaja_agarsain', # Maharaja Agarsain
    'anshita jain': 'c71',              # SRCC
    'delhi imperia': 'c21',             # Delhi Imperia
    'rotaract club of delhi imperia': 'c21',
    'yogya goyal': 'c28',               # IGDTUW
    'janhvee sharma': 'c37',            # Unified Spirits
    'rtr. janhvee sharma': 'c37',
    'nsit': 'c66',                      # NSIT Regency
    'rotaract club of nsit': 'c66',
}

dir1 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170630Z-1-001\Upload 4 Action Pictures  (File responses)'
dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

def get_files_with_club(folder_path):
    res = []
    if os.path.exists(folder_path):
        for f in os.listdir(folder_path):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.jfif')):
                m = re.search(r' - ([^.\(\)]+)', f)
                author = m.group(1).strip().lower() if m else ""
                matched_club_id = None
                for k, v in author_to_club_id.items():
                    if k in author or k in f.lower():
                        matched_club_id = v
                        break
                res.append({
                    'filename': f,
                    'full_path': os.path.join(folder_path, f),
                    'author': author,
                    'clubId': matched_club_id
                })
    return res

photos_p1 = get_files_with_club(dir1)
photos_p2 = get_files_with_club(dir2)

print(f"Folder 1: {len(photos_p1)} photos, Matched to clubs: {len([p for p in photos_p1 if p['clubId']])}")
print(f"Folder 2: {len(photos_p2)} photos, Matched to clubs: {len([p for p in photos_p2 if p['clubId']])}")

# Let's inspect unassigned photos if any
unassigned1 = [p for p in photos_p1 if not p['clubId']]
if unassigned1:
    print("Unassigned in folder 1:")
    for p in unassigned1:
        print(f"  {p['filename']} (author: {p['author']})")
