import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Activity,
  BarChart3,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  LayoutGrid,
  List,
  Percent,
  Settings2,
  Target,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { formatMoney, formatPercent, formatRatio, formatSignedDelta } from '../lib/formatters';
import { buildCampaignTrend, summarizeRows, type GmvFieldOption } from '../lib/metrics';
import { readStorage, writeStorage } from '../lib/storage';
import { MetricSummary, StandardRow, UploadRecord } from '../types';

interface OverviewPageProps {
  rows: StandardRow[];
  upload?: UploadRecord;
  ownerSelection: string[];
  onOwnerSelectionChange: (owners: string[]) => void;
  onApplyFavoriteOwnersToGlobalFilter?: (owners: string[]) => void;
  mode?: 'all' | 'module-a' | 'module-b';
}

type MetricCardKey =
  | 'leads'
  | 'cost'
  | 'gmv'
  | 'totalGmv'
  | 'conversionRate'
  | 'roi'
  | 'costRate'
  | 'leadCost'
  | 'rValue'
  | 'd1Attend'
  | 'd1Complete'
  | 'd2Attend'
  | 'd2Complete'
  | 'd3Attend'
  | 'd3Complete'
  | 'd4Attend'
  | 'd4Complete'
  | 'd5Attend'
  | 'd5Complete'
  | 'd6Attend'
  | 'd6Complete';

type DayViewMode = 'attendance' | 'completion';
type OverviewChartTab = 'all' | 'result' | 'efficiency' | 'day';
type OverviewChartDisplayMode = 'list' | 'card';
type ChartLineType = 'number' | 'percent' | 'money';
type ChartLineDef = { key: string; label: string; type: ChartLineType; color: string; axis: 'left' | 'right' };

const STORAGE = {
  metricVisible: 'business-dashboard:overview:metric-visible-v2',
  metricOrder: 'business-dashboard:overview:metric-order-v2',
  gmvField: 'business-dashboard:overview:gmv-field-v1',
  resultLegendHidden: 'business-dashboard:overview:result-legend-hidden-v1',
  effLegendHidden: 'business-dashboard:overview:eff-legend-hidden-v1',
  resultFilter: 'business-dashboard:overview:result-filter-v1',
  effFilter: 'business-dashboard:overview:eff-filter-v1',
  dayFilter: 'business-dashboard:overview:day-filter-v1',
  chartTab: 'business-dashboard:overview:chart-tab-v1',
  chartDisplayMode: 'business-dashboard:overview:chart-display-mode-v1',
  dayViewMode: 'business-dashboard:overview:day-view-mode-v1',
  dayLegendAttend: 'business-dashboard:overview:day-legend-attend-v1',
  dayLegendComplete: 'business-dashboard:overview:day-legend-complete-v1',
  bMetricVisible: 'business-dashboard:overview:b-metric-visible-v1',
  bMetricOrder: 'business-dashboard:overview:b-metric-order-v1',
  bCompareBusinessVisible: 'personalCompareBusinessMetrics',
  bCompareAttendanceVisible: 'personalCompareAttendanceMetrics',
  bConversionFilter: 'business-dashboard:overview:b-conversion-filter-v2',
  bConversionLegend: 'business-dashboard:overview:b-conversion-legend-v1',
  personalFavoriteOwners: 'personalFavoriteOwners',
};

const defaultVisible: MetricCardKey[] = ['leads', 'cost', 'gmv', 'totalGmv', 'conversionRate', 'roi', 'costRate'];
const allMetricsOrder: MetricCardKey[] = [
  'leads',
  'cost',
  'gmv',
  'totalGmv',
  'conversionRate',
  'roi',
  'costRate',
  'leadCost',
  'rValue',
  'd1Attend',
  'd1Complete',
  'd2Attend',
  'd2Complete',
  'd3Attend',
  'd3Complete',
  'd4Attend',
  'd4Complete',
  'd5Attend',
  'd5Complete',
  'd6Attend',
  'd6Complete',
];

type BMetricCardKey =
  | 'leads'
  | 'cost'
  | 'currentGmv'
  | 'day7Gmv'
  | 'totalGmv'
  | 'leadCost'
  | 'conversionRate'
  | 'roi'
  | 'costRate'
  | 'rValue'
  | 'd1Attend'
  | 'd1Complete'
  | 'd2Attend'
  | 'd2Complete'
  | 'd3Attend'
  | 'd3Complete'
  | 'd4Attend'
  | 'd4Complete'
  | 'd5Attend'
  | 'd5Complete'
  | 'd6Attend'
  | 'd6Complete';

const bMetricDefaultVisible: BMetricCardKey[] = ['leads', 'cost', 'day7Gmv', 'totalGmv', 'conversionRate', 'roi', 'costRate'];
const bMetricAllOrder: BMetricCardKey[] = [
  'leads',
  'cost',
  'currentGmv',
  'day7Gmv',
  'totalGmv',
  'leadCost',
  'conversionRate',
  'roi',
  'costRate',
  'rValue',
  'd1Attend',
  'd1Complete',
  'd2Attend',
  'd2Complete',
  'd3Attend',
  'd3Complete',
  'd4Attend',
  'd4Complete',
  'd5Attend',
  'd5Complete',
  'd6Attend',
  'd6Complete',
];

const bMetricLabels: Record<BMetricCardKey, string> = {
  leads: '个人leads数',
  cost: '个人消耗总金额',
  currentGmv: '个人当期成交GMV',
  day7Gmv: '个人day7当期成交GMV',
  totalGmv: '个人总成交额',
  leadCost: '个人leads成本',
  conversionRate: '个人转化率',
  roi: '个人ROI',
  costRate: '个人费比',
  rValue: '个人R值',
  d1Attend: '个人D1到课率',
  d1Complete: '个人D1完课率',
  d2Attend: '个人D2到课率',
  d2Complete: '个人D2完课率',
  d3Attend: '个人D3到课率',
  d3Complete: '个人D3完课率',
  d4Attend: '个人D4到课率',
  d4Complete: '个人D4完课率',
  d5Attend: '个人D5到课率',
  d5Complete: '个人D5完课率',
  d6Attend: '个人D6到课率',
  d6Complete: '个人D6完课率',
};

type CompareMetricKey =
  | 'leads'
  | 'cost'
  | 'currentGmv'
  | 'day7Gmv'
  | 'totalGmv'
  | 'leadCost'
  | 'conversionRate'
  | 'roi'
  | 'costRate'
  | 'rValue'
  | 'd1Attend'
  | 'd1Complete'
  | 'd2Attend'
  | 'd2Complete'
  | 'd3Attend'
  | 'd3Complete'
  | 'd4Attend'
  | 'd4Complete'
  | 'd5Attend'
  | 'd5Complete'
  | 'd6Attend'
  | 'd6Complete';

const compareMetricDefs: Array<{
  key: CompareMetricKey;
  label: string;
  type: ChartLineType;
  trend: 'higher' | 'lower' | 'neutral';
}> = [
  { key: 'leads', label: 'leads数', type: 'number', trend: 'neutral' },
  { key: 'cost', label: '消耗总金额', type: 'money', trend: 'neutral' },
  { key: 'currentGmv', label: '当期成交GMV', type: 'money', trend: 'neutral' },
  { key: 'day7Gmv', label: 'day7当期成交GMV', type: 'money', trend: 'neutral' },
  { key: 'totalGmv', label: '总成交额', type: 'money', trend: 'neutral' },
  { key: 'leadCost', label: 'leads成本', type: 'money', trend: 'lower' },
  { key: 'conversionRate', label: '转化率', type: 'percent', trend: 'higher' },
  { key: 'roi', label: 'ROI', type: 'number', trend: 'higher' },
  { key: 'costRate', label: '费比', type: 'percent', trend: 'lower' },
  { key: 'rValue', label: 'R值', type: 'money', trend: 'higher' },
  { key: 'd1Attend', label: 'D1到课率', type: 'percent', trend: 'higher' },
  { key: 'd1Complete', label: 'D1完课率', type: 'percent', trend: 'higher' },
  { key: 'd2Attend', label: 'D2到课率', type: 'percent', trend: 'higher' },
  { key: 'd2Complete', label: 'D2完课率', type: 'percent', trend: 'higher' },
  { key: 'd3Attend', label: 'D3到课率', type: 'percent', trend: 'higher' },
  { key: 'd3Complete', label: 'D3完课率', type: 'percent', trend: 'higher' },
  { key: 'd4Attend', label: 'D4到课率', type: 'percent', trend: 'higher' },
  { key: 'd4Complete', label: 'D4完课率', type: 'percent', trend: 'higher' },
  { key: 'd5Attend', label: 'D5到课率', type: 'percent', trend: 'higher' },
  { key: 'd5Complete', label: 'D5完课率', type: 'percent', trend: 'higher' },
  { key: 'd6Attend', label: 'D6到课率', type: 'percent', trend: 'higher' },
  { key: 'd6Complete', label: 'D6完课率', type: 'percent', trend: 'higher' },
];

