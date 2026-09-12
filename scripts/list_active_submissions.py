import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook('backlogs_data/Club Project Submissions - July & August 2026 (Responses).xlsx', data_only=True)
sheet = wb.active

for row_idx, row in enumerate(sheet.iter_rows(min_row=2, max_row=36, values_only=True), start=2):
    timestamp = row[0]
    club = row[1]
    p1 = row[2]
    p2 = row[12] if len(row) > 12 else ''
    print(f"[{row_idx-1}] Time: {timestamp} | Club: {club}")
    print(f"     P1: {p1}")
    print(f"     P2: {p2}")
