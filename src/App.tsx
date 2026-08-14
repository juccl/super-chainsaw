import { useEffect, useState } from 'react';
import { Layout, PageKey } from './components/Layout';
import { normalizeChannelDetailUpload, type ChannelDetailRow, type ChannelDetailUploadRecord } from './lib/channelDetail';
import { parseFile } from './lib/fileParser';
import { readStorage, writeStorage } from './lib/storage';
import { ChannelDetailPage } from './pages/ChannelDetailPage';
import { DataSourcePage, ManualChannelInput } from './pages/DataSourcePage';
import { FeeCalculatorPage } from './pages/FeeCalculatorPage';
import { SkuOverviewPage } from './pages/SkuOverviewPage';

const PAGE_KEY = 'business-dashboard:page:v2';
const SIDEBAR_KEY = 'business-dashboard:sidebar-collapsed';
const CHANNEL_ROWS_KEY = 'channelDetail_cleanedRows';
const CHANNEL_UPLOAD_KEY = 'channelDetail_uploadedFileInfo';
const CHANNEL_UPLOAD_LEGACY_KEY = 'channelDetail_uploadedFile';
const CHANNEL_RAW_ROWS_KEY = 'channelDetail_rawRows';
const CHANNEL_FIELD_MAPPING_KEY = 'channelDetail_fieldMapping';
const OVERVIEW_VISIBLE_METRICS_KEY = 'business-dashboard:sku-overview-visible-metrics:v3';
const OVERVIEW_METRIC_KEYS = [
  'leads',
  'closedGmv',
  'closedRate',
  'closedCostRate',
  'cost',
  'closedRValue',
  'leadCost',
] as const;
const DEFAULT_OVERVIEW_METRICS = [...OVERVIEW_METRIC_KEYS];
type OverviewMetricKey = (typeof OVERVIEW_METRIC_KEYS)[number];

function normalizeArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

function normalizeChannelUploadRecord(input: unknown): ChannelDetailUploadRecord | undefined {
  return input && typeof input === 'object' ? (input as ChannelDetailUploadRecord) : undefined;
}

function normalizePage(input: unknown): PageKey {
  if (input === 'overview' || input === 'detail' || input === 'fee-calculator' || input === 'data-source') return input;
  if (input === 'channel-detail' || input === 'channel-breakdown') return 'detail';
  return 'overview';
}

function normalizeBool(input: unknown, fallback = false): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

function normalizeOverviewMetrics(input: unknown): OverviewMetricKey[] {
  if (!Array.isArray(input)) return [...DEFAULT_OVERVIEW_METRICS];
  const valid = input.filter((item): item is OverviewMetricKey =>
    OVERVIEW_METRIC_KEYS.includes(item as OverviewMetricKey),
  );
  return valid.length ? valid : [...DEFAULT_OVERVIEW_METRICS];
}

