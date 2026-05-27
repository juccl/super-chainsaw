import { useEffect, useMemo, useState } from 'react';
import { DailyInspiration } from './components/DailyInspiration';
import { GlobalFilters } from './components/GlobalFilters';
import { Layout, PageKey } from './components/Layout';
import { EmptyState } from './components/EmptyState';
import { normalizeUpload } from './lib/dataCleaner';
import { normalizeChannelDetailUpload, type ChannelDetailRow, type ChannelDetailUploadRecord } from './lib/channelDetail';
import { parseFile } from './lib/fileParser';
import { applyFilters, emptyFilters } from './lib/metrics';
import { readStorage, writeStorage } from './lib/storage';
import { ChannelDetailPage } from './pages/ChannelDetailPage';
import { FeeCalculatorPage } from './pages/FeeCalculatorPage';
import { OverviewPage } from './pages/OverviewPage';
import { PersonalOverviewPage } from './pages/PersonalOverviewPage';
import { Filters, StandardRow, UploadRecord } from './types';

const ROWS_KEY = 'business-dashboard:single-table-rows';
const UPLOAD_KEY = 'business-dashboard:single-table-upload';
const FILTERS_KEY = 'business-dashboard:filters';
const PAGE_KEY = 'business-dashboard:page';
const SIDEBAR_KEY = 'business-dashboard:sidebar-collapsed';
const OWNER_KEY = 'personalCurrentOwnerFilter';
const LEGACY_OWNER_KEY = 'business-dashboard:owner-selection';
const CHANNEL_ROWS_KEY = 'channelDetail_cleanedRows';
const CHANNEL_UPLOAD_KEY = 'channelDetail_uploadedFileInfo';
const CHANNEL_UPLOAD_LEGACY_KEY = 'channelDetail_uploadedFile';
const CHANNEL_RAW_ROWS_KEY = 'channelDetail_rawRows';
const CHANNEL_FIELD_MAPPING_KEY = 'channelDetail_fieldMapping';

function normalizeArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

function normalizeUploadRecord(input: unknown): UploadRecord | undefined {
  return input && typeof input === 'object' ? (input as UploadRecord) : undefined;
}

function normalizeChannelUploadRecord(input: unknown): ChannelDetailUploadRecord | undefined {
  return input && typeof input === 'object' ? (input as ChannelDetailUploadRecord) : undefined;
}

function normalizeFilters(input: unknown): Filters {
  const fallback = emptyFilters();
  if (!input || typeof input !== 'object') return fallback;
  const value = input as Partial<Record<keyof Filters, unknown>>;
  const asArray = (v: unknown) => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []);
  return {
    channel: asArray(value.channel),
    channelId: asArray(value.channelId),
    channelOwner: asArray(value.channelOwner),
    productType: asArray(value.productType),
    campaign: asArray(value.campaign),
  };
}

function normalizePage(input: unknown): PageKey {
  if (
    input === 'overview' ||
    input === 'personal' ||
    input === 'channel-detail' ||
    input === 'channel-breakdown' ||
    input === 'fee-calculator'
  ) {
    return input;
  }
  if (input === 'channel') return 'channel-detail';
  return 'overview';
}

