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
import { ChevronDown, GripVertical, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type ChannelDetailFilters,
  type ChannelDetailRow,
  type ChannelDetailUploadRecord,
  applyChannelDetailFilters,
  buildChannelCampaignTrend,
  channelDetailFilterOptions,
  emptyChannelDetailFilters,
  summarizeChannelDetailRows,
} from '../lib/channelDetail';
import { formatMoney, formatPercent } from '../lib/formatters';
import { readStorage, writeStorage } from '../lib/storage';

interface SkuOverviewPageProps {
  rows: ChannelDetailRow[];
  upload?: ChannelDetailUploadRecord;
  visibleMetrics?: MetricKey[];
}

type MetricKey = 'leads' | 'closedGmv' | 'closedRate' | 'closedCostRate' | 'cost' | 'closedRValue' | 'leadCost';
type TopSectionKey = 'periodSummary' | 'metrics';
type ModuleKey = 'progress' | 'trend';
type FilterField = 'campaign' | 'owner' | 'channelId' | 'category';
type TrendProductType = 'all' | 'free' | 'book';

const FILTERS_KEY = 'business-dashboard:sku-overview-filters';
const TARGET_KEY = 'business-dashboard:sku-overview-target-gmv';
const TOP_SECTION_ORDER_KEY = 'business-dashboard:sku-overview-top-section-order';
const METRIC_ORDER_KEY = 'business-dashboard:sku-overview-metric-order';
const MODULE_ORDER_KEY = 'business-dashboard:sku-overview-module-order';
const FILTER_ORDER_KEY = 'business-dashboard:sku-overview-filter-order';
const DEFAULT_TOP_SECTION_ORDER: TopSectionKey[] = ['periodSummary', 'metrics'];
const DEFAULT_METRIC_ORDER: MetricKey[] = ['leads', 'closedGmv', 'closedRate', 'closedCostRate', 'cost', 'closedRValue', 'leadCost'];
const DEFAULT_MODULE_ORDER: ModuleKey[] = ['progress', 'trend'];
const DEFAULT_FILTER_ORDER: FilterField[] = ['campaign', 'owner', 'channelId', 'category'];
const PRODUCT_TYPE_OPTIONS: Array<{ key: TrendProductType; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '0 元' },
  { key: 'book', label: '图书' },
];

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

function normalizeOrder<T extends string>(input: unknown, fallback: T[]): T[] {
  if (!Array.isArray(input)) return fallback;
  const valid = input.filter((item): item is T => fallback.includes(item as T));
  const merged = [...valid];
  fallback.forEach((key) => {
    if (!merged.includes(key)) merged.push(key);
  });
  return merged;
}

