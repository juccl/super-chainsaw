import { FieldMapping, RawRow, StandardRow, UploadRecord } from '../types';
import { buildFieldMapping, getHeaders } from './fieldMapping';

const DAY_KEYS = [1, 2, 3, 4, 5, 6] as const;

export function normalizeUpload(fileName: string, rows: RawRow[], overrides: FieldMapping = {}): {
  upload: UploadRecord;
  standardRows: StandardRow[];
} {
  const headers = getHeaders(rows);
  const fileType = getFileType(fileName);
  const mapping = buildFieldMapping(headers, overrides);
  const filterLogs: Record<string, number> = {};
  const cleaned: StandardRow[] = [];

  rows.forEach((row, index) => {
    const reason = getFilterReason(row, mapping);
    if (reason) {
      filterLogs[reason] = (filterLogs[reason] || 0) + 1;
      return;
    }

    cleaned.push({
      id: `${fileName}-${index}`,
      sourceFile: fileName,
      fileType,
      channel: asText(read(row, mapping.channel)),
      channelId: asText(read(row, mapping.channelId)),
      productType: asText(read(row, mapping.productType)),
      channelOwner: asText(read(row, mapping.channelOwner)),
      studio: asText(read(row, mapping.studio)),
      campaign: asText(read(row, mapping.campaign)),
      startDate: normalizeDate(read(row, mapping.startDate)),
      leads: toNumber(read(row, mapping.leads)),
      cost: toNumber(read(row, mapping.cost)),
      currentGmv: toOptionalNumber(read(row, mapping.currentGmv)),
      day7Gmv: toNumber(read(row, mapping.day7Gmv)),
      totalGmv: toOptionalNumber(read(row, mapping.totalGmv)),
      attendance: Object.fromEntries(
        DAY_KEYS.map((day) => [day, toOptionalNumber(read(row, mapping[`d${day}Attendance` as keyof FieldMapping]))]),
      ) as StandardRow['attendance'],
      completion: Object.fromEntries(
        DAY_KEYS.map((day) => [day, toOptionalNumber(read(row, mapping[`d${day}Completion` as keyof FieldMapping]))]),
      ) as StandardRow['completion'],
      raw: row,
    });
  });

  const missingRequired = (['campaign', 'channelId', 'leads', 'cost', 'day7Gmv'] as const).filter((field) => !mapping[field]);
  const upload: UploadRecord = {
    id: `${fileName}-${Date.now()}`,
    fileName,
    fileType,
    rawRows: rows.length,
    cleanedRows: cleaned.length,
    filteredRows: rows.length - cleaned.length,
    headers,
    rawRowsData: rows,
    mapping,
    filterLogs,
    missingRequired,
    uploadedAt: new Date().toISOString(),
  };

  return { upload, standardRows: cleaned };
}

function getFilterReason(row: RawRow, mapping: FieldMapping): string | null {
  const values = Object.values(row).map((value) => asText(value)).filter(Boolean);
  if (!values.length) return '空行';
  const joined = values.join(' ');
  if (/汇总|总计|合计/.test(joined)) return '汇总/总计/合计';
  if (!asText(read(row, mapping.campaign))) return '不含营期';
  if (!asText(read(row, mapping.channelId))) return '不含渠道ID';
  if (!hasAnyCoreMetric(row, mapping)) return '缺少核心经营字段';
  return null;
}

function hasAnyCoreMetric(row: RawRow, mapping: FieldMapping): boolean {
  const leads = toOptionalNumber(read(row, mapping.leads)) || 0;
  const cost = toOptionalNumber(read(row, mapping.cost)) || 0;
  const current = toOptionalNumber(read(row, mapping.currentGmv)) || 0;
  const gmv = toOptionalNumber(read(row, mapping.day7Gmv)) || 0;
  const total = toOptionalNumber(read(row, mapping.totalGmv)) || 0;
  const d1 = toOptionalNumber(read(row, mapping.d1Attendance)) || 0;
  return leads > 0 || cost > 0 || current > 0 || gmv > 0 || total > 0 || d1 > 0;
}

function read(row: RawRow, key?: string): unknown {
  if (!key) return undefined;
  return row[key];
}

export function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function toNumber(value: unknown): number {
  return toOptionalNumber(value) || 0;
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const text = String(value)
    .replace(/,/g, '')
    .replace(/￥|¥|元|\s/g, '')
    .replace(/%$/, '');
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return undefined;
  return String(value).trim().endsWith('%') ? parsed / 100 : parsed;
}

function normalizeDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const date = xlsxDateToJSDate(value);
    return date ? date.toISOString().slice(0, 10) : '';
  }
  return String(value).trim();
}

function xlsxDateToJSDate(serial: number): Date | null {
  if (serial < 20000 || serial > 80000) return null;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function getFileType(fileName: string): UploadRecord['fileType'] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') return ext;
  return 'unknown';
}
