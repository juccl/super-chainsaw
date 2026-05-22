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
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
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
import {
  type ChannelDetailFilters,
  type ChannelDetailRow,
  type ChannelDetailSummary,
  type ChannelDetailUploadRecord,
  applyChannelDetailFilters,
  buildChannelCampaignTrend,
  buildDimensionBreakdown,
  channelDetailFilterOptions,
  emptyChannelDetailFilters,
  summarizeChannelDetailRows,
} from '../lib/channelDetail';
import { formatMoney, formatPercent, formatRatio } from '../lib/formatters';
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
};

type DimensionKey = 'owner' | 'channelId' | 'category';
type HeatmapSortKey = 'closedRate' | 'd4Rate' | 'followRatio';
type BlockOneTab = 'all' | 'day' | 'current' | 'ratio';

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

  useEffect(() => writeStorage(STORAGE.filters, filters), [filters]);
  useEffect(() => writeStorage(STORAGE.chartConfig, chartConfig), [chartConfig]);
  useEffect(() => writeStorage(STORAGE.filterPanelCollapsed, panelCollapsed), [panelCollapsed]);
  useEffect(() => writeStorage(STORAGE.filterFieldCollapsed, fieldCollapsed), [fieldCollapsed]);
  useEffect(() => writeStorage(STORAGE.favoriteOwners, favoriteOwners), [favoriteOwners]);
  useEffect(() => writeStorage(STORAGE.metricCardConfig, metricVisible), [metricVisible]);
  useEffect(() => writeStorage(STORAGE.metricCardOrder, metricOrder), [metricOrder]);
  useEffect(() => writeStorage(STORAGE.blockOneTab, blockOneTab), [blockOneTab]);

  const options = useMemo(() => channelDetailFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => applyChannelDetailFilters(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarizeChannelDetailRows(filteredRows), [filteredRows]);
  const campaignTrend = useMemo(() => buildChannelCampaignTrend(filteredRows), [filteredRows]);
  const breakdown = useMemo(
    () => buildDimensionBreakdown(filteredRows, chartConfig.dimension),
    [filteredRows, chartConfig.dimension],
  );

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

  const rankData = useMemo(
    () =>
      breakdown.slice(0, 12).map((item) => ({
        key: item.key,
        closedRate: item.summary.closedRate,
        closedGmv: item.summary.closedGmv,
        leads: item.summary.leads,
        closedRoi: item.summary.closedRoi,
      })),
    [breakdown],
  );

  const compareData = useMemo(
    () =>
      breakdown.slice(0, 12).map((item) => ({
        key: item.key,
        currentGmv: item.summary.currentGmv,
        followGmv: item.summary.followGmv,
        followRatio: item.summary.followRatio,
      })),
    [breakdown],
  );

  const heatmapRows = useMemo(() => {
    const sorted = [...breakdown].sort((a, b) => {
      const av = pickSortMetric(a.summary, chartConfig.heatmapSort) ?? -1;
      const bv = pickSortMetric(b.summary, chartConfig.heatmapSort) ?? -1;
      return bv - av;
    });
    return sorted.slice(0, 24);
  }, [breakdown, chartConfig.heatmapSort]);

  const heatmapMax = useMemo(() => {
    let max = 0;
    heatmapRows.forEach((item) => {
      DAY_KEYS.forEach((day) => {
        const rate = getDayRate(item.summary, day) || 0;
        if (rate > max) max = rate;
      });
    });
    return max || 0.0001;
  }, [heatmapRows]);

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
      <section className="panel bg-white p-4">
        <h2 className="text-lg font-semibold text-ink">渠道经营明细</h2>
        <p className="mt-1 text-sm text-muted">观察渠道营期 D4～D10 单日转化表现，拆解当期转化、追单转化与封板转化。</p>
        <div className="mt-3 grid gap-2 rounded-xl border border-sky-200 bg-sky-50/40 p-3 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-4">
          <div>文件名：{upload?.fileName || '-'}</div>
          <div>上传时间：{upload?.uploadedAt ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
          <div>原始行数：{upload?.rawRows ? upload.rawRows.toLocaleString('zh-CN') : '-'}</div>
          <div>清洗后行数：{upload?.cleanedRows ? upload.cleanedRows.toLocaleString('zh-CN') : '-'}</div>
          <div>过滤行数：{upload?.filteredRows ? upload.filteredRows.toLocaleString('zh-CN') : '-'}</div>
          <div>字段识别状态：{channelFieldStatus(upload)}</div>
          <div className="md:col-span-2 xl:col-span-2">状态：{upload ? '已启用本地缓存，刷新后自动恢复数据' : '-'}</div>
        </div>
      </section>
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
              <div className="grid w-full gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
            )}

            {viewMode !== 'block2' && (blockOneTab === 'all' || blockOneTab === 'day') ? (
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">板块二：个人 / 渠道拆解</h3>
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {[
                  { key: 'owner' as const, label: '按渠道归属人' },
                  { key: 'channelId' as const, label: '按渠道号' },
                  { key: 'category' as const, label: '按分类' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setChartConfig((prev) => ({ ...prev, dimension: item.key }))}
                    className={`rounded-lg px-3 py-1.5 text-sm ${chartConfig.dimension === item.key ? 'bg-sky-50 font-semibold text-sky-700 ring-1 ring-sky-200' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <ChartCard title={`${dimensionLabel(chartConfig.dimension)}封板转化率排名`} subtitle="同时对比封板GMV、leads数与封板ROI。">
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankData} margin={{ left: 8, right: 12, top: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
                    <XAxis dataKey="key" tick={{ fill: '#64748b', fontSize: 12 }} angle={-22} textAnchor="end" height={78} interval={0} />
                    <YAxis yAxisId="left" tickFormatter={(value) => `${value * 100}%`} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = rankData.find((item) => item.key === label);
                        return (
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                            <div className="mb-1 font-medium text-ink">{String(label)}</div>
                            <div className="text-slate-600">封板转化率：{formatPercent(row?.closedRate ?? null, 2)}</div>
                            <div className="text-slate-600">封板GMV：{formatMoney(row?.closedGmv ?? null)}</div>
                            <div className="text-slate-600">leads数：{formatMoney(row?.leads ?? null)}</div>
                            <div className="text-slate-600">封板ROI：{formatRatio(row?.closedRoi ?? null, 2)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar yAxisId="left" dataKey="closedRate" name="封板转化率" fill="#5b8def" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="closedRate" position="top" formatter={(value: number) => formatPercent(value, 1)} fontSize={12} fill="#5b8def" />
                    </Bar>
                    <Bar yAxisId="right" dataKey="closedGmv" name="封板GMV" fill="#4db6ac" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="D4～D10 单日转化率热力图" subtitle="支持维度切换和排序，颜色越深表示单日转化率越高。">
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                <span className="text-xs text-slate-600">排序：</span>
                {[
                  { key: 'closedRate' as const, label: '封板转化率' },
                  { key: 'd4Rate' as const, label: 'D4转化率' },
                  { key: 'followRatio' as const, label: '追单占比' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${chartConfig.heatmapSort === item.key ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-white'}`}
                    onClick={() => setChartConfig((prev) => ({ ...prev, heatmapSort: item.key }))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 bg-[#f1f5fb] text-xs text-slate-600">
                    <tr>
                      <th className="border-b border-line px-3 py-2 text-left font-semibold">{dimensionLabel(chartConfig.dimension)}</th>
                      {DAY_KEYS.map((day) => (
                        <th key={day} className="border-b border-line px-3 py-2 text-right font-semibold">{`D${day}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapRows.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/70">
                        <td className="border-b border-line px-3 py-2 text-sm font-medium text-slate-700">{item.key}</td>
                        {DAY_KEYS.map((day) => {
                          const value = getDayRate(item.summary, day);
                          return (
                            <td
                              key={day}
                              className="border-b border-line px-3 py-2 text-right tabular-nums"
                              style={{ background: heatColor(value, heatmapMax) }}
                              title={value === null ? '-' : formatPercent(value, 2)}
                            >
                              {formatPercent(value, 1)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="主转化期与追单期贡献对比" subtitle="判断维度项是靠 D4～D7 主转化，还是依赖 D8～D10 追单补量。">
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} margin={{ left: 8, right: 12, top: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
                    <XAxis dataKey="key" tick={{ fill: '#64748b', fontSize: 12 }} angle={-22} textAnchor="end" height={78} interval={0} />
                    <YAxis yAxisId="left" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = compareData.find((item) => item.key === label);
                        return (
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                            <div className="mb-1 font-medium text-ink">{String(label)}</div>
                            <div className="text-slate-600">当期成交GMV：{formatMoney(row?.currentGmv ?? null)}</div>
                            <div className="text-slate-600">追单GMV：{formatMoney(row?.followGmv ?? null)}</div>
                            <div className="text-slate-600">追单占比：{formatPercent(row?.followRatio ?? null, 2)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar yAxisId="left" dataKey="currentGmv" name="当期成交GMV" fill="#5b8def" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="left" dataKey="followGmv" name="追单GMV" fill="#4db6ac" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="followRatio" name="追单占比" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
    <div className="h-[392px] pt-1">
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
        <div className="flex h-[340px] items-center justify-center">
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
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e7ebf0" strokeOpacity={0.6} />
            <XAxis dataKey="campaign" angle={-30} textAnchor="end" height={88} interval={0} minTickGap={8} tick={{ fill: '#64748b', fontSize: 12 }} />
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

function getDayRate(summary: ChannelDetailSummary, day: 4 | 5 | 6 | 7 | 8 | 9 | 10): number | null {
  if (day === 4) return summary.d4Rate;
  if (day === 5) return summary.d5Rate;
  if (day === 6) return summary.d6Rate;
  if (day === 7) return summary.d7Rate;
  if (day === 8) return summary.d8Rate;
  if (day === 9) return summary.d9Rate;
  return summary.d10Rate;
}

function dimensionLabel(key: DimensionKey): string {
  if (key === 'owner') return '渠道归属人';
  if (key === 'channelId') return '渠道号';
  return '分类';
}

function heatColor(value: number | null, max: number): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return 'transparent';
  const ratio = Math.min(1, Math.max(0.08, value / max));
  return `rgba(59, 130, 246, ${ratio.toFixed(2)})`;
}

function pickSortMetric(summary: ChannelDetailSummary, sort: HeatmapSortKey): number | null {
  if (sort === 'd4Rate') return summary.d4Rate;
  if (sort === 'followRatio') return summary.followRatio;
  return summary.closedRate;
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
