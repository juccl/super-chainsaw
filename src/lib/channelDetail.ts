import { asText, toNumber, toOptionalNumber } from './dataCleaner';
import { safeDivide } from './formatters';
import { getHeaders } from './fieldMapping';
import { RawRow } from '../types';

const UNIT_PRICE = 2980;
const DAY_KEYS = [4, 5, 6, 7, 8, 9, 10] as const;

export interface ChannelDetailRow {
  id: string;
  campaign: string;
  startDate: string;
  closeDate: string;
  owner: string;
  channelId: string;
  category: string;
  leads: number;
  cost: number;
  d4gmv: number;
  d5gmv: number;
  d6gmv: number;
  d7gmv: number;
  d8gmv: number;
  d9gmv: number;
  d10gmv: number;
  raw: RawRow;
}

export interface ChannelDetailUploadRecord {
  id: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'xls' | 'unknown';
  rawRows: number;
  cleanedRows: number;
  filteredRows: number;
  headers: string[];
  filterLogs: Record<string, number>;
  mapping: ChannelDetailFieldMapping;
  uploadedAt: string;
}

export interface ChannelDetailFieldMapping {
  campaign?: string;
  startDate?: string;
  closeDate?: string;
  owner?: string;
  channelId?: string;
  category?: string;
  leads?: string;
  cost?: string;
  d4gmv?: string;
  d5gmv?: string;
  d6gmv?: string;
  d7gmv?: string;
  d8gmv?: string;
  d9gmv?: string;
  d10gmv?: string;
}

export interface ChannelDetailFilters {
  campaign: string[];
  owner: string[];
  channelId: string[];
  category: string[];
  startDate: string[];
  closeDate: string[];
}

export interface ChannelDetailSummary {
  leads: number;
  cost: number;
  leadCost: number | null;
  d4gmv: number;
  d5gmv: number;
  d6gmv: number;
  d7gmv: number;
  d8gmv: number;
  d9gmv: number;
  d10gmv: number;
  d4Rate: number | null;
  d5Rate: number | null;
  d6Rate: number | null;
  d7Rate: number | null;
  d8Rate: number | null;
  d9Rate: number | null;
  d10Rate: number | null;
  currentGmv: number;
  followGmv: number;
  closedGmv: number;
  currentRate: number | null;
  followRate: number | null;
  closedRate: number | null;
  closedRoi: number | null;
  closedCostRate: number | null;
  closedRValue: number | null;
  followRatio: number | null;
}

const FIELD_ALIASES: Record<keyof ChannelDetailFieldMapping, string[]> = {
  campaign: ['营期'],
  startDate: ['开课日期', '开营日', '开课日'],
  closeDate: ['封板日期', '结课日期'],
  owner: ['渠道归属人', '渠道归属'],
  channelId: ['渠道号', '渠道id', '渠道ID', '渠道Id'],
  category: ['分类', '产品类型'],
  leads: ['leads数', 'Leads数', '项目leads数'],
  cost: ['消耗', '消耗总金额', '获客成本', '总成本'],
  d4gmv: ['d4gmv', 'D4GMV', 'd4成交gmv', 'D4成交GMV'],
  d5gmv: ['d5gmv', 'D5GMV', 'd5成交gmv', 'D5成交GMV'],
  d6gmv: ['d6gmv', 'D6GMV', 'd6成交gmv', 'D6成交GMV'],
  d7gmv: ['d7gmv', 'D7GMV', 'd7成交gmv', 'D7成交GMV'],
  d8gmv: ['d8gmv', 'D8GMV', 'd8成交gmv', 'D8成交GMV'],
  d9gmv: ['d9gmv', 'D9GMV', 'd9成交gmv', 'D9成交GMV'],
  d10gmv: ['d10gmv', 'D10GMV', 'd10成交gmv', 'D10成交GMV'],
};

export function emptyChannelDetailFilters(): ChannelDetailFilters {
  return {
    campaign: [],
    owner: [],
    channelId: [],
    category: [],
    startDate: [],
    closeDate: [],
  };
}

