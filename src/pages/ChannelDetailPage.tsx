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
import { Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from 'react';
import {
  Cell,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { exportCsv } from '../lib/exportCsv';
import {
  type ChannelDetailFilters,
  type ChannelDetailRow,
  type ChannelDetailSummary,
  type ChannelDetailUploadRecord,
  applyChannelDetailFilters,
  buildChannelCampaignTrend,
  channelDetailFilterOptions,
  emptyChannelDetailFilters,
  summarizeChannelDetailRows,
} from '../lib/channelDetail';
import { formatMoney, formatPercent, formatRatio, safeDivide } from '../lib/formatters';
import { readStorage, writeStorage } from '../lib/storage';

const STORAGE = {
  filters: 'channelDetail_filters',
  chartConfig: 'channelDetail_chartConfig',
  filterPanelCollapsed: 'channelDetail_filterPanelCollapsed',
  filterFieldCollapsed: 'channelDetail_filterFieldCollapsed',
  favoriteOwners: 'channelDetailFavoriteOwners',
  metricCardConfig: 'channelDetail_metricCardConfig',
  metricCardOrder: 'channelDetail_metricCardOrder',
  blockOneTab: 'channelDetail_blockOneTab',
  ownerTableSort: 'channelDetail_ownerTableSort',
  channelTableSort: 'channelDetail_channelTableSort',
  ownerTableViewMode: 'channelDetail_ownerTableViewMode',
  channelTableViewMode: 'channelDetail_channelTableViewMode',
  channelHeatmapTopN: 'channelDetail_channel_heatmap_topn',
  structureScope: 'channelDetail_structure_scope',
  structurePanelVisible: 'channelDetail_structurePanelVisible',
  breakdownActiveTab: 'channelDetail_breakdownActiveTab',
  tableColumnWidths: 'channelDetail_tableColumnWidths',
};

type DimensionKey = 'owner' | 'channelId' | 'category';
type HeatmapSortKey = 'closedRate' | 'd4Rate' | 'followRatio';
type BlockOneTab = 'all' | 'day' | 'current' | 'ratio';
type GmvHeatmapSortKey =
  | 'currentRate'
  | 'followRate'
  | 'closedRate'
  | 'd4gmv'
  | 'd5gmv'
  | 'd6gmv'
  | 'd7gmv'
  | 'd8gmv'
  | 'd9gmv'
  | 'd10gmv'
  | 'd4Rate'
  | 'd5Rate'
  | 'd6Rate'
  | 'd7Rate'
  | 'd8Rate'
  | 'd9Rate'
  | 'd10Rate'
  | 'currentGmv'
  | 'followGmv'
  | 'closedGmv'
  | 'followRatio';
type ChannelTopN = 10 | 20 | 50 | 'all';
type StructureScope = 'latest' | 'filtered';
type TableViewMode = 'gmv' | 'conversion';
type BreakdownTab = 'owner' | 'channel';
type TableSortField =
  | 'leads'
  | 'currentRate'
  | 'followRate'
  | 'closedRate'
  | 'd4gmv'
  | 'd5gmv'
  | 'd6gmv'
  | 'd7gmv'
  | 'd8gmv'
  | 'd9gmv'
  | 'd10gmv'
  | 'd4Rate'
  | 'd5Rate'
  | 'd6Rate'
  | 'd7Rate'
  | 'd8Rate'
  | 'd9Rate'
  | 'd10Rate'
  | 'currentGmv'
  | 'followGmv'
  | 'closedGmv'
  | 'followRatio';
const TABLE_COLUMN_IDS = [
  'dimension',
  'leads',
  'd4',
  'd5',
  'd6',
  'd7',
  'current',
  'd8',
  'd9',
  'd10',
  'follow',
  'closed',
  'followRatio',
] as const;
type TableColumnId = (typeof TABLE_COLUMN_IDS)[number];
type TableColumnWidths = Record<TableColumnId, number>;
const DEFAULT_TABLE_COLUMN_WIDTHS: TableColumnWidths = {
  dimension: 148,
  leads: 116,
  d4: 112,
  d5: 112,
  d6: 112,
  d7: 112,
  current: 140,
  d8: 112,
  d9: 112,
  d10: 112,
  follow: 128,
  closed: 144,
  followRatio: 116,
};
type TableSortState = {
  field: TableSortField;
  direction: 'desc' | 'asc';
};

type ChartConfig = {
  dayRateVisible: Record<string, boolean>;
  gmvVisible: Record<string, boolean>;
  ratioVisible: Record<string, boolean>;
  currentRateVisible: Record<string, boolean>;
  dimension: DimensionKey;
  heatmapSort: HeatmapSortKey;
};

type FieldCollapseState = Record<keyof ChannelDetailFilters, boolean>;
type ChannelMetricKey =
  | 'leads'
  | 'currentRate'
  | 'followRate'
  | 'closedRate'
  | 'cost'
  | 'leadCost'
  | 'currentGmv'
  | 'followGmv'
  | 'closedGmv'
  | 'closedRoi'
  | 'closedCostRate'
  | 'closedRValue'
  | 'followRatio'
  | 'd4Rate'
  | 'd5Rate'
  | 'd6Rate'
  | 'd7Rate'
  | 'd8Rate'
  | 'd9Rate'
  | 'd10Rate';

const DEFAULT_DAY_RATE_VISIBLE: Record<string, boolean> = {
  d4Rate: true,
  d5Rate: false,
  d6Rate: false,
  d7Rate: true,
  d8Rate: false,
  d9Rate: false,
  d10Rate: true,
};

const DEFAULT_GMV_VISIBLE: Record<string, boolean> = {
  currentGmv: true,
  followGmv: true,
  closedGmv: true,
};

const DEFAULT_RATIO_VISIBLE: Record<string, boolean> = {
  followRatio: true,
};
const DEFAULT_CURRENT_RATE_VISIBLE: Record<string, boolean> = {
  currentShare: true,
};

const DEFAULT_CHART_CONFIG: ChartConfig = {
  dayRateVisible: DEFAULT_DAY_RATE_VISIBLE,
  gmvVisible: DEFAULT_GMV_VISIBLE,
  ratioVisible: DEFAULT_RATIO_VISIBLE,
  currentRateVisible: DEFAULT_CURRENT_RATE_VISIBLE,
  dimension: 'owner',
  heatmapSort: 'closedRate',
};

const DEFAULT_FIELD_COLLAPSED: FieldCollapseState = {
  campaign: false,
  owner: false,
  channelId: false,
  category: false,
  startDate: true,
  closeDate: true,
};

const CHANNEL_METRIC_ORDER: ChannelMetricKey[] = [
  'leads',
  'currentRate',
  'followRate',
  'closedRate',
  'cost',
  'leadCost',
  'currentGmv',
  'followGmv',
  'closedGmv',
  'closedRoi',
  'closedCostRate',
  'closedRValue',
  'followRatio',
  'd4Rate',
  'd5Rate',
  'd6Rate',
  'd7Rate',
  'd8Rate',
  'd9Rate',
  'd10Rate',
];

const CHANNEL_METRIC_DEFAULT_VISIBLE: ChannelMetricKey[] = ['leads', 'currentRate', 'followRate', 'closedRate'];

const CHANNEL_METRIC_LABELS: Record<ChannelMetricKey, string> = {
  leads: 'leads数',
  currentRate: '当期转化率',
  followRate: '追单转化率',
  closedRate: '封板转化率',
  cost: '消耗',
  leadCost: 'leads成本',
  currentGmv: '当期成交GMV',
  followGmv: '追单GMV',
  closedGmv: '封板成交GMV',
  closedRoi: '封板ROI',
  closedCostRate: '封板费比',
  closedRValue: '封板R值',
  followRatio: '追单占比',
  d4Rate: 'D4转化率',
  d5Rate: 'D5转化率',
  d6Rate: 'D6转化率',
  d7Rate: 'D7转化率',
  d8Rate: 'D8转化率',
  d9Rate: 'D9转化率',
  d10Rate: 'D10转化率',
};

const DAY_KEYS: Array<4 | 5 | 6 | 7 | 8 | 9 | 10> = [4, 5, 6, 7, 8, 9, 10];
const DAY_GMV_KEYS = ['d4gmv', 'd5gmv', 'd6gmv', 'd7gmv', 'd8gmv', 'd9gmv', 'd10gmv'] as const;
type DayGmvKey = (typeof DAY_GMV_KEYS)[number];

interface ChannelDetailPageProps {
  rows: ChannelDetailRow[];
  upload?: ChannelDetailUploadRecord;
  viewMode?: 'all' | 'block1' | 'block2';
}

export function ChannelDetailPage({ rows, upload, viewMode = 'all' }: ChannelDetailPageProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [filters, setFilters] = useState<ChannelDetailFilters>(() =>
    normalizeFilters(readStorage(STORAGE.filters, emptyChannelDetailFilters())),
  );
  const [chartConfig, setChartConfig] = useState<ChartConfig>(() =>
    normalizeChartConfig(readStorage(STORAGE.chartConfig, DEFAULT_CHART_CONFIG)),
  );
  const [favoriteOwners, setFavoriteOwners] = useState<string[]>(() =>
    normalizeStringArray(readStorage(STORAGE.favoriteOwners, [])),
  );
  const [showFavoriteOwnersPanel, setShowFavoriteOwnersPanel] = useState(false);
  const [favoriteDraft, setFavoriteDraft] = useState<string[]>([]);
  const [favoriteQuery, setFavoriteQuery] = useState('');
  const [showMetricFormula, setShowMetricFormula] = useState(false);
  const [showDayFormula, setShowDayFormula] = useState(false);
  const [showCurrentFormula, setShowCurrentFormula] = useState(false);
  const [showRatioFormula, setShowRatioFormula] = useState(false);
  const [blockOneTab, setBlockOneTab] = useState<BlockOneTab>(
    () => normalizeBlockOneTab(readStorage(STORAGE.blockOneTab, 'all')),
  );
  const [ownerTableSort, setOwnerTableSort] = useState<TableSortState>(
    () => normalizeTableSort(readStorage(STORAGE.ownerTableSort, { field: 'leads', direction: 'desc' })),
  );
  const [channelTableSort, setChannelTableSort] = useState<TableSortState>(
    () => normalizeTableSort(readStorage(STORAGE.channelTableSort, { field: 'leads', direction: 'desc' })),
  );
  const [ownerTableViewMode, setOwnerTableViewMode] = useState<TableViewMode>(
    () => normalizeTableViewMode(readStorage(STORAGE.ownerTableViewMode, 'gmv')),
  );
  const [channelTableViewMode, setChannelTableViewMode] = useState<TableViewMode>(
    () => normalizeTableViewMode(readStorage(STORAGE.channelTableViewMode, 'gmv')),
  );
  const [channelTopN, setChannelTopN] = useState<ChannelTopN>(
    () => normalizeTopN(readStorage(STORAGE.channelHeatmapTopN, 10)),
  );
  const [structureScope, setStructureScope] = useState<StructureScope>(
    () => normalizeStructureScope(readStorage(STORAGE.structureScope, 'latest')),
  );
  const [structurePanelVisible, setStructurePanelVisible] = useState<boolean>(
    () => normalizeBool(readStorage(STORAGE.structurePanelVisible, true), true),
  );
  const [breakdownActiveTab, setBreakdownActiveTab] = useState<BreakdownTab>(
    () => normalizeBreakdownTab(readStorage(STORAGE.breakdownActiveTab, 'owner')),
  );
  const [showMetricSettings, setShowMetricSettings] = useState(false);
  const [metricVisible, setMetricVisible] = useState<ChannelMetricKey[]>(
    () => normalizeMetricKeys(readStorage(STORAGE.metricCardConfig, CHANNEL_METRIC_DEFAULT_VISIBLE), CHANNEL_METRIC_DEFAULT_VISIBLE),
  );
  const [metricOrder, setMetricOrder] = useState<ChannelMetricKey[]>(
    () => normalizeMetricOrder(readStorage(STORAGE.metricCardOrder, CHANNEL_METRIC_ORDER)),
  );
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(
    () => normalizeBool(readStorage(STORAGE.filterPanelCollapsed, false), false),
  );
  const [fieldCollapsed, setFieldCollapsed] = useState<FieldCollapseState>(() =>
    normalizeFieldCollapsed(readStorage(STORAGE.filterFieldCollapsed, DEFAULT_FIELD_COLLAPSED)),
  );
  const [queries, setQueries] = useState<Partial<Record<keyof ChannelDetailFilters, string>>>({});
  const [tableColumnWidths, setTableColumnWidths] = useState<TableColumnWidths>(() =>
    normalizeTableColumnWidths(readStorage(STORAGE.tableColumnWidths, DEFAULT_TABLE_COLUMN_WIDTHS)),
  );

  useEffect(() => writeStorage(STORAGE.filters, filters), [filters]);
  useEffect(() => writeStorage(STORAGE.chartConfig, chartConfig), [chartConfig]);
  useEffect(() => writeStorage(STORAGE.filterPanelCollapsed, panelCollapsed), [panelCollapsed]);
  useEffect(() => writeStorage(STORAGE.filterFieldCollapsed, fieldCollapsed), [fieldCollapsed]);
  useEffect(() => writeStorage(STORAGE.favoriteOwners, favoriteOwners), [favoriteOwners]);
  useEffect(() => writeStorage(STORAGE.metricCardConfig, metricVisible), [metricVisible]);
  useEffect(() => writeStorage(STORAGE.metricCardOrder, metricOrder), [metricOrder]);
  useEffect(() => writeStorage(STORAGE.blockOneTab, blockOneTab), [blockOneTab]);
  useEffect(() => writeStorage(STORAGE.ownerTableSort, ownerTableSort), [ownerTableSort]);
  useEffect(() => writeStorage(STORAGE.channelTableSort, channelTableSort), [channelTableSort]);
  useEffect(() => writeStorage(STORAGE.ownerTableViewMode, ownerTableViewMode), [ownerTableViewMode]);
  useEffect(() => writeStorage(STORAGE.channelTableViewMode, channelTableViewMode), [channelTableViewMode]);
  useEffect(() => writeStorage(STORAGE.channelHeatmapTopN, channelTopN), [channelTopN]);
  useEffect(() => writeStorage(STORAGE.structureScope, structureScope), [structureScope]);
  useEffect(() => writeStorage(STORAGE.structurePanelVisible, structurePanelVisible), [structurePanelVisible]);
  useEffect(() => writeStorage(STORAGE.breakdownActiveTab, breakdownActiveTab), [breakdownActiveTab]);
  useEffect(() => writeStorage(STORAGE.tableColumnWidths, tableColumnWidths), [tableColumnWidths]);

  const options = useMemo(() => channelDetailFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => applyChannelDetailFilters(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarizeChannelDetailRows(filteredRows), [filteredRows]);
  const campaignTrend = useMemo(() => buildChannelCampaignTrend(filteredRows), [filteredRows]);

  const dayRateData = useMemo(
    () =>
      campaignTrend.map((item) => ({
        campaign: item.campaign,
        d4Rate: item.summary.d4Rate,
        d5Rate: item.summary.d5Rate,
        d6Rate: item.summary.d6Rate,
        d7Rate: item.summary.d7Rate,
        d8Rate: item.summary.d8Rate,
        d9Rate: item.summary.d9Rate,
        d10Rate: item.summary.d10Rate,
      })),
    [campaignTrend],
  );

  const followRatioData = useMemo(
    () =>
      campaignTrend.map((item) => ({
        campaign: item.campaign,
        followRatio: item.summary.followRatio,
      })),
    [campaignTrend],
  );
  const currentShareData = useMemo(
    () =>
      campaignTrend.map((item) => ({
        campaign: item.campaign,
        currentShare:
          item.summary.closedGmv > 0
            ? item.summary.currentGmv / item.summary.closedGmv
            : null,
      })),
    [campaignTrend],
  );
  const latestCampaignPoint = campaignTrend.length ? campaignTrend[campaignTrend.length - 1] : null;
  const structureSummary = structureScope === 'latest' ? latestCampaignPoint?.summary ?? null : summary;
  const structureData = useMemo(() => {
    if (!structureSummary) return null;
    const current = structureSummary.currentGmv;
    const follow = structureSummary.followGmv;
    const total = structureSummary.closedGmv;
    if (!Number.isFinite(total) || total <= 0) return null;
    return {
      currentGmv: current,
      followGmv: follow,
      totalGmv: total,
      currentRatio: current / total,
      followRatio: follow / total,
    };
  }, [structureSummary]);

  const ownerHeatmapRows = useMemo(
    () => sortDayGmvTableRows(buildDayGmvHeatmapRows(filteredRows, 'owner'), ownerTableSort),
    [filteredRows, ownerTableSort],
  );
  const ownerHeatmapMax = useMemo(() => getHeatmapMaxValue(ownerHeatmapRows), [ownerHeatmapRows]);

  const channelHeatmapRows = useMemo(() => {
    const rowsByChannel = sortDayGmvTableRows(buildDayGmvHeatmapRows(filteredRows, 'channelId'), channelTableSort);
    if (channelTopN === 'all') return rowsByChannel;
    return rowsByChannel.slice(0, channelTopN);
  }, [filteredRows, channelTableSort, channelTopN]);
  const channelHeatmapMax = useMemo(() => getHeatmapMaxValue(channelHeatmapRows), [channelHeatmapRows]);

  const dayRateDefs = [
    { key: 'd4Rate', label: 'D4转化率', color: '#1d4ed8' },
    { key: 'd5Rate', label: 'D5转化率', color: '#3b82f6' },
    { key: 'd6Rate', label: 'D6转化率', color: '#60a5fa' },
    { key: 'd7Rate', label: 'D7转化率', color: '#0f766e' },
    { key: 'd8Rate', label: 'D8转化率', color: '#14b8a6' },
    { key: 'd9Rate', label: 'D9转化率', color: '#2dd4bf' },
    { key: 'd10Rate', label: 'D10转化率', color: '#5eead4' },
  ] as const;

  const ratioDefs = [{ key: 'followRatio', label: '追单占比', color: '#7c3aed' }] as const;
  const currentShareDefs = [{ key: 'currentShare', label: '当期成交占比', color: '#2563eb' }] as const;

  useEffect(() => {
    if (!rows.length) return;
    if (!favoriteOwners.length) return;
    const valid = favoriteOwners.filter((owner) => options.owner.includes(owner));
    setFilters((prev) => {
      const sameLength = prev.owner.length === valid.length;
      const sameItems = sameLength && prev.owner.every((item, index) => item === valid[index]);
      if (sameItems) return prev;
      return { ...prev, owner: valid };
    });
  }, [upload?.id]);

  useEffect(() => {
    if (upload) return;
    setFilters(emptyChannelDetailFilters());
    setMetricVisible([...CHANNEL_METRIC_DEFAULT_VISIBLE]);
    setMetricOrder([...CHANNEL_METRIC_ORDER]);
    setShowMetricSettings(false);
    setShowMetricFormula(false);
    setShowDayFormula(false);
    setShowCurrentFormula(false);
    setShowRatioFormula(false);
    setBlockOneTab('all');
    setOwnerTableSort({ field: 'leads', direction: 'desc' });
    setChannelTableSort({ field: 'leads', direction: 'desc' });
    setOwnerTableViewMode('gmv');
    setChannelTableViewMode('gmv');
    setChannelTopN(10);
    setStructureScope('latest');
    setStructurePanelVisible(true);
    setBreakdownActiveTab('owner');
  }, [upload?.id, upload]);

  const visibleMetricOrder = metricOrder.filter((key) => metricVisible.includes(key));

  const onMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = metricOrder.indexOf(active.id as ChannelMetricKey);
    const newIndex = metricOrder.indexOf(over.id as ChannelMetricKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setMetricOrder(arrayMove(metricOrder, oldIndex, newIndex));
  };
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <section className="panel bg-white p-8 text-center">
          <div className="text-base font-medium text-slate-700">请先上传渠道经营明细数据表</div>
          <div className="mt-2 text-sm text-slate-500">该页面使用独立数据源，不会调用首页 / 个人页数据。</div>
        </section>
      ) : (
        <>
          <ChannelDetailFilterPanel
            rows={rows}
            filters={filters}
            options={options}
            panelCollapsed={panelCollapsed}
            fieldCollapsed={fieldCollapsed}
            queries={queries}
            onPanelCollapsedChange={setPanelCollapsed}
            onFieldCollapsedChange={setFieldCollapsed}
            onQueriesChange={setQueries}
            onChange={setFilters}
            favoriteOwners={favoriteOwners}
            showFavoriteOwnersPanel={showFavoriteOwnersPanel}
            favoriteDraft={favoriteDraft}
            favoriteQuery={favoriteQuery}
            onFavoriteOwnersChange={setFavoriteOwners}
            onShowFavoriteOwnersPanelChange={setShowFavoriteOwnersPanel}
            onFavoriteDraftChange={setFavoriteDraft}
            onFavoriteQueryChange={setFavoriteQuery}
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">D4～D10 转化核心指标</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMetricFormula((prev) => !prev)}
                >
                  <Settings2 size={14} />
                  公式校验
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
            {showMetricFormula ? <ChannelFormulaPanel mode="metric-core" summary={summary} upload={upload} /> : null}
            {showMetricSettings ? (
              <div className="panel p-3">
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_METRIC_ORDER.map((key) => {
                    const active = metricVisible.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`rounded-md border px-3 py-1.5 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
                        onClick={() =>
                          setMetricVisible((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
                        }
                      >
                        {CHANNEL_METRIC_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {visibleMetricOrder.length === 0 ? (
              <div className="panel flex items-center justify-between p-4">
                <div className="text-sm text-slate-600">当前未选择指标，请至少开启一个指标。</div>
                <button
                  type="button"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
                  onClick={() => setMetricVisible([...CHANNEL_METRIC_DEFAULT_VISIBLE])}
                >
                  恢复默认指标
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onMetricDragEnd}>
                <SortableContext items={metricOrder} strategy={rectSortingStrategy}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {visibleMetricOrder.map((key) => (
                      <SortableMetricCard key={key} id={key}>
                        <MetricCard label={CHANNEL_METRIC_LABELS[key]} value={formatChannelMetricValue(summary, key)} metricKey={key} />
                      </SortableMetricCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>

          <section className="space-y-4">
            {viewMode === 'block2' ? null : <h3 className="text-base font-semibold text-ink">板块一：整体转化波动</h3>}
            {viewMode === 'block2' ? null : (
            <div className="panel bg-white p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid w-full gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2 lg:grid-cols-4 lg:max-w-[860px]">
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'day' as const, label: 'D4～D10单日转化率' },
                    { key: 'current' as const, label: '当期成交占比' },
                    { key: 'ratio' as const, label: '追单占比趋势' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBlockOneTab(item.key)}
                      className={`h-10 w-full rounded-xl px-3 py-2 text-sm transition ${
                        blockOneTab === item.key
                          ? 'bg-[#2f7bf6] font-semibold text-white shadow-sm ring-1 ring-[#2a6edf]'
                          : 'font-medium text-slate-600 hover:bg-white/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition lg:hidden ${
                    structurePanelVisible
                      ? 'border-sky-300 bg-sky-50 text-sky-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setStructurePanelVisible((prev) => !prev)}
                >
                  {structurePanelVisible ? '隐藏成交结构' : '显示成交结构'}
                </button>
              </div>
            </div>
            )}

            {viewMode !== 'block2' ? (
              <div className="relative">
                <button
                  type="button"
                  className={`absolute -right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-l-xl border border-r-0 px-2 py-3 text-xs shadow-sm transition lg:inline-flex lg:flex-col lg:items-center lg:gap-0.5 ${
                    structurePanelVisible
                      ? 'border-sky-300 bg-sky-50 text-sky-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setStructurePanelVisible((prev) => !prev)}
                >
                  <span>成交</span>
                  <span>结构</span>
                </button>
                <div className={`grid gap-4 ${structurePanelVisible ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
                <div>
                  {blockOneTab === 'all' || blockOneTab === 'day' ? (
                    <ChartCard
                      title="D4～D10 单日转化率趋势（营期）"
                      subtitle="默认重点观察 D4、D7、D10，可切换单日折线观察波动。"
                      headerExtra={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => setShowDayFormula((prev) => !prev)}
                        >
                          <Settings2 size={12} />
                          公式校验
                        </button>
                      }
                    >
                      {showDayFormula ? <ChannelFormulaPanel mode="day-rate" summary={summary} upload={upload} /> : null}
                      <LegendLineChart
                        data={dayRateData}
                        defs={dayRateDefs}
                        visible={chartConfig.dayRateVisible}
                        valueType="percent"
                        onVisibleChange={(next) => setChartConfig((prev) => ({ ...prev, dayRateVisible: next }))}
                        defaultVisible={DEFAULT_DAY_RATE_VISIBLE}
                      />
                    </ChartCard>
                  ) : null}
                </div>
                {structurePanelVisible ? (
                  <StructureDonutCard
                    scope={structureScope}
                    onScopeChange={setStructureScope}
                    campaignLabel={latestCampaignPoint?.campaign ?? ''}
                    data={structureData}
                  />
                ) : null}
                </div>
              </div>
            ) : null}

            {viewMode !== 'block2' && (blockOneTab === 'all' || blockOneTab === 'current') ? (
              <ChartCard
                title="当期成交占比趋势（营期）"
                subtitle="当期口径为 D4～D7，占比 = 当期成交GMV / 封板成交GMV。"
                headerExtra={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowCurrentFormula((prev) => !prev)}
                  >
                    <Settings2 size={12} />
                    公式校验
                  </button>
                }
              >
                {showCurrentFormula ? <ChannelFormulaPanel mode="current-rate" summary={summary} upload={upload} /> : null}
                <LegendLineChart
                  data={currentShareData}
                  defs={currentShareDefs}
                  visible={chartConfig.currentRateVisible}
                  valueType="percent"
                  onVisibleChange={(next) => setChartConfig((prev) => ({ ...prev, currentRateVisible: next }))}
                  defaultVisible={DEFAULT_CURRENT_RATE_VISIBLE}
                />
              </ChartCard>
            ) : null}

            {viewMode !== 'block2' && (blockOneTab === 'all' || blockOneTab === 'ratio') ? (
              <ChartCard
                title="追单占比趋势（营期）"
                subtitle="追单占比高代表该营期对 D8～D10 追单依赖更高。"
                headerExtra={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowRatioFormula((prev) => !prev)}
                  >
                    <Settings2 size={12} />
                    公式校验
                  </button>
                }
              >
                {showRatioFormula ? <ChannelFormulaPanel mode="follow-ratio" summary={summary} upload={upload} /> : null}
                <LegendLineChart
                  data={followRatioData}
                  defs={ratioDefs}
                  visible={chartConfig.ratioVisible}
                  valueType="percent"
                  onVisibleChange={(next) => setChartConfig((prev) => ({ ...prev, ratioVisible: next }))}
                  defaultVisible={DEFAULT_RATIO_VISIBLE}
                />
              </ChartCard>
            ) : null}
          </section>

          {viewMode === 'block1' ? null : (
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-ink">个人 / 渠道拆解</h3>
            <p className="text-sm text-slate-500">按渠道归属人和渠道号拆解 D4～D10 成交 GMV、单日转化率与封板转化表现。</p>
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm ${breakdownActiveTab === 'owner' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
                onClick={() => setBreakdownActiveTab('owner')}
              >
                渠道归属人
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm ${breakdownActiveTab === 'channel' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
                onClick={() => setBreakdownActiveTab('channel')}
              >
                渠道号明细
              </button>
            </div>

            {breakdownActiveTab === 'owner' ? (
              <ConversionTableCard
                title="渠道归属人 D4～D10 成交转化表"
                subtitle="按渠道归属人拆解 D4～D10 每日成交 GMV 与单日转化率，定位个人维度的成交贡献与转化波动。"
                dimensionLabel="渠道归属人"
                rows={ownerHeatmapRows}
                maxValue={ownerHeatmapMax}
                viewMode={ownerTableViewMode}
                onViewModeChange={setOwnerTableViewMode}
                sortState={ownerTableSort}
                onSortStateChange={setOwnerTableSort}
                columnWidths={tableColumnWidths}
                onColumnWidthsChange={setTableColumnWidths}
              />
            ) : (
              <ConversionTableCard
                title="渠道号 D4～D10 成交转化表"
                subtitle="按渠道号拆解 D4～D10 每日成交 GMV 与单日转化率，定位具体渠道的成交贡献和波动。"
                dimensionLabel="渠道号"
                rows={channelHeatmapRows}
                maxValue={channelHeatmapMax}
                viewMode={channelTableViewMode}
                onViewModeChange={setChannelTableViewMode}
                sortState={channelTableSort}
                onSortStateChange={setChannelTableSort}
                topN={channelTopN}
                onTopNChange={setChannelTopN}
                columnWidths={tableColumnWidths}
                onColumnWidthsChange={setTableColumnWidths}
              />
            )}
          </section>
          )}
        </>
      )}
    </div>
  );
}

function ChannelDetailFilterPanel({
  rows,
  filters,
  options,
  panelCollapsed,
  fieldCollapsed,
  queries,
  onPanelCollapsedChange,
  onFieldCollapsedChange,
  onQueriesChange,
  onChange,
  favoriteOwners,
  showFavoriteOwnersPanel,
  favoriteDraft,
  favoriteQuery,
  onFavoriteOwnersChange,
  onShowFavoriteOwnersPanelChange,
  onFavoriteDraftChange,
  onFavoriteQueryChange,
}: {
  rows: ChannelDetailRow[];
  filters: ChannelDetailFilters;
  options: Record<keyof ChannelDetailFilters, string[]>;
  panelCollapsed: boolean;
  fieldCollapsed: FieldCollapseState;
  queries: Partial<Record<keyof ChannelDetailFilters, string>>;
  onPanelCollapsedChange: (value: boolean) => void;
  onFieldCollapsedChange: (value: FieldCollapseState) => void;
  onQueriesChange: (value: Partial<Record<keyof ChannelDetailFilters, string>>) => void;
  onChange: (next: ChannelDetailFilters) => void;
  favoriteOwners: string[];
  showFavoriteOwnersPanel: boolean;
  favoriteDraft: string[];
  favoriteQuery: string;
  onFavoriteOwnersChange: (next: string[]) => void;
  onShowFavoriteOwnersPanelChange: (next: boolean) => void;
  onFavoriteDraftChange: (next: string[]) => void;
  onFavoriteQueryChange: (next: string) => void;
}) {
  const fields: Array<{ key: keyof ChannelDetailFilters; label: string }> = [
    { key: 'campaign', label: '营期' },
    { key: 'owner', label: '渠道归属人' },
    { key: 'channelId', label: '渠道号' },
    { key: 'category', label: '分类' },
  ];

  const clearAll = () => onChange(emptyChannelDetailFilters());
  const selectAll = () =>
    onChange({
      campaign: options.campaign,
      owner: options.owner,
      channelId: options.channelId,
      category: options.category,
      startDate: [],
      closeDate: [],
    });

  if (!rows.length) return null;

  if (panelCollapsed) {
    return (
      <section className="panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-700">
            当前筛选：
            {fields.map((field) => `${field.label}${filters[field.key].length ? ` ${filters[field.key].length}项` : ' 全部'}`).join(' / ')}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border border-line px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={clearAll}>
              清空筛选
            </button>
            <button type="button" className="rounded-md border border-line px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => onPanelCollapsedChange(false)}>
              展开筛选
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="section-title">D4～D10 转化观察筛选</h3>
          <p className="section-subtitle">用于筛选营期、渠道归属人、渠道号和分类，观察 D4～D10 单日转化表现。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => {
              onFavoriteDraftChange(favoriteOwners);
              onFavoriteQueryChange('');
              onShowFavoriteOwnersPanelChange(!showFavoriteOwnersPanel);
            }}
          >
            常用归属设置
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => {
              const valid = favoriteOwners.filter((owner) => options.owner.includes(owner));
              onChange({ ...filters, owner: valid });
            }}
          >
            恢复常用筛选
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={selectAll}>
            全选全部
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={clearAll}>
            清空筛选
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={() => onPanelCollapsedChange(true)}>
            收起筛选
          </button>
        </div>
      </div>
      {showFavoriteOwnersPanel ? (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs text-slate-600">固定关注渠道归属（渠道归属人）</div>
          <input
            value={favoriteQuery}
            onChange={(event) => onFavoriteQueryChange(event.target.value)}
            placeholder="搜索渠道归属人"
            className="mb-2 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
              onClick={() => {
                const visible = options.owner.filter((owner) => normalize(owner).includes(normalize(favoriteQuery)));
                onFavoriteDraftChange(Array.from(new Set([...favoriteDraft, ...visible])));
              }}
            >
              全选
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50"
              onClick={() => onFavoriteDraftChange([])}
            >
              清空
            </button>
          </div>
          <div className="max-h-[196px] overflow-y-auto rounded border border-slate-200 bg-white p-1.5 filter-scroll">
            {options.owner
              .filter((owner) => normalize(owner).includes(normalize(favoriteQuery)))
              .map((owner) => {
                const active = favoriteDraft.includes(owner);
                return (
                  <label key={owner} className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-sky-50">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        onFavoriteDraftChange(
                          active ? favoriteDraft.filter((item) => item !== owner) : [...favoriteDraft, owner],
                        )
                      }
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
              onClick={() => onShowFavoriteOwnersPanelChange(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100"
              onClick={() => {
                const saved = favoriteDraft.filter((owner) => options.owner.includes(owner));
                onFavoriteOwnersChange(saved);
                onChange({ ...filters, owner: saved });
                onShowFavoriteOwnersPanelChange(false);
              }}
            >
              保存
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-4">
        {fields.map((field) => (
          <ChannelFilterCard
            key={field.key}
            label={field.label}
            selected={filters[field.key]}
            options={options[field.key]}
            query={queries[field.key] || ''}
            collapsed={fieldCollapsed[field.key]}
            onCollapsedChange={(next) => onFieldCollapsedChange({ ...fieldCollapsed, [field.key]: next })}
            onQueryChange={(next) => onQueriesChange({ ...queries, [field.key]: next })}
            onChange={(next) => onChange({ ...filters, [field.key]: next })}
          />
        ))}
      </div>
    </section>
  );
}

function ChannelFilterCard({
  label,
  selected,
  options,
  query,
  collapsed,
  onCollapsedChange,
  onQueryChange,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  query: string;
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  onQueryChange: (next: string) => void;
  onChange: (next: string[]) => void;
}) {
  const visibleOptions = query ? options.filter((item) => normalize(item).includes(normalize(query))) : options;
  const summary = selected.length ? `${label}（已选 ${selected.length}/${options.length}）` : `${label}（全部）`;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-700">{summary}</div>
          {collapsed ? <div className="mt-1 text-xs text-slate-500">{buildSummary(selected)}</div> : null}
        </div>
        <button type="button" className="text-xs text-slate-500 hover:text-slate-700" onClick={() => onCollapsedChange(!collapsed)}>
          {collapsed ? '展开' : '收起'}
        </button>
      </div>
      {collapsed ? null : (
        <>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="mb-2 h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-2 text-xs outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            placeholder={`搜索${label}`}
          />
          <div className="mb-2 flex items-center gap-2">
            <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50" onClick={() => onChange(Array.from(new Set([...selected, ...visibleOptions])))}>
              全选
            </button>
            <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-sky-50" onClick={() => onChange([])}>
              清空
            </button>
          </div>
          <div className="max-h-[196px] overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 filter-scroll">
            {visibleOptions.length === 0 ? <div className="px-2 py-1 text-xs text-slate-400">无匹配项</div> : null}
            {visibleOptions.map((item) => {
              const active = selected.includes(item);
              return (
                <label key={item} className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-sky-50">
                  <input type="checkbox" checked={active} onChange={() => onChange(active ? selected.filter((v) => v !== item) : [...selected, item])} />
                  <span className="truncate">{item}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function LegendLineChart({
  data,
  defs,
  visible,
  valueType,
  onVisibleChange,
  defaultVisible,
}: {
  data: Array<Record<string, string | number | null>>;
  defs: ReadonlyArray<{ key: string; label: string; color: string }>;
  visible: Record<string, boolean>;
  valueType: 'percent' | 'money';
  onVisibleChange: (next: Record<string, boolean>) => void;
  defaultVisible: Record<string, boolean>;
}) {
  const activeDefs = defs.filter((item) => visible[item.key]);
  if (!data.length) return <div className="py-16 text-center text-sm text-muted">暂无可展示数据</div>;
  return (
    <div className="h-[452px] pt-1">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-sm">
        {defs.map((item) => {
          const active = visible[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                const currentVisibleCount = defs.filter((def) => visible[def.key]).length;
                if (active && currentVisibleCount <= 1) return;
                onVisibleChange({ ...visible, [item.key]: !active });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 transition-colors hover:bg-slate-50"
              style={{ color: active ? item.color : '#94a3b8', opacity: active ? 1 : 0.55, background: active ? '#ffffff' : '#f8fafc' }}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: active ? item.color : '#cbd5e1' }} />
              {item.label}
            </button>
          );
        })}
      </div>
      {!activeDefs.length ? (
        <div className="flex h-[388px] items-center justify-center">
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
            <div className="text-sm font-medium text-slate-700">当前图表暂无显示指标，请至少开启一个指标。</div>
            <button
              type="button"
              className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
              onClick={() => onVisibleChange({ ...defaultVisible })}
            >
              恢复默认指标
            </button>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 32, bottom: 48, left: 16 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
            <XAxis dataKey="campaign" angle={-28} textAnchor="end" height={74} interval={0} minTickGap={8} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tickFormatter={(value) => (valueType === 'percent' ? `${(Number(value) * 100).toFixed(0)}%` : formatMoney(Number(value)))} tick={{ fill: '#64748b', fontSize: 12 }} />
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
                        <span className="tabular-nums text-ink">
                          {valueType === 'percent' ? formatPercent(Number(entry.value), 2) : formatMoney(Number(entry.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {activeDefs.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={item.key.includes('d4') || item.key.includes('d10') ? 2.6 : 2}
                dot={{ r: 3.4, strokeWidth: 0, fill: item.color }}
                activeDot={{ r: 5.3 }}
                connectNulls
              >
                <LabelList dataKey={item.key} position="top" fontSize={12} fill={item.color} formatter={(value: number) => (valueType === 'percent' ? formatPercent(value, 1) : formatMoney(value))} />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function StructureDonutCard({
  scope,
  onScopeChange,
  campaignLabel,
  data,
}: {
  scope: StructureScope;
  onScopeChange: (next: StructureScope) => void;
  campaignLabel: string;
  data: {
    currentGmv: number;
    followGmv: number;
    totalGmv: number;
    currentRatio: number;
    followRatio: number;
  } | null;
}) {
  const pieData = data
    ? [
        { name: '当期成交', value: data.currentGmv, ratio: data.currentRatio, color: '#4F8FD9' },
        { name: '追单成交', value: data.followGmv, ratio: data.followRatio, color: '#F59E0B' },
      ]
    : [];

  return (
    <ChartCard
      title="当期 / 追单成交结构"
      subtitle="观察 D4～D7 当期成交与 D8～D10 追单成交在封板成交中的占比。"
      headerExtra={
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${scope === 'latest' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
              onClick={() => onScopeChange('latest')}
            >
              最新营期
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${scope === 'filtered' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
              onClick={() => onScopeChange('filtered')}
            >
              当前筛选范围
            </button>
          </div>
        </div>
      }
    >
      {!data ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">当前筛选范围内暂无 D4～D10 成交数据。</div>
      ) : (
        <div className="space-y-3">
          {scope === 'latest' && campaignLabel ? <div className="text-xs text-slate-500">当前口径：最新营期（{campaignLabel}）</div> : null}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: number, name: string, item: { payload?: { ratio?: number } }) => [
                    `${formatMoney(value)}（${formatPercent(item?.payload?.ratio ?? null, 2)}）`,
                    name,
                  ]}
                />
                <Pie data={pieData} innerRadius={62} outerRadius={94} dataKey="value" paddingAngle={3} stroke="#fff" strokeWidth={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">封板GMV</div>
            <div className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{formatMoney(data.totalGmv)}</div>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-[#4F8FD9]" />当期成交</span>
                <span className="tabular-nums text-slate-700">{formatMoney(data.currentGmv)} / {formatPercent(data.currentRatio, 1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" />追单成交</span>
                <span className="tabular-nums text-slate-700">{formatMoney(data.followGmv)} / {formatPercent(data.followRatio, 1)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function heatColor(value: number | null, max: number): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return '#f8fafc';
  const ratio = Math.min(1, Math.max(0.1, value / max));
  return `rgba(59, 130, 246, ${ratio.toFixed(2)})`;
}

function normalizeGmvHeatmapSort(input: unknown): GmvHeatmapSortKey {
  if (
    input === 'currentRate' ||
    input === 'followRate' ||
    input === 'closedRate' ||
    input === 'd4gmv' || input === 'd5gmv' || input === 'd6gmv' || input === 'd7gmv' || input === 'd8gmv' || input === 'd9gmv' || input === 'd10gmv' ||
    input === 'd4Rate' || input === 'd5Rate' || input === 'd6Rate' || input === 'd7Rate' || input === 'd8Rate' || input === 'd9Rate' || input === 'd10Rate' ||
    input === 'currentGmv' || input === 'followGmv' || input === 'closedGmv' || input === 'followRatio'
  ) {
    return input;
  }
  return 'closedRate';
}

function normalizeTopN(input: unknown): ChannelTopN {
  if (input === 10 || input === 20 || input === 50 || input === 'all') return input;
  return 10;
}

function normalizeColumnWidth(input: unknown): number {
  const value = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(value)) return 128;
  return Math.min(320, Math.max(84, Math.round(value / 4) * 4));
}

function normalizeTableColumnWidths(input: unknown): TableColumnWidths {
  const raw = input && typeof input === 'object' ? (input as Partial<Record<TableColumnId, unknown>>) : {};
  return TABLE_COLUMN_IDS.reduce((acc, key) => {
    acc[key] = normalizeColumnWidth(raw[key] ?? DEFAULT_TABLE_COLUMN_WIDTHS[key]);
    return acc;
  }, {} as TableColumnWidths);
}

function normalizeTableViewMode(input: unknown): TableViewMode {
  return input === 'conversion' ? 'conversion' : 'gmv';
}

function normalizeTableSort(input: unknown): TableSortState {
  const fallback: TableSortState = { field: 'leads', direction: 'desc' };
  if (!input || typeof input !== 'object') return fallback;
  const data = input as Partial<TableSortState>;
  const field = normalizeTableSortField(data.field);
  const direction = data.direction === 'asc' ? 'asc' : 'desc';
  return { field, direction };
}

function normalizeTableSortField(input: unknown): TableSortField {
  const allowed: TableSortField[] = [
    'leads',
    'currentRate',
    'followRate',
    'closedRate',
    'd4gmv',
    'd5gmv',
    'd6gmv',
    'd7gmv',
    'd8gmv',
    'd9gmv',
    'd10gmv',
    'd4Rate',
    'd5Rate',
    'd6Rate',
    'd7Rate',
    'd8Rate',
    'd9Rate',
    'd10Rate',
    'currentGmv',
    'followGmv',
    'closedGmv',
    'followRatio',
  ];
  return allowed.includes(input as TableSortField) ? (input as TableSortField) : 'leads';
}

function sortDayGmvTableRows(rows: HeatmapGmvRow[], sortState: TableSortState): HeatmapGmvRow[] {
  const sorted = [...rows];
  const { field, direction } = sortState;
  sorted.sort((a, b) => {
    const delta = toSortable(a[field]) - toSortable(b[field]);
    return direction === 'asc' ? delta : -delta;
  });
  return sorted;
}

function buildSummary(selected: string[]): string {
  if (!selected.length) return '全部';
  if (selected.length <= 2) return selected.join('、');
  return `${selected.slice(0, 2).join('、')} +${selected.length - 2}项`;
}

function normalizeFilters(input: unknown): ChannelDetailFilters {
  const fallback = emptyChannelDetailFilters();
  if (!input || typeof input !== 'object') return fallback;
  const value = input as Partial<Record<keyof ChannelDetailFilters, unknown>>;
  const asArray = (v: unknown) => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []);
  return {
    campaign: asArray(value.campaign),
    owner: asArray(value.owner),
    channelId: asArray(value.channelId),
    category: asArray(value.category),
    startDate: [],
    closeDate: [],
  };
}

function normalizeChartConfig(input: unknown): ChartConfig {
  if (!input || typeof input !== 'object') return DEFAULT_CHART_CONFIG;
  const raw = input as Partial<ChartConfig>;
  const normalizeVisible = (value: unknown, defaults: Record<string, boolean>) => {
    if (!value || typeof value !== 'object') return { ...defaults };
    const data = value as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    Object.keys(defaults).forEach((key) => {
      next[key] = data[key] === true;
    });
    const anyVisible = Object.values(next).some(Boolean);
    return anyVisible ? next : { ...defaults };
  };
  const normalizedCurrentRateVisible = normalizeVisible(raw.currentRateVisible, DEFAULT_CURRENT_RATE_VISIBLE);
  // Backward compatibility: migrate old key `currentRate` -> `currentShare`.
  if (!normalizedCurrentRateVisible.currentShare && raw.currentRateVisible && typeof raw.currentRateVisible === 'object') {
    const legacy = raw.currentRateVisible as Record<string, unknown>;
    if (legacy.currentRate === true) {
      normalizedCurrentRateVisible.currentShare = true;
    }
  }

  return {
    dayRateVisible: normalizeVisible(raw.dayRateVisible, DEFAULT_DAY_RATE_VISIBLE),
    gmvVisible: normalizeVisible(raw.gmvVisible, DEFAULT_GMV_VISIBLE),
    ratioVisible: normalizeVisible(raw.ratioVisible, DEFAULT_RATIO_VISIBLE),
    currentRateVisible: normalizedCurrentRateVisible,
    dimension: raw.dimension === 'channelId' || raw.dimension === 'category' ? raw.dimension : 'owner',
    heatmapSort: raw.heatmapSort === 'd4Rate' || raw.heatmapSort === 'followRatio' ? raw.heatmapSort : 'closedRate',
  };
}

function normalizeBlockOneTab(input: unknown): BlockOneTab {
  if (input === 'all' || input === 'day' || input === 'current' || input === 'ratio') return input;
  return 'all';
}

function normalizeStructureScope(input: unknown): StructureScope {
  if (input === 'latest' || input === 'filtered') return input;
  return 'latest';
}

function normalizeBreakdownTab(input: unknown): BreakdownTab {
  return input === 'channel' ? 'channel' : 'owner';
}

function normalizeBool(input: unknown, fallback = false): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

function normalizeFieldCollapsed(input: unknown): FieldCollapseState {
  if (!input || typeof input !== 'object') return DEFAULT_FIELD_COLLAPSED;
  const raw = input as Partial<Record<keyof ChannelDetailFilters, unknown>>;
  return {
    campaign: normalizeBool(raw.campaign, DEFAULT_FIELD_COLLAPSED.campaign),
    owner: normalizeBool(raw.owner, DEFAULT_FIELD_COLLAPSED.owner),
    channelId: normalizeBool(raw.channelId, DEFAULT_FIELD_COLLAPSED.channelId),
    category: normalizeBool(raw.category, DEFAULT_FIELD_COLLAPSED.category),
    startDate: normalizeBool(raw.startDate, DEFAULT_FIELD_COLLAPSED.startDate),
    closeDate: normalizeBool(raw.closeDate, DEFAULT_FIELD_COLLAPSED.closeDate),
  };
}

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, '');
}

function normalizeStringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeMetricKeys(input: unknown, fallback: ChannelMetricKey[]): ChannelMetricKey[] {
  if (!Array.isArray(input)) return fallback;
  const keys = input.filter((item): item is ChannelMetricKey => typeof item === 'string' && CHANNEL_METRIC_ORDER.includes(item as ChannelMetricKey));
  return keys.length ? Array.from(new Set(keys)) : fallback;
}

function normalizeMetricOrder(input: unknown): ChannelMetricKey[] {
  if (!Array.isArray(input)) return [...CHANNEL_METRIC_ORDER];
  const sanitized = input.filter((item): item is ChannelMetricKey => typeof item === 'string' && CHANNEL_METRIC_ORDER.includes(item as ChannelMetricKey));
  const merged = [...sanitized];
  CHANNEL_METRIC_ORDER.forEach((key) => {
    if (!merged.includes(key)) merged.push(key);
  });
  return merged;
}

function formatChannelMetricValue(summary: ChannelDetailSummary, key: ChannelMetricKey): string {
  if (key === 'leads') return formatMoney(summary.leads);
  if (key === 'currentRate') return formatPercent(summary.currentRate, 2);
  if (key === 'followRate') return formatPercent(summary.followRate, 2);
  if (key === 'closedRate') return formatPercent(summary.closedRate, 2);
  if (key === 'cost') return formatMoney(summary.cost);
  if (key === 'leadCost') return formatMoney(summary.leadCost);
  if (key === 'currentGmv') return formatMoney(summary.currentGmv);
  if (key === 'followGmv') return formatMoney(summary.followGmv);
  if (key === 'closedGmv') return formatMoney(summary.closedGmv);
  if (key === 'closedRoi') return formatRatio(summary.closedRoi, 2);
  if (key === 'closedCostRate') return formatPercent(summary.closedCostRate, 2);
  if (key === 'closedRValue') return formatMoney(summary.closedRValue, 1);
  if (key === 'followRatio') return formatPercent(summary.followRatio, 2);
  if (key === 'd4Rate') return formatPercent(summary.d4Rate, 2);
  if (key === 'd5Rate') return formatPercent(summary.d5Rate, 2);
  if (key === 'd6Rate') return formatPercent(summary.d6Rate, 2);
  if (key === 'd7Rate') return formatPercent(summary.d7Rate, 2);
  if (key === 'd8Rate') return formatPercent(summary.d8Rate, 2);
  if (key === 'd9Rate') return formatPercent(summary.d9Rate, 2);
  return formatPercent(summary.d10Rate, 2);
}

function channelFieldStatus(upload?: ChannelDetailUploadRecord): '已识别' | '部分识别' | '未识别' {
  if (!upload?.mapping) return '未识别';
  const mapping = upload.mapping;
  const required: Array<keyof typeof mapping> = ['campaign', 'owner', 'channelId', 'category', 'leads', 'cost', 'd4gmv', 'd7gmv', 'd10gmv'];
  const hit = required.filter((key) => Boolean(mapping[key])).length;
  if (hit === required.length) return '已识别';
  if (hit > 0) return '部分识别';
  return '未识别';
}

type HeatmapGmvRow = {
  key: string;
  leads: number;
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
  currentRate: number | null;
  followGmv: number;
  followRate: number | null;
  closedGmv: number;
  closedRate: number | null;
  followRatio: number | null;
};

function buildDayGmvHeatmapRows(rows: ChannelDetailRow[], dimension: 'owner' | 'channelId'): HeatmapGmvRow[] {
  const grouped = new Map<string, HeatmapGmvRow>();
  rows.forEach((row) => {
    const key = (dimension === 'owner' ? row.owner : row.channelId) || '未填写';
    const current = grouped.get(key) || {
      key,
      leads: 0,
      d4gmv: 0,
      d5gmv: 0,
      d6gmv: 0,
      d7gmv: 0,
      d8gmv: 0,
      d9gmv: 0,
      d10gmv: 0,
      d4Rate: null,
      d5Rate: null,
      d6Rate: null,
      d7Rate: null,
      d8Rate: null,
      d9Rate: null,
      d10Rate: null,
      currentGmv: 0,
      currentRate: null,
      followGmv: 0,
      followRate: null,
      closedGmv: 0,
      closedRate: null,
      followRatio: null,
    };
    current.leads += row.leads || 0;
    current.d4gmv += row.d4gmv || 0;
    current.d5gmv += row.d5gmv || 0;
    current.d6gmv += row.d6gmv || 0;
    current.d7gmv += row.d7gmv || 0;
    current.d8gmv += row.d8gmv || 0;
    current.d9gmv += row.d9gmv || 0;
    current.d10gmv += row.d10gmv || 0;
    grouped.set(key, current);
  });
  const withRate = Array.from(grouped.values()).map((item) => {
    const currentGmv = item.d4gmv + item.d5gmv + item.d6gmv + item.d7gmv;
    const followGmv = item.d8gmv + item.d9gmv + item.d10gmv;
    const closedGmv = currentGmv + followGmv;
    const leads = item.leads;
    return {
      ...item,
      d4Rate: safeDivide(item.d4gmv, 2980 * leads),
      d5Rate: safeDivide(item.d5gmv, 2980 * leads),
      d6Rate: safeDivide(item.d6gmv, 2980 * leads),
      d7Rate: safeDivide(item.d7gmv, 2980 * leads),
      d8Rate: safeDivide(item.d8gmv, 2980 * leads),
      d9Rate: safeDivide(item.d9gmv, 2980 * leads),
      d10Rate: safeDivide(item.d10gmv, 2980 * leads),
      currentGmv,
      currentRate: safeDivide(currentGmv, 2980 * leads),
      followGmv,
      followRate: safeDivide(followGmv, 2980 * leads),
      closedGmv,
      closedRate: safeDivide(closedGmv, 2980 * leads),
      followRatio: safeDivide(followGmv, closedGmv),
    };
  });
  return withRate;
}

function getHeatmapMaxValue(rows: HeatmapGmvRow[]): number {
  let max = 0;
  rows.forEach((row) => {
    DAY_GMV_KEYS.forEach((k) => {
      if ((row[k] || 0) > max) max = row[k] || 0;
    });
    if (row.currentGmv > max) max = row.currentGmv;
    if (row.followGmv > max) max = row.followGmv;
    if (row.closedGmv > max) max = row.closedGmv;
  });
  return max || 1;
}

function sortLabel(key: TableSortField): string {
  if (key === 'leads') return 'leads数';
  if (key === 'currentRate') return '当期转化率';
  if (key === 'followRate') return '追单转化率';
  if (key === 'closedRate') return '封板转化率';
  return '封板转化率';
}

function formatGmvCell(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  return formatMoney(value);
}

function ConversionTableCard({
  title,
  subtitle,
  dimensionLabel,
  rows,
  maxValue,
  viewMode,
  onViewModeChange,
  sortState,
  onSortStateChange,
  topN,
  onTopNChange,
  columnWidths,
  onColumnWidthsChange,
}: {
  title: string;
  subtitle: string;
  dimensionLabel: string;
  rows: HeatmapGmvRow[];
  maxValue: number;
  viewMode: TableViewMode;
  onViewModeChange: (mode: TableViewMode) => void;
  sortState: TableSortState;
  onSortStateChange: (state: TableSortState) => void;
  topN?: ChannelTopN;
  onTopNChange?: (value: ChannelTopN) => void;
  columnWidths: TableColumnWidths;
  onColumnWidthsChange: Dispatch<SetStateAction<TableColumnWidths>>;
}) {
  const columnStyle = (key: TableColumnId) => ({
    width: columnWidths[key],
    minWidth: columnWidths[key],
    maxWidth: columnWidths[key],
  });
  const groupStyle = (keys: TableColumnId[]) => {
    const width = keys.reduce((sum, key) => sum + columnWidths[key], 0);
    return { width, minWidth: width, maxWidth: width };
  };
  const tableMinWidth = TABLE_COLUMN_IDS.reduce((sum, key) => sum + columnWidths[key], 0);
  const startColumnResize = (key: TableColumnId, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[key];
    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = normalizeColumnWidth(startWidth + moveEvent.clientX - startX);
      onColumnWidthsChange((prev) => ({ ...prev, [key]: nextWidth }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };
  const resizeHandle = (key: TableColumnId, label: string) => (
    <button
      type="button"
      className="table-col-resizer"
      aria-label={`调整${label}列宽`}
      onPointerDown={(event) => startColumnResize(key, event)}
    />
  );
  const onSortFieldChange = (field: TableSortField) => {
    onSortStateChange({
      field,
      direction: sortState.field === field && sortState.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const downloadCsv = () => {
    exportCsv(
      `${title}.csv`,
      rows.map((row) =>
        viewMode === 'gmv'
          ? {
              [dimensionLabel]: row.key,
              leads数: formatMoney(row.leads),
              D4GMV: formatMoney(row.d4gmv),
              D5GMV: formatMoney(row.d5gmv),
              D6GMV: formatMoney(row.d6gmv),
              D7GMV: formatMoney(row.d7gmv),
              D8GMV: formatMoney(row.d8gmv),
              D9GMV: formatMoney(row.d9gmv),
              D10GMV: formatMoney(row.d10gmv),
              当期成交GMV: formatMoney(row.currentGmv),
              追单GMV: formatMoney(row.followGmv),
              封板成交GMV: formatMoney(row.closedGmv),
              追单占比: formatPercent(row.followRatio, 2),
            }
          : {
              [dimensionLabel]: row.key,
              leads数: formatMoney(row.leads),
              D4转化率: formatPercent(row.d4Rate, 2),
              D5转化率: formatPercent(row.d5Rate, 2),
              D6转化率: formatPercent(row.d6Rate, 2),
              D7转化率: formatPercent(row.d7Rate, 2),
              D8转化率: formatPercent(row.d8Rate, 2),
              D9转化率: formatPercent(row.d9Rate, 2),
              D10转化率: formatPercent(row.d10Rate, 2),
              当期转化率: formatPercent(row.currentRate, 2),
              追单转化率: formatPercent(row.followRate, 2),
              封板转化率: formatPercent(row.closedRate, 2),
              追单占比: formatPercent(row.followRatio, 2),
            },
      ),
    );
  };

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div className="mb-1 text-[11px] font-medium text-slate-500">排序</div>
          <div className="inline-flex items-center gap-1">
          {(['leads', 'currentRate', 'followRate', 'closedRate'] as TableSortField[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded px-2 py-1 text-xs ${sortState.field === key ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
              onClick={() => onSortFieldChange(key)}
            >
              {sortLabel(key)}
              {sortState.field === key ? (sortState.direction === 'desc' ? '↓' : '↑') : ''}
            </button>
          ))}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="mb-1 text-[11px] font-medium text-slate-500">视图</div>
            <div className="inline-flex items-center gap-1">
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${viewMode === 'gmv' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
              onClick={() => onViewModeChange('gmv')}
            >
              GMV视图
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${viewMode === 'conversion' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
              onClick={() => onViewModeChange('conversion')}
            >
              转化率视图
            </button>
            </div>
          </div>
          {onTopNChange ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="mb-1 text-[11px] font-medium text-slate-500">操作</div>
              <div className="inline-flex items-center gap-1">
              {[10, 20, 50, 'all'].map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${topN === option ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => onTopNChange(option as ChannelTopN)}
                >
                  {option === 'all' ? '全部' : `Top ${option}`}
                </button>
              ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="mb-1 text-[11px] font-medium text-slate-500">操作</div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={downloadCsv}>
                导出 CSV
              </button>
              {viewMode === 'gmv' ? (
                <>
                  <span>GMV低</span>
                  <span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-[#e0edff] to-[#2563eb]" />
                  <span>GMV高</span>
                </>
              ) : (
                <>
                  <span>转化率低</span>
                  <span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-[#e9f8ef] to-[#22c55e]" />
                  <span>转化率高</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-h-[540px] overflow-auto">
        <table className="border-separate border-spacing-0 text-sm" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-[#f1f5fb] text-xs text-slate-600">
            <tr>
              <th className="sticky left-0 z-30 border-b border-line bg-[#e9eff9] px-3 py-2 text-left font-semibold" style={groupStyle(['dimension', 'leads'])} colSpan={2}>基础信息</th>
              <th className="border-b border-line bg-[#e9eff9] px-3 py-2 text-center font-semibold" style={groupStyle(['d4', 'd5', 'd6', 'd7', 'current'])} colSpan={5}>当期转化 D4～D7</th>
              <th className="border-b border-line bg-[#e9eff9] px-3 py-2 text-center font-semibold" style={groupStyle(['d8', 'd9', 'd10', 'follow'])} colSpan={4}>追单转化 D8～D10</th>
              <th className="border-b border-line bg-[#e9eff9] px-3 py-2 text-center font-semibold" style={groupStyle(['closed', 'followRatio'])} colSpan={2}>封板结果</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-20 border-b border-line bg-[#f1f5fb] px-3 py-2 text-left font-semibold table-resizable-th" style={columnStyle('dimension')}>
                {dimensionLabel}
                {resizeHandle('dimension', dimensionLabel)}
              </th>
              <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('leads')} onClick={() => onSortFieldChange('leads')}>
                leads数
                {resizeHandle('leads', 'leads数')}
              </th>
              {viewMode === 'gmv' ? (
                <>
                  {([4, 5, 6, 7] as const).map((day) => (
                    <th key={`gmv-${day}`} className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle(`d${day}` as TableColumnId)} onClick={() => onSortFieldChange(`d${day}gmv` as TableSortField)}>
                      {`D${day} GMV`}
                      {resizeHandle(`d${day}` as TableColumnId, `D${day} GMV`)}
                    </th>
                  ))}
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('current')} onClick={() => onSortFieldChange('currentGmv')}>
                    当期成交GMV
                    {resizeHandle('current', '当期成交GMV')}
                  </th>
                  {([8, 9, 10] as const).map((day) => (
                    <th key={`gmv-${day}`} className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle(`d${day}` as TableColumnId)} onClick={() => onSortFieldChange(`d${day}gmv` as TableSortField)}>
                      {`D${day} GMV`}
                      {resizeHandle(`d${day}` as TableColumnId, `D${day} GMV`)}
                    </th>
                  ))}
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('follow')} onClick={() => onSortFieldChange('followGmv')}>
                    追单GMV
                    {resizeHandle('follow', '追单GMV')}
                  </th>
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('closed')} onClick={() => onSortFieldChange('closedGmv')}>
                    封板成交GMV
                    {resizeHandle('closed', '封板成交GMV')}
                  </th>
                </>
              ) : (
                <>
                  {([4, 5, 6, 7] as const).map((day) => (
                    <th key={`rate-${day}`} className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle(`d${day}` as TableColumnId)} onClick={() => onSortFieldChange(`d${day}Rate` as TableSortField)}>
                      {`D${day} 转化率`}
                      {resizeHandle(`d${day}` as TableColumnId, `D${day} 转化率`)}
                    </th>
                  ))}
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('current')} onClick={() => onSortFieldChange('currentRate')}>
                    当期转化率
                    {resizeHandle('current', '当期转化率')}
                  </th>
                  {([8, 9, 10] as const).map((day) => (
                    <th key={`rate-${day}`} className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle(`d${day}` as TableColumnId)} onClick={() => onSortFieldChange(`d${day}Rate` as TableSortField)}>
                      {`D${day} 转化率`}
                      {resizeHandle(`d${day}` as TableColumnId, `D${day} 转化率`)}
                    </th>
                  ))}
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('follow')} onClick={() => onSortFieldChange('followRate')}>
                    追单转化率
                    {resizeHandle('follow', '追单转化率')}
                  </th>
                  <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('closed')} onClick={() => onSortFieldChange('closedRate')}>
                    封板转化率
                    {resizeHandle('closed', '封板转化率')}
                  </th>
                </>
              )}
              <th className="cursor-pointer border-b border-line px-3 py-2 text-right font-semibold table-resizable-th" style={columnStyle('followRatio')} onClick={() => onSortFieldChange('followRatio')}>
                追单占比
                {resizeHandle('followRatio', '追单占比')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/70">
                <td className="sticky left-0 z-[1] overflow-hidden text-ellipsis whitespace-nowrap border-b border-line bg-white px-3 py-2 text-sm font-medium text-slate-700" style={columnStyle('dimension')} title={row.key}>{row.key}</td>
                <td className="border-b border-line px-3 py-2 text-right tabular-nums" style={columnStyle('leads')}>{formatMoney(row.leads)}</td>
                {viewMode === 'gmv' ? (
                  <>
                    {(['d4gmv', 'd5gmv', 'd6gmv', 'd7gmv'] as const).map((key) => (
                      <td
                        key={key}
                        className="border-b border-line px-3 py-2 text-right tabular-nums"
                        style={{ ...columnStyle(key.slice(0, 2) as TableColumnId), background: heatColor(row[key], maxValue) }}
                        title={`${dimensionLabel}：${row.key}\n日期：${key.toUpperCase().replace('GMV', '')}\n成交GMV：${formatMoney(row[key])}`}
                      >
                        {formatGmvCell(row[key])}
                      </td>
                    ))}
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums font-semibold" style={{ ...columnStyle('current'), background: heatColor(row.currentGmv, maxValue) }}>{formatGmvCell(row.currentGmv)}</td>
                    {(['d8gmv', 'd9gmv', 'd10gmv'] as const).map((key) => (
                      <td
                        key={key}
                        className="border-b border-line px-3 py-2 text-right tabular-nums"
                        style={{ ...columnStyle(key.slice(0, key.startsWith('d10') ? 3 : 2) as TableColumnId), background: heatColor(row[key], maxValue) }}
                        title={`${dimensionLabel}：${row.key}\n日期：${key.toUpperCase().replace('GMV', '')}\n成交GMV：${formatMoney(row[key])}`}
                      >
                        {formatGmvCell(row[key])}
                      </td>
                    ))}
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums font-semibold" style={{ ...columnStyle('follow'), background: heatColor(row.followGmv, maxValue) }}>{formatGmvCell(row.followGmv)}</td>
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums font-semibold" style={{ ...columnStyle('closed'), background: heatColor(row.closedGmv, maxValue) }}>{formatGmvCell(row.closedGmv)}</td>
                  </>
                ) : (
                  <>
                    {(['d4Rate', 'd5Rate', 'd6Rate', 'd7Rate'] as const).map((key) => (
                      <td
                        key={key}
                        className="border-b border-line px-3 py-2 text-right tabular-nums"
                        style={{ ...columnStyle(key.slice(0, 2) as TableColumnId), background: rateHeatColor(row[key]) }}
                        title={`${dimensionLabel}：${row.key}\n日期：${key.slice(0, 2).toUpperCase()}\n转化率：${formatPercent(row[key], 2)}\nleads数：${formatMoney(row.leads)}`}
                      >
                        {formatPercent(row[key], 2)}
                      </td>
                    ))}
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums" style={{ ...columnStyle('current'), background: rateHeatColor(row.currentRate) }}>{formatPercent(row.currentRate, 2)}</td>
                    {(['d8Rate', 'd9Rate', 'd10Rate'] as const).map((key) => (
                      <td
                        key={key}
                        className="border-b border-line px-3 py-2 text-right tabular-nums"
                        style={{ ...columnStyle(key.slice(0, key.startsWith('d10') ? 3 : 2) as TableColumnId), background: rateHeatColor(row[key]) }}
                        title={`${dimensionLabel}：${row.key}\n日期：${key.slice(0, 2).toUpperCase()}\n转化率：${formatPercent(row[key], 2)}\nleads数：${formatMoney(row.leads)}`}
                      >
                        {formatPercent(row[key], 2)}
                      </td>
                    ))}
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums" style={{ ...columnStyle('follow'), background: rateHeatColor(row.followRate) }}>{formatPercent(row.followRate, 2)}</td>
                    <td className="border-b border-line px-3 py-2 text-right tabular-nums" style={{ ...columnStyle('closed'), background: rateHeatColor(row.closedRate) }}>{formatPercent(row.closedRate, 2)}</td>
                  </>
                )}
                <td className="border-b border-line px-3 py-2 text-right tabular-nums" style={columnStyle('followRatio')}>{formatPercent(row.followRatio, 2)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-sm text-slate-500">暂无可展示数据</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function toSortable(value: number | null): number {
  return Number.isFinite(value) ? Number(value) : -1;
}

function rateHeatColor(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return '#f8fafc';
  const ratio = Math.min(1, Math.max(0.08, value / 0.05));
  return `rgba(34, 197, 94, ${ratio.toFixed(2)})`;
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

function ChannelFormulaPanel({
  mode,
  summary,
  upload,
}: {
  mode: 'metric-core' | 'day-rate' | 'current-rate' | 'follow-ratio';
  summary: ChannelDetailSummary;
  upload?: ChannelDetailUploadRecord;
}) {
  const fields = upload?.mapping || {};
  const hasLeads = Boolean(fields.leads);
  const hasCost = Boolean(fields.cost);
  const hasD4 = Boolean(fields.d4gmv);
  const hasD7 = Boolean(fields.d7gmv);
  const hasD10 = Boolean(fields.d10gmv);
  const status = (value: number | null, denominator?: number, ok = true) => {
    if (!ok) return '字段缺失';
    if (denominator !== undefined && denominator === 0) return '分母为 0';
    if (value === null) return '结果为空';
    return '正常';
  };

  const rows =
    mode === 'metric-core'
      ? [
          { metric: '当期转化率', formula: '(D4+D5+D6+D7)GMV / 2980 / leads数', value: summary.currentRate, denominator: summary.leads, ok: hasLeads && hasD4 && hasD7 },
          { metric: '追单转化率', formula: '(D8+D9+D10)GMV / 2980 / leads数', value: summary.followRate, denominator: summary.leads, ok: hasLeads && hasD10 },
          { metric: '封板转化率', formula: '(D4~D10)GMV / 2980 / leads数', value: summary.closedRate, denominator: summary.leads, ok: hasLeads && hasD4 && hasD7 && hasD10 },
          { metric: 'leads成本', formula: '消耗 / leads数', value: summary.leadCost, denominator: summary.leads, ok: hasLeads && hasCost },
          { metric: '封板ROI', formula: '封板成交GMV / 消耗', value: summary.closedRoi, denominator: summary.cost, ok: hasCost && hasD4 && hasD7 && hasD10 },
          { metric: '封板费比', formula: '消耗 / 封板成交GMV', value: summary.closedCostRate, denominator: summary.closedGmv, ok: hasCost && hasD4 && hasD7 && hasD10 },
          { metric: '封板R值', formula: '封板成交GMV / leads数', value: summary.closedRValue, denominator: summary.leads, ok: hasLeads && hasD4 && hasD7 && hasD10 },
        ]
      : mode === 'day-rate'
        ? [
            { metric: 'D4转化率', formula: 'D4GMV / 2980 / leads数', value: summary.d4Rate, denominator: summary.leads, ok: hasLeads && hasD4 },
            { metric: 'D7转化率', formula: 'D7GMV / 2980 / leads数', value: summary.d7Rate, denominator: summary.leads, ok: hasLeads && hasD7 },
            { metric: 'D10转化率', formula: 'D10GMV / 2980 / leads数', value: summary.d10Rate, denominator: summary.leads, ok: hasLeads && hasD10 },
            { metric: '封板转化率', formula: '封板成交GMV / 2980 / leads数', value: summary.closedRate, denominator: summary.leads, ok: hasLeads && hasD4 && hasD7 && hasD10 },
          ]
        : mode === 'current-rate'
          ? [
              { metric: '当期成交占比', formula: '当期成交GMV / 封板成交GMV', value: summary.closedGmv > 0 ? summary.currentGmv / summary.closedGmv : null, denominator: summary.closedGmv, ok: hasD4 && hasD7 && hasD10 },
            ]
          : [
              { metric: '追单占比', formula: '追单GMV / 封板成交GMV', value: summary.followRatio, denominator: summary.closedGmv, ok: hasD4 && hasD7 && hasD10 },
              { metric: '封板ROI', formula: '封板成交GMV / 消耗', value: summary.closedRoi, denominator: summary.cost, ok: hasCost && hasD4 && hasD7 && hasD10 },
              { metric: '封板费比', formula: '消耗 / 封板成交GMV', value: summary.closedCostRate, denominator: summary.closedGmv, ok: hasCost && hasD4 && hasD7 && hasD10 },
            ];

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-white text-slate-600">
            <tr>
              <th className="px-2 py-2 text-left">指标</th>
              <th className="px-2 py-2 text-left">公式</th>
              <th className="px-2 py-2 text-right">当前结果</th>
              <th className="px-2 py-2 text-left">字段状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.metric} className="border-t border-slate-200">
                <td className="px-2 py-2">{item.metric}</td>
                <td className="px-2 py-2">{item.formula}</td>
                <td className="px-2 py-2 text-right">
                  {item.metric.includes('ROI')
                    ? formatRatio(item.value, 2)
                    : item.metric.includes('费比') || item.metric.includes('占比') || item.metric.includes('转化率')
                      ? formatPercent(item.value, 2)
                      : formatMoney(item.value)}
                </td>
                <td className="px-2 py-2">{status(item.value, item.denominator, item.ok)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