const defaultBusinessCompareVisible: CompareMetricKey[] = [
  'leads',
  'cost',
  'currentGmv',
  'day7Gmv',
  'totalGmv',
  'leadCost',
  'conversionRate',
  'roi',
  'costRate',
  'rValue',
];

const defaultAttendanceCompareVisible: CompareMetricKey[] = [
  'd1Attend',
  'd1Complete',
  'd2Attend',
  'd2Complete',
  'd3Attend',
  'd3Complete',
  'd4Attend',
  'd4Complete',
  'd5Attend',
  'd5Complete',
  'd6Attend',
  'd6Complete',
];

const metricLabels: Record<MetricCardKey, string> = {
  leads: 'leads数',
  cost: '消耗总金额',
  gmv: 'day7当期成交gmv',
  totalGmv: '总成交额',
  conversionRate: '转化率',
  roi: 'ROI',
  costRate: '费比',
  leadCost: 'leads成本',
  rValue: 'R值',
  d1Attend: 'D1到课率',
  d1Complete: 'D1完课率',
  d2Attend: 'D2到课率',
  d2Complete: 'D2完课率',
  d3Attend: 'D3到课率',
  d3Complete: 'D3完课率',
  d4Attend: 'D4到课率',
  d4Complete: 'D4完课率',
  d5Attend: 'D5到课率',
  d5Complete: 'D5完课率',
  d6Attend: 'D6到课率',
  d6Complete: 'D6完课率',
};

type MiniFilter = { campaign: string[]; channelOwner: string[]; channelId: string[]; productType: string[] };

const resultTrendDefs: ChartLineDef[] = [
  { key: 'leads', label: 'leads数', type: 'number', color: '#4f8fd9', axis: 'left' },
  { key: 'conversionRate', label: '转化率', type: 'percent', color: '#5bae8b', axis: 'right' },
];

const efficiencyTrendDefs: ChartLineDef[] = [
  { key: 'cost', label: '消耗总金额', type: 'money', color: '#d89a4a', axis: 'left' },
  { key: 'day7Gmv', label: 'day7当期成交GMV', type: 'money', color: '#5b8def', axis: 'right' },
  { key: 'totalGmv', label: '总成交额', type: 'money', color: '#4db6ac', axis: 'right' },
];
const bConversionTrendDefs: ChartLineDef[] = [
  { key: 'overallConversion', label: '大盘转化率', type: 'percent', color: '#4f8fd9', axis: 'left' },
  { key: 'personalConversion', label: '个人转化率', type: 'percent', color: '#5bae8b', axis: 'left' },
  { key: 'personalLeads', label: '营期leads数', type: 'number', color: '#d89a4a', axis: 'right' },
];

const emptyMiniFilter: MiniFilter = { campaign: [], channelOwner: [], channelId: [], productType: [] };
const DAY_ATTEND_DEFAULT_VISIBILITY: Record<string, boolean> = {
  d1Attend: true,
  d2Attend: false,
  d3Attend: false,
  d4Attend: true,
  d5Attend: false,
  d6Attend: false,
};
const DAY_COMPLETE_DEFAULT_VISIBILITY: Record<string, boolean> = {
  d1Complete: true,
  d2Complete: false,
  d3Complete: false,
  d4Complete: true,
  d5Complete: false,
  d6Complete: false,
};

