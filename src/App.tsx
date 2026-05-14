import { useEffect, useMemo, useState } from 'react';
import { GlobalFilters } from './components/GlobalFilters';
import { Layout, PageKey } from './components/Layout';
import { EmptyState } from './components/EmptyState';
import { applyFilters, emptyFilters } from './lib/metrics';
import { readStorage, writeStorage } from './lib/storage';
import { ChannelDiagnosisPage } from './pages/ChannelDiagnosisPage';
import { OverviewPage } from './pages/OverviewPage';
import { Filters, StandardRow, UploadRecord } from './types';

const ROWS_KEY = 'business-dashboard:single-table-rows';
const UPLOAD_KEY = 'business-dashboard:single-table-upload';
const FILTERS_KEY = 'business-dashboard:filters';
const PAGE_KEY = 'business-dashboard:page';
const SIDEBAR_KEY = 'business-dashboard:sidebar-collapsed';
const OWNER_KEY = 'business-dashboard:owner-selection';

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
  return input === 'overview' || input === 'channel' ? input : 'overview';
}

function normalizeOwnerSelection(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeBool(input: unknown, fallback = false): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

export default function App() {
  const [page, setPage] = useState<PageKey>(() => normalizePage(readStorage(PAGE_KEY, 'overview')));
  const [rows, setRows] = useState<StandardRow[]>(() => readStorage(ROWS_KEY, []));
  const [upload, setUpload] = useState<UploadRecord | undefined>(() => readStorage<UploadRecord | undefined>(UPLOAD_KEY, undefined));
  const [filters, setFilters] = useState<Filters>(() => normalizeFilters(readStorage(FILTERS_KEY, emptyFilters())));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => normalizeBool(readStorage(SIDEBAR_KEY, false), false));
  const [ownerSelection, setOwnerSelection] = useState<string[]>(() => normalizeOwnerSelection(readStorage(OWNER_KEY, [])));
  const [message, setMessage] = useState('');

  useEffect(() => writeStorage(PAGE_KEY, page), [page]);
  useEffect(() => writeStorage(ROWS_KEY, rows), [rows]);
  useEffect(() => writeStorage(UPLOAD_KEY, upload), [upload]);
  useEffect(() => writeStorage(FILTERS_KEY, filters), [filters]);
  useEffect(() => writeStorage(SIDEBAR_KEY, sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => writeStorage(OWNER_KEY, ownerSelection), [ownerSelection]);

  const filteredRows = useMemo(() => applyFilters(rows, filters), [filters, rows]);
  const showFilters = rows.length > 0;

  const clearData = () => {
    setRows([]);
    setUpload(undefined);
    setFilters(emptyFilters());
    setOwnerSelection([]);
    setMessage('已清空当前上传数据。');
  };

  const handleUpload = (payload: { upload: UploadRecord; rows: StandardRow[] }) => {
    setUpload(payload.upload);
    setRows(payload.rows);
    setMessage(`已上传 ${payload.upload.fileName}，清洗后 ${payload.upload.cleanedRows} 行参与计算。`);
    setPage('overview');
  };

  return (
    <Layout
      page={page}
      onPageChange={setPage}
      rowCount={filteredRows.length}
      upload={upload}
      filters={filters}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      onUpload={handleUpload}
      onClearData={clearData}
    >
      {message ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {message}
          <button type="button" className="ml-3 underline" onClick={() => setMessage('')}>关闭</button>
        </div>
      ) : null}
      {showFilters ? <GlobalFilters rows={rows} filters={filters} onChange={setFilters} /> : null}
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {page === 'overview' ? (
            <OverviewPage
              rows={filteredRows}
              upload={upload}
              ownerSelection={ownerSelection}
              onOwnerSelectionChange={setOwnerSelection}
            />
          ) : null}
          {page === 'channel' ? <ChannelDiagnosisPage rows={filteredRows} /> : null}
        </>
      )}
    </Layout>
  );
}
