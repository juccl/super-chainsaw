import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawRow } from '../types';

export async function parseFile(file: File): Promise<RawRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    return parseWorkbook(file);
  }
  if (ext === 'csv') {
    return parseCsv(file);
  }
  throw new Error('仅支持 .xlsx / .xls / .csv 文件');
}

async function parseWorkbook(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
}

async function parseCsv(file: File): Promise<RawRow[]> {
  const text = await readTextWithFallback(file);
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: false,
      transformHeader: (header) => header.trim(),
      complete: (result) => resolve(result.data),
      error: reject,
    });
  });
}

async function readTextWithFallback(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount <= 3) return utf8;
  try {
    return new TextDecoder('gb18030', { fatal: false }).decode(buffer);
  } catch {
    return utf8;
  }
}