function normalizeOwnerSelection(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeBool(input: unknown, fallback = false): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

export default function App() {
  const [page, setPage] = useState<PageKey>(() => normalizePage(readStorage(PAGE_KEY, 'overview')));
  const [rows, setRows] = useState<StandardRow[]>(() =>
    normalizeArray<StandardRow>(readStorage<unknown>(ROWS_KEY, [])),
  );
  const [upload, setUpload] = useState<UploadRecord | undefined>(() =>
    normalizeUploadRecord(readStorage<unknown>(UPLOAD_KEY, undefined)),
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
  const [filters, setFilters] = useState<Filters>(() => normalizeFilters(readStorage(FILTERS_KEY, emptyFilters())));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => normalizeBool(readStorage(SIDEBAR_KEY, false), false));
  const [ownerSelection, setOwnerSelection] = useState<string[]>(
    () => normalizeOwnerSelection(readStorage(OWNER_KEY, readStorage(LEGACY_OWNER_KEY, []))),
  );
  const [message, setMessage] = useState('');

  useEffect(() => writeStorage(PAGE_KEY, page), [page]);
  useEffect(() => writeStorage(ROWS_KEY, rows), [rows]);
  useEffect(() => writeStorage(UPLOAD_KEY, upload), [upload]);
  useEffect(() => writeStorage(CHANNEL_ROWS_KEY, channelRows), [channelRows]);
  useEffect(() => writeStorage(CHANNEL_UPLOAD_KEY, channelUpload), [channelUpload]);
  useEffect(() => writeStorage(CHANNEL_RAW_ROWS_KEY, channelRawRows), [channelRawRows]);
  useEffect(() => writeStorage(CHANNEL_FIELD_MAPPING_KEY, channelUpload?.mapping || null), [channelUpload?.mapping]);
  useEffect(() => writeStorage(FILTERS_KEY, filters), [filters]);
  useEffect(() => writeStorage(SIDEBAR_KEY, sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => writeStorage(OWNER_KEY, ownerSelection), [ownerSelection]);

  const overviewRows = useMemo(() => applyFilters(rows, filters), [filters, rows]);
  const showOverviewFilters = rows.length > 0 && page === 'overview';

  const clearOverviewData = () => {
    setRows([]);
    setUpload(undefined);
    setFilters(emptyFilters());
    setOwnerSelection([]);
    setMessage('已清空当前上传数据。');
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
    setMessage('已清空页面三独立数据源。');
  };

  const handleOverviewUpload = async (file: File) => {
    try {
      const raw = await parseFile(file);
      const normalized = normalizeUpload(file.name, raw);
      setUpload(normalized.upload);
      setRows(normalized.standardRows);
      setMessage(`已上传 ${normalized.upload.fileName}，清洗后 ${normalized.upload.cleanedRows} 行参与计算。`);
      setPage('overview');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '文件解析失败');
    }
  };

  const handleChannelUpload = async (file: File) => {
    try {
      const raw = await parseFile(file);
      const normalized = normalizeChannelDetailUpload(file.name, raw);
      setChannelUpload(normalized.upload);
      setChannelRows(normalized.rows);
      setChannelRawRows(raw);
      setMessage(`页面三已上传 ${normalized.upload.fileName}，清洗后 ${normalized.upload.cleanedRows} 行参与计算。`);
      setPage('channel-detail');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '文件解析失败');
    }
  };

  const overviewFieldStatus = (() => {
    if (!upload?.mapping) return '-';
    const required: Array<keyof NonNullable<UploadRecord['mapping']>> = ['campaign', 'channelId', 'leads', 'cost', 'day7Gmv'];
    const hit = required.filter((key) => Boolean(upload.mapping[key])).length;
    if (hit === required.length) return '已识别';
    if (hit > 0) return '部分识别';
    return '未识别';
  })();

  const channelFieldStatus = (() => {
    if (!channelUpload?.mapping) return '-';
    const required: Array<keyof NonNullable<ChannelDetailUploadRecord['mapping']>> = [
      'campaign',
      'owner',
      'channelId',
      'category',
      'leads',
      'cost',
      'd4gmv',
      'd7gmv',
      'd10gmv',
    ];
    const hit = required.filter((key) => Boolean(channelUpload.mapping[key])).length;
    if (hit === required.length) return '已识别';
    if (hit > 0) return '部分识别';
    return '未识别';
  })();

  const dataSourceSummary = (() => {
    const nowLabel = new Date().toLocaleString('zh-CN');
    if (page === 'channel-detail' || page === 'channel-breakdown') {
      return {
        kind: 'channel' as const,
        text: `数据源：渠道明细数据｜清洗后 ${channelRows.length.toLocaleString('zh-CN')} 行｜已缓存｜更新时间 ${channelUpload?.uploadedAt ? new Date(channelUpload.uploadedAt).toLocaleString('zh-CN') : nowLabel}`,
        warning: channelFieldStatus === '未识别' || channelFieldStatus === '部分识别' ? '字段识别异常，请检查数据源字段映射。' : undefined,
      };
    }
    return {
      kind: 'overview' as const,
      text: `数据源：业务经营数据｜清洗后 ${rows.length.toLocaleString('zh-CN')} 行｜已缓存｜更新时间 ${upload?.uploadedAt ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : nowLabel}`,
      warning: overviewFieldStatus === '未识别' || overviewFieldStatus === '部分识别' ? '字段识别异常，请检查数据源字段映射。' : undefined,
    };
  })();

  return (
    <Layout
      page={page}
      onPageChange={setPage}
      rowCount={page === 'overview' ? overviewRows.length : page === 'channel-detail' || page === 'channel-breakdown' ? channelRows.length : rows.length}
      upload={upload}
      overviewSidebarUpload={upload}
      channelSidebarUpload={channelUpload}
      overviewFieldStatus={overviewFieldStatus}
      channelFieldStatus={channelFieldStatus}
      filters={filters}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      onUploadOverview={handleOverviewUpload}
      onUploadChannel={handleChannelUpload}
      onClearOverviewData={clearOverviewData}
      onClearChannelData={clearChannelData}
      dataSourceSummary={dataSourceSummary}
    >
      {message ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {message}
          <button type="button" className="ml-3 underline" onClick={() => setMessage('')}>关闭</button>
        </div>
      ) : null}
      {showOverviewFilters ? <DailyInspiration /> : null}
      {showOverviewFilters ? <GlobalFilters rows={rows} filters={filters} onChange={setFilters} /> : null}
      {rows.length === 0 && page !== 'fee-calculator' && page !== 'channel-detail' && page !== 'channel-breakdown' ? (
        <EmptyState />
      ) : (
        <>
          {page === 'overview' ? (
            <OverviewPage
              rows={overviewRows}
              upload={upload}
              ownerSelection={ownerSelection}
              onOwnerSelectionChange={setOwnerSelection}
              onApplyFavoriteOwnersToGlobalFilter={(owners) =>
                setFilters((prev) => ({
                  ...prev,
                  channelOwner: owners,
                }))
              }
              mode="module-a"
            />
          ) : null}
          {page === 'personal' ? (
            <PersonalOverviewPage
              rows={rows}
              upload={upload}
              ownerSelection={ownerSelection}
              onOwnerSelectionChange={setOwnerSelection}
              onApplyFavoriteOwnersToGlobalFilter={(owners) =>
                setFilters((prev) => ({
                  ...prev,
                  channelOwner: owners,
                }))
              }
            />
          ) : null}
          {page === 'channel-detail' ? <ChannelDetailPage rows={channelRows} upload={channelUpload} viewMode="block1" /> : null}
          {page === 'channel-breakdown' ? <ChannelDetailPage rows={channelRows} upload={channelUpload} viewMode="block2" /> : null}
          {page === 'fee-calculator' ? <FeeCalculatorPage /> : null}
        </>
      )}
    </Layout>
  );
}