export default function App() {
  const [page, setPage] = useState<PageKey>(() => normalizePage(readStorage(PAGE_KEY, 'overview')));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    normalizeBool(readStorage(SIDEBAR_KEY, false), false),
  );
  const [channelRows, setChannelRows] = useState<ChannelDetailRow[]>(() =>
    normalizeArray<ChannelDetailRow>(readStorage<unknown>(CHANNEL_ROWS_KEY, [])),
  );
  const [channelUpload, setChannelUpload] = useState<ChannelDetailUploadRecord | undefined>(() =>
    normalizeChannelUploadRecord(
      readStorage<unknown>(
        CHANNEL_UPLOAD_KEY,
        readStorage<unknown>(CHANNEL_UPLOAD_LEGACY_KEY, undefined),
      ),
    ),
  );
  const [channelRawRows, setChannelRawRows] = useState<unknown[]>(() =>
    normalizeArray<unknown>(readStorage<unknown>(CHANNEL_RAW_ROWS_KEY, [])),
  );
  const [overviewVisibleMetrics, setOverviewVisibleMetrics] = useState<OverviewMetricKey[]>(() =>
    normalizeOverviewMetrics(readStorage(OVERVIEW_VISIBLE_METRICS_KEY, DEFAULT_OVERVIEW_METRICS)),
  );
  const [message, setMessage] = useState('');

  useEffect(() => writeStorage(PAGE_KEY, page), [page]);
  useEffect(() => writeStorage(SIDEBAR_KEY, sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => writeStorage(CHANNEL_ROWS_KEY, channelRows), [channelRows]);
  useEffect(() => writeStorage(CHANNEL_UPLOAD_KEY, channelUpload), [channelUpload]);
  useEffect(() => writeStorage(CHANNEL_RAW_ROWS_KEY, channelRawRows), [channelRawRows]);
  useEffect(() => writeStorage(CHANNEL_FIELD_MAPPING_KEY, channelUpload?.mapping || null), [channelUpload?.mapping]);
  useEffect(() => writeStorage(OVERVIEW_VISIBLE_METRICS_KEY, overviewVisibleMetrics), [overviewVisibleMetrics]);

  const handleChannelUpload = async (file: File) => {
    try {
      const raw = await parseFile(file);
      const normalized = normalizeChannelDetailUpload(file.name, raw);
      setChannelUpload(normalized.upload);
      setChannelRows(normalized.rows);
      setChannelRawRows(raw);
      setMessage('');
      setPage('overview');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '文件解析失败');
    }
  };

  const handleManualChannelRow = (input: ManualChannelInput) => {
    const now = new Date().toISOString();
    const row: ChannelDetailRow = {
      id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      campaign: input.campaign.trim() || '手动营期',
      startDate: '',
      closeDate: '',
      owner: input.owner.trim() || '未填写',
      channelId: input.channelId.trim() || '未填写',
      category: input.category.trim() || '未填写',
      leads: input.leads,
      cost: input.cost,
      d4gmv: input.d4gmv,
      d5gmv: input.d5gmv,
      d6gmv: input.d6gmv,
      d7gmv: input.d7gmv,
      d8gmv: input.d8gmv,
      d9gmv: input.d9gmv,
      d10gmv: input.d10gmv,
      raw: { ...input },
    };

    setChannelRows((prev) => [...prev, row]);
    setChannelRawRows((prev) => [...prev, { ...input }]);
    setChannelUpload((prev) => ({
      id: prev?.id || `manual-${Date.now()}`,
      fileName: prev?.fileName || '手动录入数据',
      fileType: prev?.fileType || 'unknown',
      rawRows: (prev?.rawRows || 0) + 1,
      cleanedRows: (prev?.cleanedRows || 0) + 1,
      filteredRows: prev?.filteredRows || 0,
      headers: prev?.headers || [],
      filterLogs: prev?.filterLogs || {},
      mapping: prev?.mapping || {},
      uploadedAt: now,
    }));
    setMessage('已添加 1 条手动录入数据。');
  };

  const clearChannelData = () => {
    setChannelRows([]);
    setChannelUpload(undefined);
    setChannelRawRows([]);
    if (typeof window !== 'undefined') {
      [
        CHANNEL_UPLOAD_KEY,
        CHANNEL_UPLOAD_LEGACY_KEY,
        CHANNEL_RAW_ROWS_KEY,
        CHANNEL_ROWS_KEY,
        CHANNEL_FIELD_MAPPING_KEY,
        'channelDetail_filters',
        'channelDetail_metricCardConfig',
        'channelDetail_metricCardOrder',
        'channelDetail_chartConfig',
        'channelDetail_filterPanelCollapsed',
        'channelDetail_filterFieldCollapsed',
      ].forEach((key) => window.localStorage.removeItem(key));
    }
    setMessage('已清空渠道经营明细数据源。');
  };

  return (
    <Layout
      page={page}
      onPageChange={setPage}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      topbarExtra={
        page === 'overview' ? (
          <MetricVisibilityControl
            value={overviewVisibleMetrics}
            onChange={setOverviewVisibleMetrics}
          />
        ) : null
      }
    >
      {message ? (
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          {message}
          <button type="button" className="ml-3 font-semibold underline" onClick={() => setMessage('')}>
            关闭
          </button>
        </div>
      ) : null}

      {page === 'overview' ? (
        <SkuOverviewPage rows={channelRows} upload={channelUpload} visibleMetrics={overviewVisibleMetrics} />
      ) : null}
      {page === 'detail' ? <ChannelDetailPage rows={channelRows} upload={channelUpload} viewMode="block2" /> : null}
      {page === 'fee-calculator' ? <FeeCalculatorPage /> : null}
      {page === 'data-source' ? (
        <DataSourcePage
          rows={channelRows}
          upload={channelUpload}
          onUpload={handleChannelUpload}
          onClear={clearChannelData}
          onManualSubmit={handleManualChannelRow}
        />
      ) : null}
    </Layout>
  );
}

function MetricVisibilityControl({
  value,
  onChange,
}: {
  value: OverviewMetricKey[];
  onChange: (value: OverviewMetricKey[]) => void;
}) {
  const options: Array<{ key: OverviewMetricKey; label: string }> = [
    { key: 'leads', label: 'leads 数' },
    { key: 'closedGmv', label: '封板 GMV' },
    { key: 'closedRate', label: '封板转化率' },
    { key: 'closedCostRate', label: '封板费比' },
    { key: 'cost', label: '消耗' },
    { key: 'closedRValue', label: 'R 值' },
    { key: 'leadCost', label: 'leads 成本' },
  ];

  const toggle = (key: OverviewMetricKey) => {
    if (value.includes(key)) {
      onChange(value.filter((item) => item !== key));
      return;
    }
    onChange([...value, key]);
  };

  return (
    <details className="sku-metric-control">
      <summary>指标</summary>
      <div className="sku-metric-menu">
        {options.map((option) => (
          <label key={option.key}>
            <input
              type="checkbox"
              checked={value.includes(option.key)}
              onChange={() => toggle(option.key)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
