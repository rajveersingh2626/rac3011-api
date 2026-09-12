import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

dir2 = r'backlogs_data\Upload 4 Action Pictures  (File responses)-20260912T170635Z-1-001\Upload 4 Action Pictures  (File responses)'

author_to_club_id = {
    'nitika khatri': 'c58',
    'sania khatter': 'c58',
    'rishabh babber': 'c40',
    'somya': 'c10',
    'happy kumar': 'c10',
    'harshita gupta': 'c65',
    'gauri sharma': 'c31',
    'rac dpsru': 'c31',
    'rashika yadav': 'c23',
    'mohd arham': 'c17',
    'ashutosh bhandari': 'c19',
    'mishti bansal': 'c75',
    'utkarsh dutta': 'c9',
    'aryan yadav': 'c6',
    'ajay chawla': 'c55',
    'srishty goyal': 'c30',
    'rishika ranjan': 'c20',
    'yashika kapoor': 'c22',
    'ananya': 'c72',
    'sonal dhingra': 'c12',
    'mansi mishra': 'c54',
    'aryan sanjeev': 'c61',
    'krishika bindal': 'c49',
    'galgotia': 'c2',
    'leysha tewatia': 'c_maharaja_agarsain',
    'anshita jain': 'c71',
    'delhi imperia': 'c21',
    'yogya goyal': 'c28',
    'janhvee sharma': 'c37',
    'nsit': 'c66',
    'srishti saxena': 'c7',
    'rotaract club': 'c68',
}

files2 = os.listdir(dir2)
unassigned2 = []
for f in files2:
    matched = False
    for k, v in author_to_club_id.items():
        if k in f.lower():
            matched = True
            break
    if not matched:
        unassigned2.append(f)

print(f"Unassigned in folder 2 ({len(unassigned2)}):")
for f in unassigned2:
    print(f"  {f}")