export function OverviewPage({
  rows,
  upload,
  ownerSelection,
  onOwnerSelectionChange,
  onApplyFavoriteOwnersToGlobalFilter,
  mode = 'all',
}: OverviewPageProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [showMetricSettings, setShowMetricSettings] = useState(false);
  const [showFormulaPanel, setShowFormulaPanel] = useState(false);
  const [showBMetricSettings, setShowBMetricSettings] = useState(false);
  const [showBFormulaPanel, setShowBFormulaPanel] = useState(false);
  const [showBusinessCompareSettings, setShowBusinessCompareSettings] = useState(false);
  const [showAttendanceCompareSettings, setShowAttendanceCompareSettings] = useState(false);
  const [gmvField, setGmvField] = useState<GmvFieldOption>(() => normalizeGmvField(readStorage(STORAGE.gmvField, 'currentGmv')));
  const [metricVisible, setMetricVisible] = useState<MetricCardKey[]>(() =>
    normalizeMetricKeys(readStorage(STORAGE.metricVisible, defaultVisible), defaultVisible),
  );
  const [metricOrder, setMetricOrder] = useState<MetricCardKey[]>(() =>
    normalizeMetricOrder(readStorage(STORAGE.metricOrder, allMetricsOrder)),
  );
  const [dayViewMode, setDayViewMode] = useState<DayViewMode>(
    () => ((readStorage<string>(STORAGE.dayViewMode, 'attendance') === 'completion') ? 'completion' : 'attendance'),
  );
  const [overviewChartTab, setOverviewChartTab] = useState<OverviewChartTab>(
    () => normalizeOverviewChartTab(readStorage(STORAGE.chartTab, 'all')),
  );
  const [overviewChartDisplayMode, setOverviewChartDisplayMode] = useState<OverviewChartDisplayMode>(
    () => normalizeOverviewChartDisplayMode(readStorage(STORAGE.chartDisplayMode, 'list')),
  );
  const [resultLegendHidden, setResultLegendHidden] = useState<Record<string, boolean>>(() =>
    normalizeLegendHidden(readStorage(STORAGE.resultLegendHidden, {}), resultTrendDefs),
  );
  const [effLegendHidden, setEffLegendHidden] = useState<Record<string, boolean>>(() =>
    normalizeLegendHidden(readStorage(STORAGE.effLegendHidden, {}), efficiencyTrendDefs),
  );
  const [resultLegendNotice, setResultLegendNotice] = useState('');
  const [effLegendNotice, setEffLegendNotice] = useState('');
  const [dayLegendNotice, setDayLegendNotice] = useState('');
  const [resultFilter, setResultFilter] = useState<MiniFilter>(() => normalizeMiniFilter(readStorage(STORAGE.resultFilter, emptyMiniFilter)));
  const [effFilter, setEffFilter] = useState<MiniFilter>(() => normalizeMiniFilter(readStorage(STORAGE.effFilter, emptyMiniFilter)));
  const [dayFilter, setDayFilter] = useState<MiniFilter>(() => normalizeMiniFilter(readStorage(STORAGE.dayFilter, emptyMiniFilter)));
  const [dayLegendAttend, setDayLegendAttend] = useState<Record<string, boolean>>(
    () => normalizeDayLegendVisibility(readStorage(STORAGE.dayLegendAttend, DAY_ATTEND_DEFAULT_VISIBILITY), DAY_ATTEND_DEFAULT_VISIBILITY),
  );
  const [dayLegendComplete, setDayLegendComplete] = useState<Record<string, boolean>>(
    () => normalizeDayLegendVisibility(readStorage(STORAGE.dayLegendComplete, DAY_COMPLETE_DEFAULT_VISIBILITY), DAY_COMPLETE_DEFAULT_VISIBILITY),
  );
  const [bMetricVisible, setBMetricVisible] = useState<BMetricCardKey[]>(
    () => normalizeBMetricKeys(readStorage(STORAGE.bMetricVisible, bMetricDefaultVisible), bMetricDefaultVisible),
  );
  const [bMetricOrder, setBMetricOrder] = useState<BMetricCardKey[]>(
    () => normalizeBMetricOrder(readStorage(STORAGE.bMetricOrder, bMetricAllOrder)),
  );
  const [bCompareBusinessVisible, setBCompareBusinessVisible] = useState<CompareMetricKey[]>(
    () =>
      normalizeCompareMetricKeys(
        readStorage(STORAGE.bCompareBusinessVisible, defaultBusinessCompareVisible),
        defaultBusinessCompareVisible,
      ),
  );
  const [bCompareAttendanceVisible, setBCompareAttendanceVisible] = useState<CompareMetricKey[]>(
    () =>
      normalizeCompareMetricKeys(
        readStorage(STORAGE.bCompareAttendanceVisible, defaultAttendanceCompareVisible),
        defaultAttendanceCompareVisible,
      ),
  );
  const [bConversionFilter, setBConversionFilter] = useState<{ campaign: string[]; productType: string[] }>(
    () => normalizeBConversionFilter(readStorage(STORAGE.bConversionFilter, {})),
  );
  const [favoriteOwners, setFavoriteOwners] = useState<string[]>(() => normalizeStringArray(readStorage(STORAGE.personalFavoriteOwners, [])));
  const [showFavoriteOwnersPanel, setShowFavoriteOwnersPanel] = useState(false);
  const [favoriteDraft, setFavoriteDraft] = useState<string[]>([]);
  const [favoriteQuery, setFavoriteQuery] = useState('');
  const [bConversionLegendHidden, setBConversionLegendHidden] = useState<Record<string, boolean>>(
    () => normalizeLegendHidden(readStorage(STORAGE.bConversionLegend, {}), bConversionTrendDefs),
  );
  const [bConversionNotice, setBConversionNotice] = useState('');

  const applyFavoriteOwners = (syncGlobalChannelOwner: boolean) => {
    const validOwners = favoriteOwners.filter((owner) => owners.includes(owner));
    onOwnerSelectionChange(validOwners);
    if (syncGlobalChannelOwner) {
      onApplyFavoriteOwnersToGlobalFilter?.(validOwners);
    }
  };

  useEffect(() => writeStorage(STORAGE.metricVisible, metricVisible), [metricVisible]);
  useEffect(() => writeStorage(STORAGE.metricOrder, metricOrder), [metricOrder]);
  useEffect(() => writeStorage(STORAGE.gmvField, gmvField), [gmvField]);
  useEffect(() => writeStorage(STORAGE.resultLegendHidden, resultLegendHidden), [resultLegendHidden]);
  useEffect(() => writeStorage(STORAGE.effLegendHidden, effLegendHidden), [effLegendHidden]);
  useEffect(() => writeStorage(STORAGE.resultFilter, resultFilter), [resultFilter]);
  useEffect(() => writeStorage(STORAGE.effFilter, effFilter), [effFilter]);
  useEffect(() => writeStorage(STORAGE.dayFilter, dayFilter), [dayFilter]);
  useEffect(() => writeStorage(STORAGE.chartTab, overviewChartTab), [overviewChartTab]);
  useEffect(() => writeStorage(STORAGE.chartDisplayMode, overviewChartDisplayMode), [overviewChartDisplayMode]);
  useEffect(() => writeStorage(STORAGE.dayViewMode, dayViewMode), [dayViewMode]);
  useEffect(() => writeStorage(STORAGE.dayLegendAttend, dayLegendAttend), [dayLegendAttend]);
  useEffect(() => writeStorage(STORAGE.dayLegendComplete, dayLegendComplete), [dayLegendComplete]);
  useEffect(() => writeStorage(STORAGE.bMetricVisible, bMetricVisible), [bMetricVisible]);
  useEffect(() => writeStorage(STORAGE.bMetricOrder, bMetricOrder), [bMetricOrder]);
  useEffect(() => writeStorage(STORAGE.bCompareBusinessVisible, bCompareBusinessVisible), [bCompareBusinessVisible]);
  useEffect(() => writeStorage(STORAGE.bCompareAttendanceVisible, bCompareAttendanceVisible), [bCompareAttendanceVisible]);
  useEffect(() => writeStorage(STORAGE.bConversionFilter, bConversionFilter), [bConversionFilter]);
  useEffect(() => writeStorage(STORAGE.bConversionLegend, bConversionLegendHidden), [bConversionLegendHidden]);
  useEffect(() => writeStorage(STORAGE.personalFavoriteOwners, favoriteOwners), [favoriteOwners]);

  const overall = summarizeRows(rows, gmvField);
  const owners = Array.from(new Set(rows.map((row) => row.channelOwner || '未填写'))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const personalRows = ownerSelection.length ? rows.filter((row) => ownerSelection.includes(row.channelOwner || '未填写')) : rows;
  const personal = summarizeRows(personalRows, gmvField);
  const campaignTrend = buildCampaignTrend(rows, gmvField);

  const visibleOrderedMetrics = metricOrder.filter((key) => metricVisible.includes(key));
  const showModuleA = mode !== 'module-b';
  const showModuleB = mode !== 'module-a';
  const visibleBMetricOrder = bMetricOrder.filter((key) => bMetricVisible.includes(key));
  const businessCompareDefs = compareMetricDefs.filter((item) => bCompareBusinessVisible.includes(item.key));
  const attendanceCompareDefs = compareMetricDefs.filter((item) => bCompareAttendanceVisible.includes(item.key));

  const filteredChartRows = applyMiniFilter(rows, resultFilter);
  const resultTrend = buildCampaignTrend(filteredChartRows, gmvField);
  const effTrend = buildCampaignTrend(filteredChartRows, gmvField);
  const dayTrend = buildCampaignTrend(filteredChartRows, gmvField);

  const resultTrendData = resultTrend.map((item) => ({
    campaign: item.campaign,
    leads: item.metrics.leads,
    conversionRate: item.metrics.conversionRate,
  }));

  const efficiencyTrendData = effTrend.map((item) => ({
    campaign: item.campaign,
    cost: item.metrics.cost,
    day7Gmv: item.metrics.day7Gmv,
    totalGmv: item.metrics.totalGmv,
  }));

  const dayByCampaignData = dayTrend.map((item) => ({
    campaign: item.campaign,
    d1Attend: item.metrics.dAttendanceRates[1],
    d2Attend: item.metrics.dAttendanceRates[2],
    d3Attend: item.metrics.dAttendanceRates[3],
    d4Attend: item.metrics.dAttendanceRates[4],
    d5Attend: item.metrics.dAttendanceRates[5],
    d6Attend: item.metrics.dAttendanceRates[6],
    d1Complete: item.metrics.dCompletionRates[1],
    d2Complete: item.metrics.dCompletionRates[2],
    d3Complete: item.metrics.dCompletionRates[3],
    d4Complete: item.metrics.dCompletionRates[4],
    d5Complete: item.metrics.dCompletionRates[5],
    d6Complete: item.metrics.dCompletionRates[6],
  }));

  const filteredOverallChartRows = rows.filter(
    (row) =>
      (!bConversionFilter.productType.length || bConversionFilter.productType.includes(row.productType || '未填写')) &&
      (!bConversionFilter.campaign.length || bConversionFilter.campaign.includes(row.campaign || '未填写')),
  );
  const filteredPersonalChartRows = personalRows.filter(
    (row) =>
      (!bConversionFilter.productType.length || bConversionFilter.productType.includes(row.productType || '未填写')) &&
      (!bConversionFilter.campaign.length || bConversionFilter.campaign.includes(row.campaign || '未填写')),
  );
  const overallConversionTrend = buildCampaignTrend(filteredOverallChartRows, gmvField);
  const personalConversionTrend = buildCampaignTrend(filteredPersonalChartRows, gmvField);

  const personalVsOverallConversionTrend = overallConversionTrend
    .map((item) => {
      const p = personalConversionTrend.find((trend) => trend.campaign === item.campaign)?.metrics;
      return {
        campaign: item.campaign,
        overallConversion: item.metrics.conversionRate,
        personalConversion: p?.conversionRate ?? null,
        personalLeads: p?.leads ?? null,
      };
    });

  useEffect(() => {
    if (!showModuleB) return;
    if (!favoriteOwners.length) return;
    const valid = favoriteOwners.filter((owner) => owners.includes(owner));
    onOwnerSelectionChange(valid);
  }, [showModuleB, upload?.id]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = metricOrder.indexOf(active.id as MetricCardKey);
    const newIndex = metricOrder.indexOf(over.id as MetricCardKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setMetricOrder(arrayMove(metricOrder, oldIndex, newIndex));
  };

  const onBMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id).replace('b-metric-', '') as BMetricCardKey;
    const overKey = String(over.id).replace('b-metric-', '') as BMetricCardKey;
    const oldIndex = bMetricOrder.indexOf(activeKey);
    const newIndex = bMetricOrder.indexOf(overKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setBMetricOrder(arrayMove(bMetricOrder, oldIndex, newIndex));
  };

  const applyOverviewChartFilter = (next: MiniFilter) => {
    setResultFilter(next);
    setEffFilter(next);
    setDayFilter(next);
  };

  return (
    <div className="space-y-5">
      {showModuleA ? (
        <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">SKU 汇总经营情况</h2>
            <p className="text-xs text-muted">拖动指标卡可调整顺序，配置会自动保存。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setFavoriteDraft(favoriteOwners);
                setFavoriteQuery('');
                setShowFavoriteOwnersPanel((prev) => !prev);
              }}
            >
              常用归属设置
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => applyFavoriteOwners(true)}
            >
              恢复常用筛选
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowFormulaPanel((prev) => !prev)}
            >
              公式检测
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowMetricSettings((prev) => !prev)}
            >
              <Settings2 size={14} />
              指标设置
            </button>
          </div>
        </div>

        <OverviewSummaryCard leads={overall.leads} totalGmv={overall.totalGmv} />

        {showFavoriteOwnersPanel ? (
          <div className="panel p-3">
            <div className="mb-2 text-sm font-medium text-ink">固定关注渠道归属</div>
            <div className="mb-2 text-xs text-slate-600">保存后可用于恢复常用筛选，并同步到全局「渠道归属」筛选。</div>
            <input
              value={favoriteQuery}
              onChange={(event) => setFavoriteQuery(event.target.value)}
              placeholder="搜索渠道归属人"
              className="mb-2 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
                onClick={() => {
                  const visible = owners.filter((owner) => normalize(owner).includes(normalize(favoriteQuery)));
                  setFavoriteDraft((prev) => Array.from(new Set([...prev, ...visible])));
                }}
              >
                全选
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
                onClick={() => setFavoriteDraft([])}
              >
                清空
              </button>
            </div>
            <div className="max-h-[196px] overflow-y-auto rounded border border-slate-200 bg-white p-1.5 filter-scroll">
              {owners.filter((owner) => normalize(owner).includes(normalize(favoriteQuery))).map((owner) => {
                const active = favoriteDraft.includes(owner);
                return (
                  <label key={owner} className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-sky-50">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => setFavoriteDraft((prev) => (active ? prev.filter((item) => item !== owner) : [...prev, owner]))}
                    />
                    <span className="truncate">{owner}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => setShowFavoriteOwnersPanel(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100"
                onClick={() => {
                  const saved = favoriteDraft.filter((owner) => owners.includes(owner));
                  setFavoriteOwners(saved);
                  onOwnerSelectionChange(saved);
                  setShowFavoriteOwnersPanel(false);
                }}
              >
                保存
              </button>
            </div>
          </div>
        ) : null}

        {showFormulaPanel ? (
          <FormulaPanel
            upload={upload}
            gmvField={gmvField}
            onGmvFieldChange={setGmvField}
            summary={overall}
          />
        ) : null}

        {showMetricSettings ? (
          <div className="panel p-3">
            <div className="mb-2 text-sm font-medium text-ink">选择展示指标</div>
            <div className="flex flex-wrap gap-2">
              {allMetricsOrder.map((key) => {
                const active = metricVisible.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                    onClick={() =>
                      setMetricVisible((prev) =>
                        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
                      )
                    }
                  >
                    {metricLabels[key]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={metricOrder} strategy={rectSortingStrategy}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {visibleOrderedMetrics.map((key) => (
                <SortableMetricCard key={key} id={key}>
                  <MetricCard
                    label={metricLabels[key]}
                    value={formatMetricCardValue(overall, key)}
                    metricKey={key}
                    tone={defaultVisible.includes(key) ? 'highlight' : 'neutral'}
                    hint={key === 'd1Attend' ? '用于判断渠道初始质量' : key === 'd4Attend' ? '用于判断首个转化日承接' : undefined}
                  />
                </SortableMetricCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="space-y-4">
        <div className="panel bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid w-full flex-1 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2 lg:grid-cols-[0.8fr_1.45fr_1.45fr_1.9fr]">
            {[
              { key: 'all' as const, label: '全部' },
              { key: 'result' as const, label: '经营结果趋势（营期）' },
              { key: 'efficiency' as const, label: '经营效率趋势（营期）' },
              { key: 'day' as const, label: 'D1～D6 到完课营期波动趋势' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setOverviewChartTab(item.key)}
                className={`h-10 w-full rounded-xl px-3 py-2 text-sm transition ${
                  overviewChartTab === item.key
                    ? 'bg-[#2f7bf6] font-semibold text-white shadow-sm ring-1 ring-[#2a6edf]'
                    : 'font-medium text-slate-600 hover:bg-white/70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              title="列表视图"
              onClick={() => setOverviewChartDisplayMode('list')}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${overviewChartDisplayMode === 'list' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              title="卡片视图"
              onClick={() => setOverviewChartDisplayMode('card')}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${overviewChartDisplayMode === 'card' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
          <div className="mt-3">
            <ChartFilterBar rows={rows} filter={resultFilter} onFilterChange={applyOverviewChartFilter} />
          </div>
        </div>

        {(overviewChartTab === 'all' || overviewChartTab === 'result') ? (
          <ChartCard title="经营结果趋势（营期）" subtitle="观察各营期 leads 数与转化率的变化，可点击图例聚焦单一指标。">
            <AxisLineChart
              data={resultTrendData}
              defs={resultTrendDefs}
              legendHidden={resultLegendHidden}
              notice={resultLegendNotice}
              onLegendToggle={(key) =>
                setResultLegendHidden((prev) => {
                  const visibleCount = resultTrendDefs.filter((item) => !prev[item.key]).length;
                  if (!prev[key] && visibleCount <= 1) {
                    setResultLegendNotice('至少保留一个显示指标。');
                    return prev;
                  }
                  setResultLegendNotice('');
                  return { ...prev, [key]: !prev[key] };
                })
              }
              onResetDefault={() => {
                setResultLegendHidden({});
                setResultLegendNotice('');
              }}
            />
          </ChartCard>
        ) : null}

        {(overviewChartTab === 'all' || overviewChartTab === 'efficiency') ? (
          <ChartCard title="经营效率趋势（营期）" subtitle="观察各营期消耗总金额、day7当期成交GMV与总成交额的变化关系，可点击图例聚焦单一指标。">
            <AxisLineChart
              data={efficiencyTrendData}
              defs={efficiencyTrendDefs}
              legendHidden={effLegendHidden}
              notice={effLegendNotice}
              onLegendToggle={(key) =>
                setEffLegendHidden((prev) => {
                  const visibleCount = efficiencyTrendDefs.filter((item) => !prev[item.key]).length;
                  if (!prev[key] && visibleCount <= 1) {
                    setEffLegendNotice('至少保留一个显示指标。');
                    return prev;
                  }
                  setEffLegendNotice('');
                  return { ...prev, [key]: !prev[key] };
                })
              }
              onResetDefault={() => {
                setEffLegendHidden({});
                setEffLegendNotice('');
              }}
            />
          </ChartCard>
        ) : null}

        {(overviewChartTab === 'all' || overviewChartTab === 'day') ? (
          <ChartCard
            title="D1～D6 到完课营期波动趋势｜重点观察 D1 渠道质量与 D4 转化日承接"
            subtitle="以营期为横轴，观察每个营期在 D1～D6 单天到课率 / 完课率上的波动变化。"
          >
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-1.5 text-xs ${dayViewMode === 'attendance' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                onClick={() => setDayViewMode('attendance')}
              >
                到课率视图
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-1.5 text-xs ${dayViewMode === 'completion' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                onClick={() => setDayViewMode('completion')}
              >
                完课率视图
              </button>
            </div>
            <DayTrendChart
              data={dayByCampaignData}
              mode={dayViewMode}
              notice={dayLegendNotice}
              legendHidden={dayViewMode === 'attendance' ? dayLegendAttend : dayLegendComplete}
              onLegendToggle={(key) => {
                if (dayViewMode === 'attendance') {
                  setDayLegendAttend((prev) => {
                    const keys = Object.keys(DAY_ATTEND_DEFAULT_VISIBILITY);
                    const visibleCount = keys.filter((k) => prev[k]).length;
                    if (prev[key] && visibleCount <= 1) {
                      setDayLegendNotice('至少保留一个显示指标。');
                      return prev;
                    }
                    setDayLegendNotice('');
                    return { ...prev, [key]: !prev[key] };
                  });
                }
                if (dayViewMode === 'completion') {
                  setDayLegendComplete((prev) => {
                    const keys = Object.keys(DAY_COMPLETE_DEFAULT_VISIBILITY);
                    const visibleCount = keys.filter((k) => prev[k]).length;
                    if (prev[key] && visibleCount <= 1) {
                      setDayLegendNotice('至少保留一个显示指标。');
                      return prev;
                    }
                    setDayLegendNotice('');
                    return { ...prev, [key]: !prev[key] };
                  });
                }
              }}
              onResetDefault={() => {
                setDayLegendNotice('');
                if (dayViewMode === 'attendance') setDayLegendAttend({ ...DAY_ATTEND_DEFAULT_VISIBILITY });
                if (dayViewMode === 'completion') setDayLegendComplete({ ...DAY_COMPLETE_DEFAULT_VISIBILITY });
              }}
            />
          </ChartCard>
        ) : null}
      </section>
        </>
      ) : null}

      {showModuleB ? (
        <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">个人经营情况</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowBFormulaPanel((prev) => !prev)}
            >
              公式检测
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowBMetricSettings((prev) => !prev)}
            >
              <Settings2 size={14} />
              指标设置
            </button>
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-ink">个人 / 渠道归属</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-line px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setFavoriteDraft(favoriteOwners);
                  setFavoriteQuery('');
                  setShowFavoriteOwnersPanel((prev) => !prev);
                }}
              >
                常用归属设置
              </button>
              <button
                type="button"
                className="rounded-md border border-line px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  applyFavoriteOwners(true);
                }}
              >
                恢复常用筛选
              </button>
            </div>
          </div>
          {showFavoriteOwnersPanel ? (
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs text-slate-600">固定关注人群（保存后可在每次加载时默认套用）</div>
              <input
                value={favoriteQuery}
                onChange={(event) => setFavoriteQuery(event.target.value)}
                placeholder="搜索渠道归属人"
                className="mb-2 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
                  onClick={() => {
                    const visible = owners.filter((owner) => normalize(owner).includes(normalize(favoriteQuery)));
                    setFavoriteDraft((prev) => Array.from(new Set([...prev, ...visible])));
                  }}
                >
                  全选
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
                  onClick={() => setFavoriteDraft([])}
                >
                  清空
                </button>
              </div>
              <div className="max-h-[196px] overflow-y-auto rounded border border-slate-200 bg-white p-1.5 filter-scroll">
                {owners.filter((owner) => normalize(owner).includes(normalize(favoriteQuery))).map((owner) => {
                  const active = favoriteDraft.includes(owner);
                  return (
                    <label key={owner} className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-sky-50">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => setFavoriteDraft((prev) => (active ? prev.filter((item) => item !== owner) : [...prev, owner]))}
                      />
                      <span className="truncate">{owner}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowFavoriteOwnersPanel(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100"
                  onClick={() => {
                    const saved = favoriteDraft.filter((owner) => owners.includes(owner));
                    setFavoriteOwners(saved);
                    onOwnerSelectionChange(saved);
                    setShowFavoriteOwnersPanel(false);
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-md border px-3 py-1.5 text-xs ${ownerSelection.length === 0 ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
              onClick={() => onOwnerSelectionChange([])}
            >
              全部个人
            </button>
            {owners.map((owner) => {
              const active = ownerSelection.includes(owner);
              return (
                <button
                  key={owner}
                  type="button"
                  onClick={() =>
                    onOwnerSelectionChange(active ? ownerSelection.filter((item) => item !== owner) : [...ownerSelection, owner])
                  }
                  className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                >
                  {owner}
                </button>
              );
            })}
          </div>
        </div>

        {showBFormulaPanel ? (
          <FormulaPanel upload={upload} gmvField={gmvField} onGmvFieldChange={setGmvField} summary={personal} />
        ) : null}

        {showBMetricSettings ? (
          <div className="panel p-3">
            <div className="mb-2 text-sm font-medium text-ink">选择模块 B 展示指标</div>
            <div className="flex flex-wrap gap-2">
              {bMetricAllOrder.map((key) => {
                const active = bMetricVisible.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                    onClick={() =>
                      setBMetricVisible((prev) =>
                        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
                      )
                    }
                  >
                    {bMetricLabels[key]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBMetricDragEnd}>
          <SortableContext items={bMetricOrder.map((key) => `b-metric-${key}`)} strategy={rectSortingStrategy}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {visibleBMetricOrder.map((key) => (
                <SortableMetricCard key={key} id={`b-metric-${key}`}>
                  <MetricCard
                    label={bMetricLabels[key]}
                    value={formatBMetricCardValue(personal, key)}
                    metricKey={key}
                    tone={bMetricDefaultVisible.includes(key) ? 'highlight' : 'neutral'}
                  />
                </SortableMetricCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">大盘 vs 个人对比</h3>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">经营指标</h4>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setShowBusinessCompareSettings((prev) => !prev)}
              >
                指标设置
              </button>
            </div>
            {showBusinessCompareSettings ? (
              <div className="panel p-3">
                <div className="flex flex-wrap gap-2">
                  {compareMetricDefs
                    .filter((item) => defaultBusinessCompareVisible.includes(item.key))
                    .map((item) => {
                      const active = bCompareBusinessVisible.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                          onClick={() =>
                            setBCompareBusinessVisible((prev) =>
                              prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key],
                            )
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}
            {businessCompareDefs.length === 0 ? (
              <div className="panel flex items-center justify-between p-4">
                <div className="text-sm text-slate-600">当前经营指标未选择，请至少开启一个指标。</div>
                <button
                  type="button"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
                  onClick={() => setBCompareBusinessVisible([...defaultBusinessCompareVisible])}
                >
                  恢复默认指标
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {businessCompareDefs.map((item) => {
                  const base = pickMetric(overall, item.key);
                  const mine = pickMetric(personal, item.key);
                  const diff = base === null || mine === null ? null : mine - base;
                  const tone =
                    item.trend === 'neutral'
                      ? 'text-slate-600'
                      : diff === null
                        ? 'text-muted'
                        : item.trend === 'higher'
                          ? diff > 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                          : diff < 0
                            ? 'text-emerald-700'
                            : 'text-rose-700';
                  const statusText =
                    item.trend === 'neutral'
                      ? '中性指标'
                      : diff === null
                        ? ''
                        : item.trend === 'higher'
                          ? diff > 0
                            ? '高于大盘'
                            : '低于大盘'
                          : diff < 0
                            ? '优于大盘'
                            : '弱于大盘';
                  const visual = getCompareVisual(item.key, item.trend, diff);
                  const Icon = visual.icon;
                  return (
                    <div key={item.key} className={`panel rounded-2xl border p-3 ${visual.panel}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${visual.iconWrap}`}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="text-slate-600">大盘：{formatCompareValue(item.key, base)}</div>
                        <div className="text-slate-700">个人：{formatCompareValue(item.key, mine)}</div>
                        <div className={tone}>
                          差值：{formatCompareDiff(item.key, diff)} {statusText}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">到完课率</h4>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setShowAttendanceCompareSettings((prev) => !prev)}
              >
                指标设置
              </button>
            </div>
            {showAttendanceCompareSettings ? (
              <div className="panel p-3">
                <div className="flex flex-wrap gap-2">
                  {compareMetricDefs
                    .filter((item) => defaultAttendanceCompareVisible.includes(item.key))
                    .map((item) => {
                      const active = bCompareAttendanceVisible.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                          onClick={() =>
                            setBCompareAttendanceVisible((prev) =>
                              prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key],
                            )
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}
            {attendanceCompareDefs.length === 0 ? (
              <div className="panel flex items-center justify-between p-4">
                <div className="text-sm text-slate-600">当前到完课率指标未选择，请至少开启一个指标。</div>
                <button
                  type="button"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
                  onClick={() => setBCompareAttendanceVisible([...defaultAttendanceCompareVisible])}
                >
                  恢复默认指标
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {attendanceCompareDefs.map((item) => {
                const base = pickMetric(overall, item.key);
                const mine = pickMetric(personal, item.key);
                const diff = base === null || mine === null ? null : mine - base;
                const tone =
                  item.trend === 'neutral'
                    ? 'text-slate-600'
                    : diff === null
                      ? 'text-muted'
                      : item.trend === 'higher'
                        ? diff > 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                        : diff < 0
                          ? 'text-emerald-700'
                          : 'text-rose-700';
                const statusText =
                  item.trend === 'neutral'
                    ? '中性指标'
                    : diff === null
                      ? ''
                      : item.trend === 'higher'
                        ? diff > 0
                          ? '高于大盘'
                          : '低于大盘'
                        : diff < 0
                          ? '优于大盘'
                          : '弱于大盘';
                const visual = getCompareVisual(item.key, item.trend, diff);
                const Icon = visual.icon;
                return (
                  <div key={item.key} className={`panel rounded-2xl border p-3 ${visual.panel}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${visual.iconWrap}`}>
                        <Icon size={14} />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="text-slate-600">大盘：{formatCompareValue(item.key, base)}</div>
                      <div className="text-slate-700">个人：{formatCompareValue(item.key, mine)}</div>
                      <div className={tone}>
                        差值：{formatCompareDiff(item.key, diff)} {statusText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        </div>
      </section>

      <ChartCard title="个人与大盘转化率对比（营期）" subtitle="观察当前个人在各营期转化率是否高于大盘，可点击图例聚焦。">
        <div className="mb-3 grid gap-2 rounded-lg border border-sky-100 bg-slate-50/70 p-2 md:grid-cols-2">
          <MiniMultiSelect
            label="营期"
            options={unique(campaignTrend.map((item) => item.campaign))}
            value={bConversionFilter.campaign}
            onChange={(next) => setBConversionFilter((prev) => ({ ...prev, campaign: next }))}
          />
          <MiniMultiSelect
            label="产品类型"
            options={unique(rows.map((row) => row.productType || '未填写'))}
            value={bConversionFilter.productType}
            onChange={(next) => setBConversionFilter((prev) => ({ ...prev, productType: next }))}
          />
        </div>
        <AxisLineChart
          data={personalVsOverallConversionTrend}
          defs={bConversionTrendDefs}
          legendHidden={bConversionLegendHidden}
          notice={bConversionNotice}
          onLegendToggle={(key) =>
            setBConversionLegendHidden((prev) => {
              const visibleCount = bConversionTrendDefs.filter((item) => !prev[item.key]).length;
              if (!prev[key] && visibleCount <= 1) {
                setBConversionNotice('至少保留一个显示指标。');
                return prev;
              }
              setBConversionNotice('');
              return { ...prev, [key]: !prev[key] };
            })
          }
          onResetDefault={() => {
            setBConversionLegendHidden({});
            setBConversionNotice('');
          }}
        />
      </ChartCard>
        </>
      ) : null}
    </div>
  );
}

function SortableMetricCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'opacity-70' : ''}>
      {children}
    </div>
  );
}

function OverviewSummaryCard({ leads, totalGmv }: { leads: number; totalGmv: number }) {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.max(0, Math.min(100, (currentDay / Math.max(daysInMonth, 1)) * 100));
  const monthLabel = `${now.getMonth() + 1}月进度`;
  const progressX = 8 + (96 * monthProgress) / 100;
  const weekMarks = [8, 32, 56, 80, 104];

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-[#f2fbf8] via-[#eef8ff] to-[#f7fbff] p-4 shadow-sm">
      <div className="flex flex-wrap items-stretch justify-between gap-4">
        <div className="flex min-w-[240px] flex-1 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">本期经营摘要</div>
            <div className="mt-0.5 text-xs text-slate-500">快速查看本期规模与总成交产出。</div>
          </div>
          <div className="ml-2 hidden rounded-xl border border-white/80 bg-white/80 px-2 py-1.5 md:block">
            <svg width="120" height="38" viewBox="0 0 112 38" fill="none" aria-hidden>
              <line x1="8" y1="24" x2="104" y2="24" stroke="#dbeafe" strokeWidth="3" strokeLinecap="round" />
              <line x1="8" y1="24" x2={progressX} y2="24" stroke="#5b8def" strokeWidth="3.2" strokeLinecap="round" />
              {weekMarks.map((x) => (
                <circle key={x} cx={x} cy="24" r="1.6" fill="#bfdbfe" />
              ))}
              <circle cx={progressX} cy="24" r="3" fill="#34d399" />
            </svg>
            <div className="mt-0.5 text-[11px] text-slate-500">{monthLabel} {currentDay}/{daysInMonth}</div>
          </div>
        </div>
        <div className="min-w-[240px] rounded-xl border border-white/80 bg-white/90 px-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">leads数</div>
              <div className="mt-1 text-2xl font-semibold text-slate-800 tabular-nums">{formatMoney(leads)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">总成交额</div>
              <div className="mt-1 text-2xl font-semibold text-slate-800 tabular-nums">{formatMoney(totalGmv)}</div>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#34d399]" style={{ width: `${monthProgress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AxisLineChart({
  data,
  defs,
  legendHidden,
  notice,
  onLegendToggle,
  onResetDefault,
}: {
  data: Array<Record<string, string | number | null>>;
  defs: ChartLineDef[];
  legendHidden: Record<string, boolean>;
  notice?: string;
  onLegendToggle: (key: string) => void;
  onResetDefault: () => void;
}) {
  const activeLines = defs.filter((item) => !legendHidden[item.key]);
  const leftType = activeLines.find((item) => item.axis === 'left')?.type || 'number';
  const rightType = activeLines.find((item) => item.axis === 'right')?.type || 'number';
  const leftLabel = activeLines.filter((item) => item.axis === 'left').map((item) => item.label).join(' / ') || '左轴';
  const rightLabel = activeLines.filter((item) => item.axis === 'right').map((item) => item.label).join(' / ') || '右轴';

  if (!data.length) return <div className="py-16 text-center text-sm text-muted">暂无可展示数据</div>;
  if (!activeLines.length) {
    return (
      <div className="flex h-[392px] items-center justify-center pt-1">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-sm font-medium text-slate-700">当前图表暂无显示指标，请至少开启一个指标。</div>
          <button
            type="button"
            className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
            onClick={onResetDefault}
          >
            恢复默认指标
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[392px] pt-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-amber-600">{notice || ' '}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {defs.map((item) => {
            const active = !legendHidden[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onLegendToggle(item.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 transition-colors hover:bg-slate-50"
                style={{
                  color: active ? item.color : '#94a3b8',
                  opacity: active ? 1 : 0.55,
                  background: active ? '#ffffff' : '#f8fafc',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    display: 'inline-block',
                    background: active ? item.color : '#cbd5e1',
                  }}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
          <XAxis
            dataKey="campaign"
            angle={-35}
            textAnchor="end"
            height={98}
            interval={0}
            minTickGap={8}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => axisTickFormat(value as number, leftType)}
            tick={{ fill: '#64748b', fontSize: 12 }}
            label={{ value: leftLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => axisTickFormat(value as number, rightType)}
            tick={{ fill: '#64748b', fontSize: 12 }}
            label={{ value: rightLabel, angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="mb-1 font-medium text-ink">营期：{label}</div>
                  {payload.map((entry) => {
                    const type = defs.find((item) => item.label === entry.name)?.type || 'number';
                    return (
                      <div key={entry.dataKey as string} className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
                        <span className="text-slate-600">{entry.name}：</span>
                        <span className="tabular-nums text-ink">{lineValueFormat(Number(entry.value), type)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {activeLines.map((item) => (
            <Line
              key={item.key}
              yAxisId={item.axis === 'right' ? 'right' : 'left'}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2.2}
              dot={{ r: 3.6, strokeWidth: 0, fill: item.color }}
              activeDot={{ r: 5.5 }}
              connectNulls
            >
              <LabelList
                dataKey={item.key}
                position="top"
                fontSize={12}
                fill={item.color}
                opacity={0.92}
                formatter={(value: number) => pointLabelFormat(value, item.type)}
              />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DayTrendChart({
  data,
  mode,
  notice,
  legendHidden,
  onLegendToggle,
  onResetDefault,
}: {
  data: Array<Record<string, string | number | null>>;
  mode: DayViewMode;
  notice?: string;
  legendHidden: Record<string, boolean>;
  onLegendToggle: (key: string) => void;
  onResetDefault: () => void;
}) {
  const items =
    mode === 'attendance'
      ? [
          { key: 'd1Attend', label: 'D1到课率', color: '#0284c7', strong: true },
          { key: 'd2Attend', label: 'D2到课率', color: '#60a5fa', strong: false },
          { key: 'd3Attend', label: 'D3到课率', color: '#93c5fd', strong: false },
          { key: 'd4Attend', label: 'D4到课率', color: '#16a34a', strong: true },
          { key: 'd5Attend', label: 'D5到课率', color: '#86efac', strong: false },
          { key: 'd6Attend', label: 'D6到课率', color: '#bbf7d0', strong: false },
        ]
      : [
          { key: 'd1Complete', label: 'D1完课率', color: '#0284c7', strong: true },
          { key: 'd2Complete', label: 'D2完课率', color: '#60a5fa', strong: false },
          { key: 'd3Complete', label: 'D3完课率', color: '#93c5fd', strong: false },
          { key: 'd4Complete', label: 'D4完课率', color: '#16a34a', strong: true },
          { key: 'd5Complete', label: 'D5完课率', color: '#86efac', strong: false },
          { key: 'd6Complete', label: 'D6完课率', color: '#bbf7d0', strong: false },
        ];

  const visible = items.filter((item) => legendHidden[item.key]);
  if (!data.length) return <div className="py-16 text-center text-sm text-muted">暂无可展示数据</div>;
  if (!visible.length) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-sm font-medium text-slate-700">当前图表暂无显示指标，请至少开启一个指标。</div>
          <button
            type="button"
            className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
            onClick={onResetDefault}
          >
            恢复默认指标
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[392px] pt-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-amber-600">{notice || ' '}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {items.map((item) => {
            const active = legendHidden[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onLegendToggle(item.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 transition-colors hover:bg-slate-50"
                style={{ color: active ? item.color : '#94a3b8', opacity: active ? 1 : 0.55, background: active ? '#ffffff' : '#f8fafc' }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: active ? item.color : '#cbd5e1' }} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
          <XAxis
            dataKey="campaign"
            angle={-35}
            textAnchor="end"
            height={98}
            interval={0}
            minTickGap={8}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis tickFormatter={(value) => formatPercent(Number(value), 1)} tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="mb-1 font-medium text-ink">营期：{label}</div>
                  {payload.map((entry) => (
                    <div key={entry.dataKey as string} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-slate-600">{entry.name}：</span>
                      <span className="tabular-nums text-ink">{formatPercent(Number(entry.value), 2)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {visible.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={item.strong ? 2.8 : 1.6}
              strokeOpacity={item.strong ? 1 : 0.72}
              dot={{ r: 3.4, strokeWidth: 0, fill: item.color }}
              activeDot={{ r: 5.3 }}
              connectNulls
            >
              <LabelList dataKey={item.key} position="top" fontSize={12} fill={item.color} formatter={(value: number) => formatPercent(value, 1)} />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function FormulaPanel({
  upload,
  gmvField,
  onGmvFieldChange,
  summary,
}: {
  upload?: UploadRecord;
  gmvField: GmvFieldOption;
  onGmvFieldChange: (field: GmvFieldOption) => void;
  summary: MetricSummary;
}) {
  const gmvLabel = gmvField === 'currentGmv' ? '当期成交GMV' : gmvField === 'day7Gmv' ? 'day7当期成交GMV' : '总成交额';
  const map = upload?.mapping || {};
  const fields = {
    currentGmv: !!map.currentGmv,
    day7Gmv: !!map.day7Gmv,
    totalGmv: !!map.totalGmv,
    cost: !!map.cost,
    leads: !!map.leads,
  };
  const status = (value: number | null, denominator?: number, requiredFieldOk = true) => {
    if (!requiredFieldOk) return '字段缺失';
    if (denominator !== undefined && denominator === 0) return '分母为 0';
    if (value === null) return '结果为空';
    return '正常';
  };

  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span>成交 GMV 计算字段：</span>
        <select className="rounded border border-line px-2 py-1 text-sm" value={gmvField} onChange={(e) => onGmvFieldChange(e.target.value as GmvFieldOption)}>
          <option value="currentGmv">当期成交GMV</option>
          <option value="day7Gmv">day7当期成交GMV</option>
          <option value="totalGmv">总成交额</option>
        </select>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">指标</th>
              <th className="px-2 py-2 text-left">当前公式</th>
              <th className="px-2 py-2 text-left">使用字段</th>
              <th className="px-2 py-2 text-right">当前计算结果</th>
              <th className="px-2 py-2 text-left">字段状态</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="px-2 py-2">转化率</td>
              <td className="px-2 py-2">{gmvLabel} / 2980 / leads数</td>
              <td className="px-2 py-2">{gmvLabel}、leads数</td>
              <td className="px-2 py-2 text-right">{formatPercent(summary.conversionRate, 2)}</td>
              <td className="px-2 py-2">{status(summary.conversionRate, summary.leads, fields.leads && fields[gmvField])}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="px-2 py-2">ROI</td>
              <td className="px-2 py-2">{gmvLabel} / 消耗总金额</td>
              <td className="px-2 py-2">{gmvLabel}、消耗总金额</td>
              <td className="px-2 py-2 text-right">{formatRatio(summary.roi, 2)}</td>
              <td className="px-2 py-2">{status(summary.roi, summary.cost, fields.cost && fields[gmvField])}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="px-2 py-2">R值</td>
              <td className="px-2 py-2">{gmvLabel} / leads数</td>
              <td className="px-2 py-2">{gmvLabel}、leads数</td>
              <td className="px-2 py-2 text-right">{formatMoney(summary.rValue, 1)}</td>
              <td className="px-2 py-2">{status(summary.rValue, summary.leads, fields.leads && fields[gmvField])}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="px-2 py-2">费比</td>
              <td className="px-2 py-2">消耗总金额 / {gmvLabel}</td>
              <td className="px-2 py-2">消耗总金额、{gmvLabel}</td>
              <td className="px-2 py-2 text-right">{formatPercent(summary.costRate, 2)}</td>
              <td className="px-2 py-2">{status(summary.costRate, summary.gmv, fields.cost && fields[gmvField])}</td>
            </tr>
            <tr className="border-t border-line">
              <td className="px-2 py-2">leads成本</td>
              <td className="px-2 py-2">消耗总金额 / leads数</td>
              <td className="px-2 py-2">消耗总金额、leads数</td>
              <td className="px-2 py-2 text-right">{formatMoney(summary.leadCost)}</td>
              <td className="px-2 py-2">{status(summary.leadCost, summary.leads, fields.cost && fields.leads)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartFilterBar({
  rows,
  filter,
  onFilterChange,
}: {
  rows: StandardRow[];
  filter: MiniFilter;
  onFilterChange: (next: MiniFilter) => void;
}) {
  const fields: Array<{ key: keyof MiniFilter; label: string; values: string[] }> = [
    { key: 'campaign', label: '营期', values: unique(rows.map((r) => r.campaign || '未填写')) },
    { key: 'channelOwner', label: '渠道归属', values: unique(rows.map((r) => r.channelOwner || '未填写')) },
    { key: 'channelId', label: '渠道ID', values: unique(rows.map((r) => r.channelId || '未填写')) },
    { key: 'productType', label: '产品类型', values: unique(rows.map((r) => r.productType || '未填写')) },
  ];
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 md:grid-cols-2 xl:grid-cols-4">
      {fields.map((field) => (
        <MiniMultiSelect
          key={field.key}
          label={field.label}
          options={field.values}
          value={filter[field.key]}
          onChange={(next) => onFilterChange({ ...filter, [field.key]: next })}
        />
      ))}
    </div>
  );
}

function MiniMultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = options.filter((item) => normalize(item).includes(normalize(query)));
  const summary = value.length ? `${label}（已选 ${value.length}）` : `${label}（全部）`;
  return (
    <details className="group relative rounded-lg">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 group-open:border-sky-300 group-open:ring-2 group-open:ring-sky-100">
        <span className="truncate">{summary}</span>
        <span className="text-slate-400">▾</span>
      </summary>
      <div className="absolute left-0 right-0 z-20 mt-1 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`搜索${label}`}
          className="h-8 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
        />
        <div className="flex items-center gap-1">
          <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50" onClick={() => onChange(Array.from(new Set([...value, ...visible])))}>
            全选
          </button>
          <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50" onClick={() => onChange([])}>
            清空
          </button>
        </div>
        <div className="max-h-[196px] overflow-auto rounded-md border border-slate-200 p-1 filter-scroll">
          {visible.length === 0 ? <div className="px-2 py-1 text-xs text-slate-400">无匹配项</div> : null}
          {visible.map((item) => (
            <label key={item} className="flex h-7 items-center gap-2 rounded px-1.5 text-xs hover:bg-sky-50">
              <input
                type="checkbox"
                checked={value.includes(item)}
                onChange={() => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item])}
              />
              <span className="truncate">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function pickMetric(summary: MetricSummary, key: CompareMetricKey): number | null {
  if (key === 'd1Attend') return summary.dAttendanceRates[1];
  if (key === 'd1Complete') return summary.dCompletionRates[1];
  if (key === 'd2Attend') return summary.dAttendanceRates[2];
  if (key === 'd2Complete') return summary.dCompletionRates[2];
  if (key === 'd3Attend') return summary.dAttendanceRates[3];
  if (key === 'd3Complete') return summary.dCompletionRates[3];
  if (key === 'd4Attend') return summary.dAttendanceRates[4];
  if (key === 'd4Complete') return summary.dCompletionRates[4];
  if (key === 'd5Attend') return summary.dAttendanceRates[5];
  if (key === 'd5Complete') return summary.dCompletionRates[5];
  if (key === 'd6Attend') return summary.dAttendanceRates[6];
  if (key === 'd6Complete') return summary.dCompletionRates[6];
  if (key === 'leads') return summary.leads;
  if (key === 'cost') return summary.cost;
  if (key === 'currentGmv') return summary.currentGmv;
  if (key === 'day7Gmv') return summary.day7Gmv;
  if (key === 'totalGmv') return summary.totalGmv;
  if (key === 'leadCost') return summary.leadCost;
  if (key === 'conversionRate') return summary.conversionRate;
  if (key === 'roi') return summary.roi;
  if (key === 'costRate') return summary.costRate;
  if (key === 'rValue') return summary.rValue;
  return null;
}

function formatMetricCardValue(summary: MetricSummary, key: MetricCardKey): string {
  switch (key) {
    case 'leads':
      return formatMoney(summary.leads);
    case 'cost':
      return formatMoney(summary.cost);
    case 'gmv':
      return formatMoney(summary.day7Gmv);
    case 'totalGmv':
      return formatMoney(summary.totalGmv);
    case 'conversionRate':
      return formatPercent(summary.conversionRate, 2);
    case 'roi':
      return formatRatio(summary.roi);
    case 'costRate':
      return formatPercent(summary.costRate, 2);
    case 'leadCost':
      return formatMoney(summary.leadCost);
    case 'rValue':
      return formatMoney(summary.rValue, 1);
    case 'd1Attend':
      return formatPercent(summary.dAttendanceRates[1], 2);
    case 'd1Complete':
      return formatPercent(summary.dCompletionRates[1], 2);
    case 'd2Attend':
      return formatPercent(summary.dAttendanceRates[2], 2);
    case 'd2Complete':
      return formatPercent(summary.dCompletionRates[2], 2);
    case 'd3Attend':
      return formatPercent(summary.dAttendanceRates[3], 2);
    case 'd3Complete':
      return formatPercent(summary.dCompletionRates[3], 2);
    case 'd4Attend':
      return formatPercent(summary.dAttendanceRates[4], 2);
    case 'd4Complete':
      return formatPercent(summary.dCompletionRates[4], 2);
    case 'd5Attend':
      return formatPercent(summary.dAttendanceRates[5], 2);
    case 'd5Complete':
      return formatPercent(summary.dCompletionRates[5], 2);
    case 'd6Attend':
      return formatPercent(summary.dAttendanceRates[6], 2);
    case 'd6Complete':
      return formatPercent(summary.dCompletionRates[6], 2);
    default:
      return '-';
  }
}

function formatBMetricCardValue(summary: MetricSummary, key: BMetricCardKey): string {
  switch (key) {
    case 'leads':
      return formatMoney(summary.leads);
    case 'cost':
      return formatMoney(summary.cost);
    case 'currentGmv':
      return formatMoney(summary.currentGmv);
    case 'day7Gmv':
      return formatMoney(summary.day7Gmv);
    case 'totalGmv':
      return formatMoney(summary.totalGmv);
    case 'leadCost':
      return formatMoney(summary.leadCost);
    case 'conversionRate':
      return formatPercent(summary.conversionRate, 2);
    case 'roi':
      return formatRatio(summary.roi);
    case 'costRate':
      return formatPercent(summary.costRate, 2);
    case 'rValue':
      return formatMoney(summary.rValue, 1);
    case 'd1Attend':
      return formatPercent(summary.dAttendanceRates[1], 2);
    case 'd1Complete':
      return formatPercent(summary.dCompletionRates[1], 2);
    case 'd2Attend':
      return formatPercent(summary.dAttendanceRates[2], 2);
    case 'd2Complete':
      return formatPercent(summary.dCompletionRates[2], 2);
    case 'd3Attend':
      return formatPercent(summary.dAttendanceRates[3], 2);
    case 'd3Complete':
      return formatPercent(summary.dCompletionRates[3], 2);
    case 'd4Attend':
      return formatPercent(summary.dAttendanceRates[4], 2);
    case 'd4Complete':
      return formatPercent(summary.dCompletionRates[4], 2);
    case 'd5Attend':
      return formatPercent(summary.dAttendanceRates[5], 2);
    case 'd5Complete':
      return formatPercent(summary.dCompletionRates[5], 2);
    case 'd6Attend':
      return formatPercent(summary.dAttendanceRates[6], 2);
    case 'd6Complete':
      return formatPercent(summary.dCompletionRates[6], 2);
    default:
      return '-';
  }
}

function formatCompareValue(key: CompareMetricKey, value: number | null): string {
  const def = compareMetricDefs.find((item) => item.key === key);
  if (!def) return '-';
  if (def.type === 'percent') return formatPercent(value, 2);
  if (def.type === 'money') return formatMoney(value, key === 'rValue' ? 1 : 0);
  if (key === 'roi') return formatRatio(value, 2);
  return formatMoney(value, 0);
}

function formatCompareDiff(key: CompareMetricKey, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const def = compareMetricDefs.find((item) => item.key === key);
  if (!def) return '-';
  if (def.type === 'percent') return formatSignedDelta(value, true);
  if (key === 'roi') return formatSignedDelta(value, false);
  return formatSignedDelta(value, false);
}

function getCompareVisual(
  key: CompareMetricKey,
  trend: 'higher' | 'lower' | 'neutral',
  diff: number | null,
): { panel: string; iconWrap: string; icon: typeof UserPlus } {
  const isPositive =
    trend === 'neutral'
      ? null
      : diff === null
        ? null
        : trend === 'higher'
          ? diff > 0
          : diff < 0;

  if (isPositive === true) {
    return {
      panel: 'bg-[#ecfdf5] border-[#a7f3d0]',
      iconWrap: 'bg-white border-[#a7f3d0] text-[#059669]',
      icon: pickCompareIcon(key),
    };
  }

  if (isPositive === false) {
    return {
      panel: 'bg-[#fef2f2] border-[#fecaca]',
      iconWrap: 'bg-white border-[#fecaca] text-[#dc2626]',
      icon: pickCompareIcon(key),
    };
  }

  return {
    panel: 'bg-[#f8fafc] border-[#cbd5e1]',
    iconWrap: 'bg-white border-[#cbd5e1] text-[#334155]',
    icon: pickCompareIcon(key),
  };
}

function pickCompareIcon(key: CompareMetricKey): typeof UserPlus {
  if (key === 'leads') return UserPlus;
  if (key === 'cost') return Wallet;
  if (key === 'currentGmv' || key === 'day7Gmv') return TrendingUp;
  if (key === 'totalGmv') return CircleDollarSign;
  if (key === 'conversionRate') return Target;
  if (key === 'roi') return Activity;
  if (key === 'costRate') return Percent;
  if (key === 'rValue') return Gauge;
  if (key === 'leadCost') return Calculator;
  if (key.includes('complete')) return CheckCircle2;
  return BarChart3;
}

function axisTickFormat(value: number, type: 'number' | 'percent' | 'money') {
  if (!Number.isFinite(value)) return '-';
  if (type === 'percent') return `${(value * 100).toFixed(0)}%`;
  if (type === 'money') return formatMoney(value);
  return formatMoney(value);
}

function pointLabelFormat(value: number, type: 'number' | 'percent' | 'money') {
  if (!Number.isFinite(value)) return '-';
  if (type === 'percent') return formatPercent(value, 1);
  if (type === 'money') return formatMoney(value);
  return formatMoney(value);
}

function lineValueFormat(value: number, type: 'number' | 'percent' | 'money') {
  if (type === 'percent') return formatPercent(value, 2);
  if (type === 'money') return formatMoney(value);
  return formatMoney(value);
}

function LineWrap({ data, children }: { data: Array<Record<string, string | number | null>>; children: ReactNode }) {
  if (!data.length) return <div className="py-16 text-center text-sm text-muted">暂无可展示数据</div>;
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="campaign" />
          <YAxis />
          <Tooltip />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function normalizeMetricKeys(input: unknown, fallback: MetricCardKey[]): MetricCardKey[] {
  if (!Array.isArray(input)) return fallback;
  const allowed = new Set(allMetricsOrder);
  const cleaned = input.filter((item): item is MetricCardKey => typeof item === 'string' && allowed.has(item as MetricCardKey));
  return cleaned.length ? cleaned : fallback;
}

function normalizeMetricOrder(input: unknown): MetricCardKey[] {
  const base = normalizeMetricKeys(input, allMetricsOrder);
  const set = new Set(base);
  const merged = [...base];
  allMetricsOrder.forEach((key) => {
    if (!set.has(key)) merged.push(key);
  });
  return merged;
}

function normalizeBMetricKeys(input: unknown, fallback: BMetricCardKey[]): BMetricCardKey[] {
  if (!Array.isArray(input)) return fallback;
  const allowed = new Set(bMetricAllOrder);
  const cleaned = input.filter((item): item is BMetricCardKey => typeof item === 'string' && allowed.has(item as BMetricCardKey));
  return cleaned.length ? cleaned : fallback;
}

function normalizeBMetricOrder(input: unknown): BMetricCardKey[] {
  const base = normalizeBMetricKeys(input, bMetricAllOrder);
  const set = new Set(base);
  const merged = [...base];
  bMetricAllOrder.forEach((key) => {
    if (!set.has(key)) merged.push(key);
  });
  return merged;
}

function normalizeCompareMetricKeys(input: unknown, fallback: CompareMetricKey[]): CompareMetricKey[] {
  if (!Array.isArray(input)) return fallback;
  const allowed = new Set(compareMetricDefs.map((item) => item.key));
  const cleaned = input.filter((item): item is CompareMetricKey => typeof item === 'string' && allowed.has(item as CompareMetricKey));
  return cleaned.length ? cleaned : fallback;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is string => typeof item === 'string');
}

function normalizeBConversionFilter(input: unknown): { campaign: string[]; productType: string[] } {
  if (Array.isArray(input)) {
    return { campaign: normalizeStringArray(input), productType: [] };
  }
  if (!input || typeof input !== 'object') return { campaign: [], productType: [] };
  const raw = input as { campaign?: unknown; productType?: unknown };
  return {
    campaign: normalizeStringArray(raw.campaign),
    productType: normalizeStringArray(raw.productType),
  };
}

function normalizeOverviewChartTab(input: unknown): OverviewChartTab {
  if (input === 'all' || input === 'result' || input === 'efficiency' || input === 'day') return input;
  return 'all';
}

function normalizeOverviewChartDisplayMode(input: unknown): OverviewChartDisplayMode {
  return input === 'card' ? 'card' : 'list';
}

function normalizeGmvField(input: unknown): GmvFieldOption {
  if (input === 'currentGmv' || input === 'day7Gmv' || input === 'totalGmv') return input;
  return 'currentGmv';
}

function normalizeMiniFilter(input: unknown): MiniFilter {
  if (!input || typeof input !== 'object') return emptyMiniFilter;
  const raw = input as Partial<Record<keyof MiniFilter, unknown>>;
  const toArr = (v: unknown) => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []);
  return {
    campaign: toArr(raw.campaign),
    channelOwner: toArr(raw.channelOwner),
    channelId: toArr(raw.channelId),
    productType: toArr(raw.productType),
  };
}

function normalizeLegendHidden(input: unknown, defs: ChartLineDef[]): Record<string, boolean> {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const next: Record<string, boolean> = {};
  defs.forEach((item) => {
    next[item.key] = raw[item.key] === true;
  });
  const allHidden = defs.length > 0 && defs.every((item) => next[item.key]);
  return allHidden ? {} : next;
}

function normalizeDayLegendVisibility(input: unknown, defaults: Record<string, boolean>): Record<string, boolean> {
  if (!input || typeof input !== 'object') return { ...defaults };
  const raw = input as Record<string, unknown>;
  const next: Record<string, boolean> = {};
  Object.keys(defaults).forEach((key) => {
    next[key] = raw[key] === true;
  });
  const anyVisible = Object.keys(next).some((key) => next[key]);
  return anyVisible ? next : { ...defaults };
}

function applyMiniFilter(rows: StandardRow[], filter: MiniFilter): StandardRow[] {
  const match = (value: string, selected: string[]) => !selected.length || selected.includes(value || '未填写');
  return rows.filter(
    (row) =>
      match(row.campaign, filter.campaign) &&
      match(row.channelOwner, filter.channelOwner) &&
      match(row.channelId, filter.channelId) &&
      match(row.productType, filter.productType),
  );
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, '');
}
