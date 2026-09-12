import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook('backlogs_data/Club Project Submissions - July & August 2026 (Responses).xlsx', data_only=True)
sheet = wb.active

headers = [cell.value for cell in sheet[1]]
print("Headers in sheet:")
for i, h in enumerate(headers):
    print(f"{i}: {h}")

print("\nFirst 3 rows of column 0, 1, 2:")
for row in sheet.iter_rows(min_row=2, max_row=4, values_only=True):
    print(row[:5])
