import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

for item in os.listdir('backlogs_data'):
    p = os.path.join('backlogs_data', item)
    if os.path.isdir(p):
        print(f"Directory: {item}")
        for sub in os.listdir(p):
            sub_p = os.path.join(p, sub)
            if os.path.isdir(sub_p):
                files = os.listdir(sub_p)
                print(f"  Subdirectory: {sub} (Total files: {len(files)})")
                print(f"  Sample files: {files[:3]}")
