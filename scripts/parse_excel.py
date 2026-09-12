import os
import json
import zipfile
import xml.etree.ElementTree as ET

def parse_xlsx(file_path):
    with zipfile.ZipFile(file_path, 'r') as z:
        # 1. Read shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            # xmlns usually http://schemas.openxmlformats.org/spreadsheetml/2006/main
            for si in tree.findall('{*}si'):
                texts = [t.text for t in si.findall('{*}t') if t.text]
                # Also handle formatted runs <r><t>text</t></r>
                for r in si.findall('{*}r'):
                    for t in r.findall('{*}t'):
                        if t.text:
                            texts.append(t.text)
                shared_strings.append(''.join(texts))
        
        # 2. Read sheet1
        rows = []
        if 'xl/worksheets/sheet1.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            sheet_data = tree.find('{*}sheetData')
            if sheet_data is not None:
                for row_el in sheet_data.findall('{*}row'):
                    row_cells = {}
                    for c_el in row_el.findall('{*}c'):
                        ref = c_el.get('r', '')
                        col = ''.join([ch for ch in ref if ch.isalpha()])
                        t_type = c_el.get('t', '')
                        v_el = c_el.find('{*}v')
                        val = ''
                        if v_el is not None and v_el.text:
                            raw_val = v_el.text
                            if t_type == 's':
                                idx = int(raw_val)
                                val = shared_strings[idx] if idx < len(shared_strings) else ''
                            else:
                                val = raw_val
                        # Check inline strings <is><t>
                        is_el = c_el.find('{*}is')
                        if is_el is not None:
                            t_inline = is_el.find('{*}t')
                            if t_inline is not None and t_inline.text:
                                val = t_inline.text
                        
                        row_cells[col] = val
                    if row_cells:
                        rows.append(row_cells)

    if not rows:
        return []

    header_row = rows[0]
    col_order = sorted(header_row.keys(), key=lambda c: (len(c), c))
    headers = {col: header_row[col] for col in col_order}

    results = []
    for r in rows[1:]:
        item = {}
        for col in col_order:
            h = headers[col]
            item[h] = r.get(col, '')
        results.append(item)

    return results

if __name__ == '__main__':
    base_dir = os.path.join(os.getcwd(), 'backlogs_data')
    excel_file = os.path.join(base_dir, 'Club Project Submissions - July & August 2026 (Responses).xlsx')
    
    data = parse_xlsx(excel_file)
    print(f"Total parsed rows: {len(data)}")
    
    out_json = os.path.join(base_dir, 'showcase_submissions.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully saved {len(data)} rows to {out_json}")
    if data:
        print("\nHeaders:")
        for k in data[0].keys():
            print(f" - {k}")
        print("\nSample Row 1:")
        print(json.dumps(data[0], indent=2, ensure_ascii=False))