export function normalizeChannelDetailUpload(fileName: string, rows: RawRow[]): {
  upload: ChannelDetailUploadRecord;
  rows: ChannelDetailRow[];
} {
  const headers = getHeaders(rows);
  const mapping = buildChannelDetailFieldMapping(headers);
  const cleanedRows: ChannelDetailRow[] = [];
  const filterLogs: Record<string, number> = {};
  const fileType = getFileType(fileName);

  rows.forEach((row, index) => {
    const reason = getFilterReason(row, mapping);
    if (reason) {
      filterLogs[reason] = (filterLogs[reason] || 0) + 1;
      return;
    }

    cleanedRows.push({
      id: `${fileName}-${index}`,
      campaign: asText(read(row, mapping.campaign)),
      startDate: normalizeDate(read(row, mapping.startDate)),
      closeDate: normalizeDate(read(row, mapping.closeDate)),
      owner: asText(read(row, mapping.owner)) || '未填写',
      channelId: asText(read(row, mapping.channelId)) || '未填写',
      category: asText(read(row, mapping.category)) || '未填写',
      leads: toNumber(read(row, mapping.leads)),
      cost: toNumber(read(row, mapping.cost)),
      d4gmv: toNumber(read(row, mapping.d4gmv)),
      d5gmv: toNumber(read(row, mapping.d5gmv)),
      d6gmv: toNumber(read(row, mapping.d6gmv)),
      d7gmv: toNumber(read(row, mapping.d7gmv)),
      d8gmv: toNumber(read(row, mapping.d8gmv)),
      d9gmv: toNumber(read(row, mapping.d9gmv)),
      d10gmv: toNumber(read(row, mapping.d10gmv)),
      raw: row,
    });
  });

  return {
    upload: {
      id: `${fileName}-${Date.now()}`,
      fileName,
      fileType,
      rawRows: rows.length,
      cleanedRows: cleanedRows.length,
      filteredRows: rows.length - cleanedRows.length,
      headers,
      filterLogs,
      mapping,
      uploadedAt: new Date().toISOString(),
    },
    rows: cleanedRows,
  };
}

export function applyChannelDetailFilters(rows: ChannelDetailRow[], filters: ChannelDetailFilters): ChannelDetailRow[] {
  const inList = (value: string, selected: string[]) => !selected.length || selected.includes(value || '未填写');
  return rows.filter((row) => {
    if (!inList(row.campaign, filters.campaign)) return false;
    if (!inList(row.owner, filters.owner)) return false;
    if (!inList(row.channelId, filters.channelId)) return false;
    if (!inList(row.category, filters.category)) return false;
    if (!inList(row.startDate || '未填写', filters.startDate)) return false;
    if (!inList(row.closeDate || '未填写', filters.closeDate)) return false;
    return true;
  });
}

export function summarizeChannelDetailRows(rows: ChannelDetailRow[]): ChannelDetailSummary {
  const leads = sum(rows, (row) => row.leads);
  const cost = sum(rows, (row) => row.cost);
  const d4gmv = sum(rows, (row) => row.d4gmv);
  const d5gmv = sum(rows, (row) => row.d5gmv);
  const d6gmv = sum(rows, (row) => row.d6gmv);
  const d7gmv = sum(rows, (row) => row.d7gmv);
  const d8gmv = sum(rows, (row) => row.d8gmv);
  const d9gmv = sum(rows, (row) => row.d9gmv);
  const d10gmv = sum(rows, (row) => row.d10gmv);
  const currentGmv = d4gmv + d5gmv + d6gmv + d7gmv;
  const followGmv = d8gmv + d9gmv + d10gmv;
  const closedGmv = currentGmv + followGmv;

  return {
    leads,
    cost,
    leadCost: safeDivide(cost, leads),
    d4gmv,
    d5gmv,
    d6gmv,
    d7gmv,
    d8gmv,
    d9gmv,
    d10gmv,
    d4Rate: safeDivide(d4gmv, UNIT_PRICE * leads),
    d5Rate: safeDivide(d5gmv, UNIT_PRICE * leads),
    d6Rate: safeDivide(d6gmv, UNIT_PRICE * leads),
    d7Rate: safeDivide(d7gmv, UNIT_PRICE * leads),
    d8Rate: safeDivide(d8gmv, UNIT_PRICE * leads),
    d9Rate: safeDivide(d9gmv, UNIT_PRICE * leads),
    d10Rate: safeDivide(d10gmv, UNIT_PRICE * leads),
    currentGmv,
    followGmv,
    closedGmv,
    currentRate: safeDivide(currentGmv, UNIT_PRICE * leads),
    followRate: safeDivide(followGmv, UNIT_PRICE * leads),
    closedRate: safeDivide(closedGmv, UNIT_PRICE * leads),
    closedRoi: safeDivide(closedGmv, cost),
    closedCostRate: safeDivide(cost, closedGmv),
    closedRValue: safeDivide(closedGmv, leads),
    followRatio: safeDivide(followGmv, closedGmv),
  };
}

export function buildChannelCampaignTrend(rows: ChannelDetailRow[]): Array<{ campaign: string; summary: ChannelDetailSummary }> {
  const grouped = groupRows(rows, (row) => row.campaign);
  return grouped
    .map((item) => ({ campaign: item.key, summary: summarizeChannelDetailRows(item.rows), startDate: item.rows.map((row) => row.startDate).find(Boolean) || '' }))
    .sort((a, b) => sortCampaignKey(a.campaign, a.startDate, b.campaign, b.startDate))
    .map(({ campaign, summary }) => ({ campaign, summary }));
}

