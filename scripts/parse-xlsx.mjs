import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function unzipSync(buffer) {
  const files = {};
  let offset = 0;

  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;

    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);

    const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    let uncompressedData;
    if (compression === 0) {
      uncompressedData = compressedData;
    } else if (compression === 8) {
      uncompressedData = zlib.inflateRawSync(compressedData);
    }

    if (uncompressedData) {
      files[fileName] = uncompressedData.toString('utf8');
    }

    offset = dataStart + compressedSize;
  }

  return files;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRegex = /<si>(.*?)<\/si>/gs;
  let match;
  while ((match = siRegex.exec(xml)) !== null) {
    const tMatches = match[1].match(/<t(?:\s[^>]*)?>(.*?)<\/t>/gs) || [];
    const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
    strings.push(text);
  }
  return strings;
}

function parseSheet(xml, sharedStrings) {
  if (!xml) return [];
  const rows = [];
  const rowRegex = /<row[^>]*>(.*?)<\/row>/gs;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const cells = {};
    const cRegex = /<c\s+r="([A-Z]+)(\d+)"(?:\s+t="([a-z]+)")?[^>]*>(?:<v>(.*?)<\/v>)?<\/c>/gs;
    let cMatch;

    while ((cMatch = cRegex.exec(rowMatch[1])) !== null) {
      const col = cMatch[1];
      const type = cMatch[3];
      const val = cMatch[4];

      if (val !== undefined) {
        if (type === 's') {
          cells[col] = sharedStrings[parseInt(val, 10)] ?? '';
        } else {
          cells[col] = val;
        }
      }
    }

    if (Object.keys(cells).length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return [];
  const headerRow = rows[0];
  const colKeys = Object.keys(headerRow);
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowObj = {};
    for (const col of colKeys) {
      const header = headerRow[col] || col;
      rowObj[header] = r[col] || '';
    }
    result.push(rowObj);
  }

  return result;
}

const excelPath = path.join(process.cwd(), 'backlogs_data', 'Club Project Submissions - July & August 2026 (Responses).xlsx');
const buffer = fs.readFileSync(excelPath);
const files = unzipSync(buffer);

console.log('Unzipped files:', Object.keys(files));
const sharedStrings = parseSharedStrings(files['xl/sharedStrings.xml']);
console.log(`Shared strings count: ${sharedStrings.length}`);

const sheet1 = parseSheet(files['xl/worksheets/sheet1.xml'], sharedStrings);
console.log(`Parsed Sheet1 rows: ${sheet1.length}`);
if (sheet1.length > 0) {
  console.log('Headers:', Object.keys(sheet1[0]));
  console.log('First Row:', JSON.stringify(sheet1[0], null, 2));
  console.log('Second Row:', JSON.stringify(sheet1[1], null, 2));
}

// Write parsed rows as JSON for easy database migration and inspection
fs.writeFileSync(path.join(process.cwd(), 'backlogs_data', 'parsed_submissions.json'), JSON.stringify(sheet1, null, 2));
console.log('Saved parsed_submissions.json successfully!');