export function SkuOverviewPage({ rows, upload, visibleMetrics = ['leads', 'closedGmv', 'cost', 'closedRValue', 'leadCost'] }: SkuOverviewPageProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [filters, setFilters] = useState<ChannelDetailFilters>(() => normalizeFilters(readStorage(FILTERS_KEY, emptyChannelDetailFilters())));
  const [openFilter, setOpenFilter] = useState<FilterField | null>(null);
  const [filterSearch, setFilterSearch] = useState<Record<FilterField, string>>({
    campaign: '',
    owner: '',
    channelId: '',
    category: '',
  });
  const [targetGmv, setTargetGmv] = useState<number>(() => {
    const cached = readStorage<number>(TARGET_KEY, 1650000);
    return Number.isFinite(cached) && cached > 0 ? cached : 1650000;
  });
  const [topSectionOrder, setTopSectionOrder] = useState<TopSectionKey[]>(() => normalizeOrder(readStorage(TOP_SECTION_ORDER_KEY, DEFAULT_TOP_SECTION_ORDER), DEFAULT_TOP_SECTION_ORDER));
  const [metricOrder, setMetricOrder] = useState<MetricKey[]>(() => normalizeOrder(readStorage(METRIC_ORDER_KEY, DEFAULT_METRIC_ORDER), DEFAULT_METRIC_ORDER));
  const [moduleOrder, setModuleOrder] = useState<ModuleKey[]>(() => normalizeOrder(readStorage(MODULE_ORDER_KEY, DEFAULT_MODULE_ORDER), DEFAULT_MODULE_ORDER));
  const [filterOrder, setFilterOrder] = useState<FilterField[]>(() => normalizeOrder(readStorage(FILTER_ORDER_KEY, DEFAULT_FILTER_ORDER), DEFAULT_FILTER_ORDER));
  const [visibleLines, setVisibleLines] = useState({ hyq: true, ly: true });
  const [trendProductType, setTrendProductType] = useState<TrendProductType>('all');
  const [chinaNow, setChinaNow] = useState<Date>(() => new Date());

  useEffect(() => writeStorage(FILTERS_KEY, filters), [filters]);
  useEffect(() => writeStorage(TARGET_KEY, targetGmv), [targetGmv]);
  useEffect(() => writeStorage(TOP_SECTION_ORDER_KEY, topSectionOrder), [topSectionOrder]);
  useEffect(() => writeStorage(METRIC_ORDER_KEY, metricOrder), [metricOrder]);
  useEffect(() => writeStorage(MODULE_ORDER_KEY, moduleOrder), [moduleOrder]);
  useEffect(() => writeStorage(FILTER_ORDER_KEY, filterOrder), [filterOrder]);
  useEffect(() => {
    const timer = window.setInterval(() => setChinaNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const options = useMemo(() => channelDetailFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => applyChannelDetailFilters(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarizeChannelDetailRows(filteredRows), [filteredRows]);
  const campaignTrend = useMemo(() => buildChannelCampaignTrend(filteredRows), [filteredRows]);
  const trendFilteredRows = useMemo(
    () => filterRowsByTrendProductType(filteredRows, trendProductType),
    [filteredRows, trendProductType],
  );
  const trendData = useMemo(
    () =>
      campaignTrend.map((item) => ({
        campaign: shortenCampaignName(item.campaign),
        leads: item.summary.leads,
        rate: item.summary.closedRate ? item.summary.closedRate * 100 : 0,
      })),
    [campaignTrend],
  );
  const conversionTrendData = useMemo(() => buildConversionTrend(trendFilteredRows), [trendFilteredRows]);
  const leadBreakdown = useMemo(() => buildLeadBreakdown(filteredRows), [filteredRows]);
  const periodSummary = useMemo(
    () => buildPeriodSummary(chinaNow, summary.leads, summary.closedGmv),
    [chinaNow, summary.leads, summary.closedGmv],
  );

  const metrics: Record<MetricKey, { label: string; value: string; hot?: boolean; tone: string }> = {
    leads: { label: 'leads 数', value: `${formatMoney(summary.leads)}个`, tone: 'blue' },
    closedGmv: { label: '封板成交 GMV', value: `¥${formatMoney(summary.closedGmv)}`, hot: true, tone: 'sky' },
    closedRate: { label: '封板转化率', value: formatPercent(summary.closedRate, 2), tone: 'green' },
    closedCostRate: { label: '封板费比', value: formatPercent(summary.closedCostRate, 1), tone: 'rose' },
    cost: { label: '消耗', value: `¥${formatMoney(summary.cost)}`, tone: 'amber' },
    closedRValue: { label: 'R 值', value: summary.closedRValue == null ? '-' : summary.closedRValue.toFixed(1), tone: 'violet' },
    leadCost: { label: 'leads 成本', value: summary.leadCost == null ? '-' : `¥${summary.leadCost.toFixed(1)}`, tone: 'orange' },
  };
  const visibleMetricOrder = metricOrder.filter((key) => visibleMetrics.includes(key));

  const progress = targetGmv > 0 ? Math.min(100, Math.max(0, (summary.closedGmv / targetGmv) * 100)) : 0;
  const ringRadius = 60;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = (ringCircumference * progress) / 100;
  const auxCards = [
    {
      label: '追单占比',
      value: formatPercent(summary.followRatio, 1),
      detail: '追单 GMV / 封板 GMV',
    },
    {
      label: 'leads 成本',
      value: summary.leadCost == null ? '-' : `¥${summary.leadCost.toFixed(1)}`,
      detail: '消耗 / leads',
    },
    {
      label: 'R 值',
      value: summary.closedRValue == null ? '-' : summary.closedRValue.toFixed(1),
      detail: '封板 GMV / leads',
    },
  ];

  const onMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = metricOrder.indexOf(active.id as MetricKey);
    const newIndex = metricOrder.indexOf(over.id as MetricKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setMetricOrder(arrayMove(metricOrder, oldIndex, newIndex));
  };

  const onTopSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topSectionOrder.indexOf(active.id as TopSectionKey);
    const newIndex = topSectionOrder.indexOf(over.id as TopSectionKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setTopSectionOrder(arrayMove(topSectionOrder, oldIndex, newIndex));
  };

  const onModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = moduleOrder.indexOf(active.id as ModuleKey);
    const newIndex = moduleOrder.indexOf(over.id as ModuleKey);
    if (oldIndex < 0 || newIndex < 0) return;
    setModuleOrder(arrayMove(moduleOrder, oldIndex, newIndex));
  };

  const onFilterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filterOrder.indexOf(active.id as FilterField);
    const newIndex = filterOrder.indexOf(over.id as FilterField);
    if (oldIndex < 0 || newIndex < 0) return;
    setFilterOrder(arrayMove(filterOrder, oldIndex, newIndex));
  };

  const filterConfigs: Record<FilterField, { label: string; selected: string[]; options: string[]; search: string }> = {
    campaign: { label: '营期', selected: filters.campaign, options: options.campaign, search: filterSearch.campaign },
    owner: { label: '归属人', selected: filters.owner, options: options.owner, search: filterSearch.owner },
    channelId: { label: '渠道号', selected: filters.channelId, options: options.channelId, search: filterSearch.channelId },
    category: { label: '分类', selected: filters.category, options: options.category, search: filterSearch.category },
  };

  const renderFilterMenu = (field: FilterField) => {
    const config = filterConfigs[field];
    return (
      <FilterMenu
        field={field}
        label={config.label}
        selected={config.selected}
        options={config.options}
        open={openFilter === field}
        search={config.search}
        onOpenChange={(open) => setOpenFilter(open ? field : null)}
        onSearch={(value) => setFilterSearch((prev) => ({ ...prev, [field]: value }))}
        onChange={(selected) => setFilters((prev) => ({ ...prev, [field]: selected }))}
      />
    );
  };

  const renderPeriodSummary = () => (
    <section className="sku-period-summary">
      <div className="sku-period-main">
        <div className="sku-period-icon">
          <TrendingUp size={20} />
        </div>
        <div>
          <h2>本期经营摘要</h2>
          <p>{periodSummary.summaryHint}</p>
        </div>
        <div className="sku-period-mini" aria-label={`${periodSummary.monthLabel} ${periodSummary.currentDay}/${periodSummary.daysInMonth}`}>
          <svg width="120" height="38" viewBox="0 0 112 38" fill="none" aria-hidden>
            <line x1="8" y1="24" x2="104" y2="24" stroke="#dbeafe" strokeWidth="3" strokeLinecap="round" />
            <line x1="8" y1="24" x2={periodSummary.progressX} y2="24" stroke="#5b8def" strokeWidth="3.2" strokeLinecap="round" />
            {periodSummary.weekMarks.map((x) => (
              <circle key={x} cx={x} cy="24" r="1.6" fill="#bfdbfe" />
            ))}
            <circle cx={periodSummary.progressX} cy="24" r="3" fill="#34d399" />
          </svg>
          <span>{periodSummary.monthLabel} {periodSummary.currentDay}/{periodSummary.daysInMonth}</span>
        </div>
      </div>
      <div className="sku-period-metrics">
        <div>
          <span>leads数</span>
          <strong>{formatMoney(periodSummary.leads)}</strong>
        </div>
        <div>
          <span>总成交额</span>
          <strong>{formatMoney(periodSummary.totalGmv)}</strong>
        </div>
        <div className="sku-period-bar">
          <i style={{ width: `${periodSummary.monthProgress}%` }} />
        </div>
      </div>
    </section>
  );

  const renderMetricCards = () => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll onDragEnd={onMetricDragEnd}>
      <SortableContext items={visibleMetricOrder} strategy={rectSortingStrategy}>
        <section className="sku-metrics">
          {visibleMetricOrder.map((key) => (
            <SortableShell key={key} id={key}>
              <article className={`sku-metric ${metrics[key].hot ? 'hot' : ''} metric-${metrics[key].tone}`}>
                <span>{metrics[key].label}</span>
                <strong>{metrics[key].value}</strong>
                <i>⋮⋮</i>
              </article>
            </SortableShell>
          ))}
        </section>
      </SortableContext>
    </DndContext>
  );

  if (!rows.length) {
    return (
      <section className="sku-empty">
        <h2>先上传渠道经营明细数据源</h2>
        <p>总览会直接使用这一个常用数据源计算 leads、封板成交 GMV、封板转化率和封板费比。</p>
      </section>
    );
  }

  return (
    <div className="sku-stack">
      <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={false} onDragEnd={onFilterDragEnd}>
        <SortableContext items={filterOrder} strategy={rectSortingStrategy}>
          <section className="sku-filters" aria-label="筛选器排序">
            {filterOrder.map((field) => (
              <SortableShell key={field} id={field} className="sku-filter-sortable" handleClassName="sku-filter-drag-handle">
                {renderFilterMenu(field)}
              </SortableShell>
            ))}
          </section>
        </SortableContext>
      </DndContext>

      <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll onDragEnd={onTopSectionDragEnd}>
        <SortableContext items={topSectionOrder} strategy={rectSortingStrategy}>
          {topSectionOrder.map((key) => (
            <SortableShell key={key} id={key} className={`sku-top-sortable sku-top-sortable-${key}`} handleClassName="sku-section-drag-handle">
              {key === 'periodSummary' ? renderPeriodSummary() : renderMetricCards()}
            </SortableShell>
          ))}
        </SortableContext>
      </DndContext>

      <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll onDragEnd={onModuleDragEnd}>
        <SortableContext items={moduleOrder} strategy={rectSortingStrategy}>
          <section className="sku-dashboard-grid">
            {moduleOrder.map((key) => (
              <SortableShell key={key} id={key} className={`sku-dashboard-module-${key}`}>
                {key === 'progress' ? (
                  <section className="sku-card sku-target-card">
                    <div className="sku-card-head">
                      <div>
                        <h2>任务目标完成度</h2>
                        <p>封板 GMV/目标 GMV</p>
                      </div>
                      <span>⋮⋮</span>
                    </div>
                    <div className="sku-target-body">
                      <svg className="sku-progress-ring" viewBox="0 0 168 168" aria-label={`任务目标完成度 ${progress.toFixed(0)}%`}>
                        <circle className="sku-progress-track" cx="84" cy="84" r={ringRadius} />
                        <circle
                          className="sku-progress-value"
                          cx="84"
                          cy="84"
                          r={ringRadius}
                          style={{ strokeDasharray: `${ringProgress} ${Math.max(ringCircumference - ringProgress, 0)}` }}
                        />
                      </svg>
                      <div className="sku-target-center">
                        <strong>{progress.toFixed(0)}%</strong>
                        <span>of target</span>
                      </div>
                    </div>
                    <div className="sku-target-current">
                      <span>封板 GMV</span>
                      <strong>{formatCompactWan(summary.closedGmv)}</strong>
                    </div>
                    <div className="sku-progress-row">
                      <label>
                        <span>目标 GMV</span>
                        <input
                          type="number"
                          min={1}
                          step={10000}
                          value={Math.round(targetGmv)}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (Number.isFinite(next) && next > 0) setTargetGmv(next);
                          }}
                        />
                      </label>
                    </div>
                  </section>
                ) : (
                  <section className="sku-card sku-trend-card">
                    <div className="sku-card-head">
                      <div>
                        <h2>营期转化走势</h2>
                        <p>横轴为营期代号，HYQ 与 LY 分别展示封板转化率。</p>
                      </div>
                      <div className="sku-trend-controls">
                        <div className="sku-product-toggle" aria-label="商品类型筛选">
                          {PRODUCT_TYPE_OPTIONS.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              className={trendProductType === option.key ? 'active' : ''}
                              aria-pressed={trendProductType === option.key}
                              onClick={() => setTrendProductType(option.key)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <div className="sku-line-legend" aria-label="转化率图例">
                          <button
                            type="button"
                            className={visibleLines.hyq ? '' : 'muted'}
                            aria-pressed={visibleLines.hyq}
                            onClick={() => setVisibleLines((prev) => ({ ...prev, hyq: !prev.hyq }))}
                          >
                            <i className="hyq" />HYQ
                          </button>
                          <button
                            type="button"
                            className={visibleLines.ly ? '' : 'muted'}
                            aria-pressed={visibleLines.ly}
                            onClick={() => setVisibleLines((prev) => ({ ...prev, ly: !prev.ly }))}
                          >
                            <i className="ly" />LY
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="sku-line-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={conversionTrendData} margin={{ left: 0, right: 18, top: 34, bottom: 20 }}>
                          <CartesianGrid stroke="#e3e7ec" vertical={false} />
                          <XAxis
                            dataKey="code"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#7b828d', fontSize: 12 }}
                            tickMargin={14}
                            minTickGap={12}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#7b828d', fontSize: 12 }}
                            tickMargin={10}
                            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                          />
                          <Tooltip
                            labelFormatter={(label) => `营期 ${label}`}
                            formatter={(value, name, item) => {
                              const dataKey =
                                item && typeof item === 'object' && 'dataKey' in item
                                  ? String((item as { dataKey?: unknown }).dataKey)
                                  : '';
                              const seriesName = String(name);
                              const label = dataKey === 'hyqRate' || seriesName === 'hyqRate' || seriesName === 'HYQ' ? 'HYQ' : 'LY';
                              return [typeof value === 'number' ? `${value.toFixed(2)}%` : '-', label];
                            }}
                          />
                          {visibleLines.hyq ? (
                            <Line
                              type="monotone"
                              dataKey="hyqRate"
                              name="HYQ"
                              stroke="#145184"
                              strokeWidth={3}
                              connectNulls
                              dot={{ r: 4, strokeWidth: 2, fill: '#f7fafc', stroke: '#145184' }}
                            >
                              <LabelList dataKey="hyqRate" position="top" offset={12} formatter={formatRateLabel} fill="#145184" fontSize={11} fontWeight={700} />
                            </Line>
                          ) : null}
                          {visibleLines.ly ? (
                            <Line
                              type="monotone"
                              dataKey="lyRate"
                              name="LY"
                              stroke="#9a4f3f"
                              strokeWidth={3}
                              connectNulls
                              dot={{ r: 4, strokeWidth: 2, fill: '#f7fafc', stroke: '#9a4f3f' }}
                            >
                              <LabelList dataKey="lyRate" position="top" offset={12} formatter={formatRateLabel} fill="#9a4f3f" fontSize={11} fontWeight={700} />
                            </Line>
                          ) : null}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                )}
              </SortableShell>
            ))}
            <section className="sku-card sku-leads-card">
              <div className="sku-card-head">
                <div>
                  <h2>leads 明细</h2>
                  <p>横轴显示筛选后的营期简称，柱形为每个营期 leads 数。</p>
                </div>
                <strong>{formatMoney(summary.leads)}个</strong>
              </div>
              <div className="sku-leads-split">
                <div className="sku-bars-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ left: 0, right: 14, top: 28, bottom: 2 }} barCategoryGap="28%">
                      <CartesianGrid stroke="#dce8f7" vertical={false} />
                      <XAxis dataKey="campaign" tickLine={false} axisLine={false} tick={{ fill: '#5b7695', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5b7695', fontSize: 12 }} />
                      <Tooltip formatter={(value) => [formatMoney(Number(value)), 'leads']} />
                      <Bar dataKey="leads" radius={[5, 5, 5, 5]} maxBarSize={28}>
                        <LabelList dataKey="leads" position="top" formatter={(value: number) => formatMoney(value)} fill="#2a648e" fontSize={11} fontWeight={700} />
                        {trendData.map((_, index) => (
                          <Cell key={`lead-cell-${index}`} fill={index % 2 === 0 ? '#4f91c9' : '#7db6df'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="sku-leads-side">
                  {leadBreakdown.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}：</span>
                      <strong>{formatMoney(item.leads)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            {auxCards.map((card, index) => (
              <section key={card.label} className={`sku-card sku-dashboard-aux sku-dashboard-aux-${index + 1}`}>
                <div>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </div>
              </section>
            ))}
          </section>
        </SortableContext>
      </DndContext>

      {upload ? null : <div className="text-sm text-[#7b776e]">当前数据来自本地缓存或手动录入。</div>}
    </div>
  );
}

function FilterMenu({
  field,
  label,
  selected,
  options,
  open,
  search,
  onOpenChange,
  onSearch,
  onChange,
}: {
  field: FilterField;
  label: string;
  selected: string[];
  options: string[];
  open: boolean;
  search: string;
  onOpenChange: (open: boolean) => void;
  onSearch: (value: string) => void;
  onChange: (value: string[]) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions = normalizedSearch
    ? options.filter((option) => option.toLowerCase().includes(normalizedSearch))
    : options;
  const summary = selected.length ? `${selected.length} 项` : '全部';
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <div className={`sku-filter-menu ${open ? 'open' : ''}`}>
      <button type="button" className="sku-filter-trigger" onClick={() => onOpenChange(!open)}>
        <span>{label}</span>
        <strong>{summary}</strong>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="sku-filter-popover">
          <div className="sku-filter-popover-head">
            <strong>{label}（{summary}）</strong>
            <button type="button" onClick={() => onOpenChange(false)}>收起</button>
          </div>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={`搜索${label}`}
            aria-label={`搜索${label}`}
          />
          <div className="sku-filter-tools">
            <button type="button" onClick={() => onChange(visibleOptions)}>全选</button>
            <button type="button" onClick={() => onChange([])}>清空</button>
          </div>
          <div className="sku-filter-options">
            {visibleOptions.map((option) => (
              <label key={`${field}-${option}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableShell({
  id,
  children,
  className = '',
  handleClassName,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  handleClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const shellDragProps = handleClassName ? {} : { ...attributes, ...listeners };
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[className, isDragging ? 'sku-dragging' : ''].filter(Boolean).join(' ')}
      {...shellDragProps}
    >
      {handleClassName ? (
        <button type="button" className={handleClassName} aria-label="拖动排序" {...attributes} {...listeners}>
          <GripVertical size={15} strokeWidth={2.2} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

function shortenCampaignName(campaign: string): string {
  const match = campaign.match(/(\d{3})\.\d+\.([A-Za-z]+)/);
  if (!match) return campaign.replace(/^钢琴/, '').slice(0, 6) || '未填写';
  const suffix = match[2].replace(/LS$/i, '');
  return `${match[1]}${suffix}`;
}

function filterRowsByTrendProductType(rows: ChannelDetailRow[], productType: TrendProductType): ChannelDetailRow[] {
  if (productType === 'all') return rows;
  return rows.filter((row) => {
    const category = normalizeCategory(row.category);
    if (productType === 'free') return category.includes('0元');
    return category.includes('图书');
  });
}

function buildConversionTrend(rows: ChannelDetailRow[]): Array<{ code: string; hyqRate: number | null; lyRate: number | null }> {
  const groups = new Map<string, { hyq: ChannelDetailRow[]; ly: ChannelDetailRow[] }>();

  rows.forEach((row) => {
    const parsed = parseCampaignVariant(row.campaign);
    if (!parsed) return;
    const group = groups.get(parsed.code) ?? { hyq: [], ly: [] };
    if (parsed.type === 'HYQ') group.hyq.push(row);
    if (parsed.type === 'LY') group.ly.push(row);
    groups.set(parsed.code, group);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([code, group]) => ({
      code,
      hyqRate: group.hyq.length ? (summarizeChannelDetailRows(group.hyq).closedRate ?? 0) * 100 : null,
      lyRate: group.ly.length ? (summarizeChannelDetailRows(group.ly).closedRate ?? 0) * 100 : null,
    }));
}

function parseCampaignVariant(campaign: string): { code: string; type: 'HYQ' | 'LY' } | null {
  const match = campaign.match(/(\d{3})\.\d+\.([A-Za-z]+)/);
  if (!match) return null;
  const variant = match[2].toUpperCase();
  if (variant.includes('HYQ')) return { code: match[1], type: 'HYQ' };
  if (variant.includes('LY')) return { code: match[1], type: 'LY' };
  return null;
}

function formatRateLabel(value: unknown): string {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : '';
}

function buildLeadBreakdown(rows: ChannelDetailRow[]): Array<{ label: string; leads: number }> {
  return rows.reduce(
    (acc, row) => {
      const category = normalizeCategory(row.category);
      if (category.includes('0元')) {
        acc[0].leads += row.leads;
      } else if (category.includes('图书')) {
        acc[1].leads += row.leads;
      } else {
        acc[2].leads += row.leads;
      }
      return acc;
    },
    [
      { label: '0 元', leads: 0 },
      { label: '图书', leads: 0 },
      { label: '其他', leads: 0 },
    ],
  );
}

function normalizeCategory(category: string): string {
  return (category || '未填写').replace(/\s+/g, '');
}

function formatCompactWan(value: number): string {
  return `${(value / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })}万`;
}

function buildPeriodSummary(now: Date, leads: number, totalGmv: number) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0');
  const year = getPart('year');
  const month = getPart('month');
  const currentDay = getPart('day');
  const hour = getPart('hour');
  const daysInMonth = new Date(year, month, 0).getDate();
  const summaryHint =
    hour >= 5 && hour <= 10
      ? '早间先看规模与节奏，快速判断今日经营起点。'
      : hour >= 11 && hour <= 13
        ? '中午复盘半日波动，及时修正投放与承接动作。'
        : hour >= 14 && hour <= 17
          ? '下午重点看营期变化，提前准备晚间转化承接。'
          : hour >= 18 && hour <= 23
            ? '晚间关注转化效率与课程承接，沉淀今日复盘结论。'
            : '夜间看趋势稳定性，为明天的经营动作做准备。';
  const monthProgress = Math.max(0, Math.min(100, (currentDay / Math.max(daysInMonth, 1)) * 100));
  return {
    leads,
    totalGmv,
    currentDay,
    daysInMonth,
    monthLabel: `${month}月进度`,
    monthProgress,
    progressX: 8 + (96 * monthProgress) / 100,
    summaryHint,
    weekMarks: [8, 32, 56, 80, 104],
  };
}