export function buildDimensionBreakdown(
  rows: ChannelDetailRow[],
  dimension: 'owner' | 'channelId' | 'category',
): Array<{ key: string; summary: ChannelDetailSummary }> {
  const grouped = groupRows(rows, (row) => (row[dimension] || '未填写'));
  return grouped
    .map((item) => ({ key: item.key, summary: summarizeChannelDetailRows(item.rows) }))
    .sort((a, b) => (b.summary.closedRate ?? -1) - (a.summary.closedRate ?? -1));
}

export function channelDetailFilterOptions(rows: ChannelDetailRow[]): Record<keyof ChannelDetailFilters, string[]> {
  return {
    campaign: unique(rows.map((row) => row.campaign || '未填写')),
    owner: unique(rows.map((row) => row.owner || '未填写')),
    channelId: unique(rows.map((row) => row.channelId || '未填写')),
    category: unique(rows.map((row) => row.category || '未填写')),
    startDate: unique(rows.map((row) => row.startDate || '未填写')),
    closeDate: unique(rows.map((row) => row.closeDate || '未填写')),
  };
}

function getFilterReason(row: RawRow, mapping: ChannelDetailFieldMapping): string | null {
  const values = Object.values(row).map((value) => asText(value)).filter(Boolean);
  if (!values.length) return '空行';

  const campaign = asText(read(row, mapping.campaign));
  if (!campaign) return '营期缺失';
  if (/分类总计|分类合计|营期汇总|总计|合计|汇总/.test(campaign)) return '汇总行';

  const joined = values.join(' ');
  if (/分类总计|分类合计|营期汇总|总计|合计|汇总/.test(joined)) return '汇总行';

  const channelId = asText(read(row, mapping.channelId));
  const owner = asText(read(row, mapping.owner));
  const leads = toOptionalNumber(read(row, mapping.leads)) || 0;
  const cost = toOptionalNumber(read(row, mapping.cost)) || 0;
  const gmv = DAY_KEYS.reduce((sum, day) => sum + (toOptionalNumber(read(row, mapping[`d${day}gmv` as keyof ChannelDetailFieldMapping])) || 0), 0);

  if (!channelId && !owner && leads <= 0 && cost <= 0 && gmv <= 0) return '渠道信息与核心指标缺失';
  if ((channelId === '-' || channelId === '—') && (owner === '-' || owner === '—') && leads <= 0 && cost <= 0 && gmv <= 0) return '无效占位行';
  return null;
}

function buildChannelDetailFieldMapping(headers: string[]): ChannelDetailFieldMapping {
  const normalizedHeaders = new Map(headers.map((header) => [normalize(header), header]));
  const mapping: ChannelDetailFieldMapping = {};
  (Object.keys(FIELD_ALIASES) as Array<keyof ChannelDetailFieldMapping>).forEach((field) => {
    const aliases = FIELD_ALIASES[field] || [];
    for (const alias of aliases) {
      const match = normalizedHeaders.get(normalize(alias));
      if (match) {
        mapping[field] = match;
        break;
      }
    }
  });
  return mapping;
}

function read(row: RawRow, key?: string): unknown {
  if (!key) return undefined;
  return row[key];
}

function normalize(value: string): string {
  return value.replace(/\s+/g, '').replace(/[：:]/g, '').toLowerCase();
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

function getFileType(fileName: string): ChannelDetailUploadRecord['fileType'] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') return ext;
  return 'unknown';
}

function sum(rows: ChannelDetailRow[], getter: (row: ChannelDetailRow) => number): number {
  return rows.reduce((total, row) => {
    const value = getter(row);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function groupRows(rows: ChannelDetailRow[], keyGetter: (row: ChannelDetailRow) => string): Array<{ key: string; rows: ChannelDetailRow[] }> {
  const grouped = new Map<string, ChannelDetailRow[]>();
  rows.forEach((row) => {
    const key = keyGetter(row) || '未填写';
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });
  return Array.from(grouped.entries()).map(([key, value]) => ({ key, rows: value }));
}

function sortCampaignKey(campaignA: string, startA: string, campaignB: string, startB: string): number {
  const a = Date.parse(startA || '');
  const b = Date.parse(startB || '');
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  const numericA = Number(campaignA.replace(/[^\d]/g, ''));
  const numericB = Number(campaignB.replace(/[^\d]/g, ''));
  if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) return numericA - numericB;
  return campaignA.localeCompare(campaignB, 'zh-CN');
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

