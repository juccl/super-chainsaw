import { Filters, MetricSummary, MetricWithContext, StandardRow } from '../types';
import { safeDivide } from './formatters';

const DAY_KEYS = [1, 2, 3, 4, 5, 6] as const;
const TICKET_PRICE = 2980;
export type GmvFieldOption = 'currentGmv' | 'day7Gmv' | 'totalGmv';

export function emptyFilters(): Filters {
  return {
    channel: [],
    channelId: [],
    channelOwner: [],
    productType: [],
    campaign: [],
  };
}

export function applyFilters(rows: StandardRow[], filters: Filters): StandardRow[] {
  return rows.filter((row) => {
    const inList = (value: string, selected: string[]) => !selected.length || selected.includes(value || '未填写');
    if (!inList(row.channel, filters.channel)) return false;
    if (!inList(row.channelId, filters.channelId)) return false;
    if (!inList(row.channelOwner, filters.channelOwner)) return false;
    if (!inList(row.productType, filters.productType)) return false;
    if (!inList(row.campaign, filters.campaign)) return false;
    return true;
  });
}

export function getFilterOptions(
  rows: StandardRow[],
  field: keyof Pick<StandardRow, 'channel' | 'channelId' | 'channelOwner' | 'productType' | 'campaign' | 'studio'>,
): string[] {
  return Array.from(new Set(rows.map((row) => row[field] || '未填写'))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function summarizeRows(rows: StandardRow[], gmvField: GmvFieldOption = 'currentGmv'): MetricSummary {
  const leads = sum(rows, (row) => row.leads);
  const cost = sum(rows, (row) => row.cost);
  const currentGmv = sum(rows, (row) => row.currentGmv ?? 0);
  const day7Gmv = sum(rows, (row) => row.day7Gmv);
  const totalGmv = sum(rows, (row) => row.totalGmv ?? row.day7Gmv ?? row.currentGmv ?? 0);
  const gmv = gmvField === 'day7Gmv' ? day7Gmv : gmvField === 'totalGmv' ? totalGmv : currentGmv;

  const dAttendanceRates = Object.fromEntries(
    DAY_KEYS.map((day) => [day, safeDivide(sum(rows, (row) => row.attendance[day] || 0), leads)]),
  ) as MetricSummary['dAttendanceRates'];
  const dCompletionRates = Object.fromEntries(
    DAY_KEYS.map((day) => [day, safeDivide(sum(rows, (row) => row.completion[day] || 0), leads)]),
  ) as MetricSummary['dCompletionRates'];

  return {
    leads,
    cost,
    leadCost: safeDivide(cost, leads),
    gmv,
    currentGmv,
    day7Gmv,
    totalGmv,
    conversionRate: safeDivide(gmv, TICKET_PRICE * leads),
    roi: safeDivide(gmv, cost),
    costRate: safeDivide(cost, gmv),
    rValue: safeDivide(gmv, leads),
    dAttendanceRates,
    dCompletionRates,
  };
}

export function groupRows(
  rows: StandardRow[],
  keyGetter: (row: StandardRow) => string,
): Array<{ key: string; rows: StandardRow[] }> {
  const grouped = new Map<string, StandardRow[]>();
  rows.forEach((row) => {
    const key = keyGetter(row) || '未填写';
    grouped.set(key, [...(grouped.get(key) || []), row]);
  });
  return Array.from(grouped.entries()).map(([key, items]) => ({ key, rows: items }));
}

export function buildCampaignTrend(rows: StandardRow[], gmvField: GmvFieldOption = 'currentGmv'): Array<{ campaign: string; metrics: MetricSummary }> {
  return groupRows(rows, (row) => row.campaign)
    .map((group) => ({
      campaign: group.key,
      metrics: summarizeRows(group.rows, gmvField),
      startDate: group.rows.map((row) => row.startDate).find(Boolean) || '',
    }))
    .sort((a, b) => sortCampaignKey(a.campaign, a.startDate, b.campaign, b.startDate))
    .map(({ campaign, metrics }) => ({ campaign, metrics }));
}

export function buildDayRateComparison(
  base: MetricSummary,
  selected: MetricSummary,
  mode: 'attendance' | 'completion',
): Array<{ day: string; base: number | null; selected: number | null }> {
  return DAY_KEYS.map((day) => ({
    day: `D${day}`,
    base: mode === 'attendance' ? base.dAttendanceRates[day] : base.dCompletionRates[day],
    selected: mode === 'attendance' ? selected.dAttendanceRates[day] : selected.dCompletionRates[day],
  }));
}

export function buildChannelStatusTags(
  current: MetricSummary,
  average: MetricSummary,
  previous?: MetricSummary,
): string[] {
  const tags: string[] = [];
  if (gt(current.roi, average.roi) && gt(current.rValue, average.rValue) && lte(current.leadCost, average.leadCost)) tags.push('优质渠道');
  if (gt(current.leadCost, average.leadCost)) tags.push('高成本渠道');
  if (gte(current.leads, average.leads) && lt(current.conversionRate, average.conversionRate)) tags.push('低转化渠道');
  if (gt(current.gmv, average.gmv)) tags.push('高产出渠道');
  if (lt(current.dAttendanceRates[1], average.dAttendanceRates[1]) || lt(current.dCompletionRates[1], average.dCompletionRates[1])) tags.push('首日质量弱');
  if (lt(current.dAttendanceRates[4], average.dAttendanceRates[4]) || lt(current.dCompletionRates[4], average.dCompletionRates[4])) tags.push('转化日承接弱');
  if (previous) {
    if (dropOver20(current.roi, previous.roi) || dropOver20(current.rValue, previous.rValue)) tags.push('波动渠道');
  }
  if (
    lt(current.dAttendanceRates[1], average.dAttendanceRates[1]) ||
    lt(current.dCompletionRates[4], average.dCompletionRates[4]) ||
    lt(current.conversionRate, average.conversionRate)
  ) {
    tags.push('观察渠道');
  }
  return Array.from(new Set(tags));
}

export function toMetricContext(rows: StandardRow[], average: MetricSummary): MetricWithContext[] {
  return groupRows(rows, (row) => `${row.channelId || '未填写'}__${row.campaign || '未填写'}`).map((group) => {
    const first = group.rows[0];
    const summary = summarizeRows(group.rows);
    const sameChannelCampaigns = rows.filter((row) => row.channelId === first.channelId);
    const ordered = buildCampaignTrend(sameChannelCampaigns);
    const index = ordered.findIndex((item) => item.campaign === first.campaign);
    const previous = index > 0 ? ordered[index - 1].metrics : undefined;
    return {
      channel: first.channel || '未填写',
      channelId: first.channelId || '未填写',
      channelOwner: first.channelOwner || '未填写',
      productType: first.productType || '未填写',
      campaign: first.campaign || '未填写',
      startDate: first.startDate || '未填写',
      studio: first.studio || '未填写',
      statusTags: buildChannelStatusTags(summary, average, previous),
      ...summary,
    };
  });
}

function dropOver20(current: number | null | undefined, previous: number | null | undefined): boolean {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous <= 0) return false;
  return (previous - current) / previous > 0.2;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function gt(a: number | null | undefined, b: number | null | undefined): boolean {
  return isFiniteNumber(a) && isFiniteNumber(b) && a > b;
}

function gte(a: number | null | undefined, b: number | null | undefined): boolean {
  return isFiniteNumber(a) && isFiniteNumber(b) && a >= b;
}

function lt(a: number | null | undefined, b: number | null | undefined): boolean {
  return isFiniteNumber(a) && isFiniteNumber(b) && a < b;
}

function lte(a: number | null | undefined, b: number | null | undefined): boolean {
  return isFiniteNumber(a) && isFiniteNumber(b) && a <= b;
}

function sum(rows: StandardRow[], getter: (row: StandardRow) => number): number {
  return rows.reduce((total, row) => total + (Number.isFinite(getter(row)) ? getter(row) : 0), 0);
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
