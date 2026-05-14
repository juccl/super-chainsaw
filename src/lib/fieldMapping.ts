import { FieldMapping, RawRow, StandardField } from '../types';

export const FIELD_LABELS: Record<StandardField, string> = {
  channel: '渠道',
  channelId: '渠道ID',
  productType: '产品类型',
  channelOwner: '渠道归属',
  studio: '工作室',
  campaign: '营期',
  startDate: '开营日',
  leads: 'leads数',
  cost: '消耗总金额',
  currentGmv: '当期成交gmv',
  day7Gmv: 'day7当期成交gmv',
  totalGmv: '总成交额',
  d1Attendance: 'D1到课',
  d1Completion: 'D1完课',
  d2Attendance: 'D2到课',
  d2Completion: 'D2完课',
  d3Attendance: 'D3到课',
  d3Completion: 'D3完课',
  d4Attendance: 'D4到课',
  d4Completion: 'D4完课',
  d5Attendance: 'D5到课',
  d5Completion: 'D5完课',
  d6Attendance: 'D6到课',
  d6Completion: 'D6完课',
};

export const STANDARD_FIELDS = Object.keys(FIELD_LABELS) as StandardField[];

export const FIELD_ALIASES: Record<StandardField, string[]> = {
  channel: ['渠道'],
  channelId: ['渠道id', '渠道ID', '渠道号'],
  productType: ['产品类型', '分类'],
  channelOwner: ['渠道归属', '渠道归属人'],
  studio: ['工作室'],
  campaign: ['营期'],
  startDate: ['开营日', '开课日期'],
  leads: ['leads数', 'Leads数', '项目leads数', '项目Leads数'],
  cost: ['消耗总金额', '消耗', '获客成本', '总成本'],
  currentGmv: ['当期成交gmv', '当期成交GMV'],
  day7Gmv: ['day7当期成交gmv', 'day7当期成交GMV'],
  totalGmv: ['总成交额', '总收入额', '总GMV', '总 gmv', '总成交gmv', '总成交GMV'],
  d1Attendance: ['D1到课', 'D1 到课', 'D1到课数', 'D1 到课数'],
  d1Completion: ['D1完课', 'D1 完课', 'D1完课数', 'D1 完课数'],
  d2Attendance: ['D2到课', 'D2 到课', 'D2到课数', 'D2 到课数'],
  d2Completion: ['D2完课', 'D2 完课', 'D2完课数', 'D2 完课数'],
  d3Attendance: ['D3到课', 'D3 到课', 'D3到课数', 'D3 到课数'],
  d3Completion: ['D3完课', 'D3 完课', 'D3完课数', 'D3 完课数'],
  d4Attendance: ['D4到课', 'D4 到课', 'D4到课数', 'D4 到课数'],
  d4Completion: ['D4完课', 'D4 完课', 'D4完课数', 'D4 完课数'],
  d5Attendance: ['D5到课', 'D5 到课', 'D5到课数', 'D5 到课数'],
  d5Completion: ['D5完课', 'D5 完课', 'D5完课数', 'D5 完课数'],
  d6Attendance: ['D6到课', 'D6 到课', 'D6到课数', 'D6 到课数'],
  d6Completion: ['D6完课', 'D6 完课', 'D6完课数', 'D6 完课数'],
};

const normalize = (value: string) => value.replace(/\s+/g, '').replace(/[：:]/g, '').toLowerCase();

export function buildFieldMapping(headers: string[], overrides: FieldMapping = {}): FieldMapping {
  const normalizedHeaders = new Map(headers.map((header) => [normalize(header), header]));
  const mapping: FieldMapping = {};

  STANDARD_FIELDS.forEach((field) => {
    for (const alias of FIELD_ALIASES[field]) {
      const match = normalizedHeaders.get(normalize(alias));
      if (match && alias !== '从营期提取') {
        mapping[field] = match;
        break;
      }
    }
  });

  return { ...mapping, ...overrides };
}

export function getHeaders(rows: RawRow[]): string[] {
  const headers = new Set<string>();
  rows.slice(0, 30).forEach((row) => Object.keys(row).forEach((key) => key && headers.add(key)));
  return Array.from(headers);
}

export function detectFieldStatus(mapping: FieldMapping): '已识别' | '部分识别' | '未识别' {
  const required: StandardField[] = ['campaign', 'channelId', 'leads', 'cost', 'day7Gmv'];
  const hit = required.filter((field) => Boolean(mapping[field])).length;
  if (hit === required.length) return '已识别';
  if (hit > 0) return '部分识别';
  return '未识别';
}
