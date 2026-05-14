import { ReactNode } from 'react';
import { Filters, StandardRow, UploadRecord } from '../types';
import { Sidebar } from './Sidebar';

export type PageKey = 'overview' | 'channel';

const pageMeta: Record<PageKey, { label: string; description: string }> = {
  overview: { label: '经营总览', description: '查看钢琴 SKU 大盘与个人经营对比表现' },
  channel: { label: '渠道诊断', description: '按渠道/渠道ID观察营期间波动与渠道质量' },
};

interface LayoutProps {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  rowCount: number;
  upload?: UploadRecord;
  filters: Filters;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onUpload: (payload: { upload: UploadRecord; rows: StandardRow[] }) => void;
  onClearData: () => void;
}

export function Layout({
  page,
  onPageChange,
  children,
  rowCount,
  upload,
  filters,
  collapsed,
  onToggleCollapsed,
  onUpload,
  onClearData,
}: LayoutProps) {
  const activeFilterCount =
    filters.channel.length +
    filters.channelId.length +
    filters.channelOwner.length +
    filters.productType.length +
    filters.campaign.length;
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        page={page}
        upload={upload}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onPageChange={onPageChange}
        onUpload={onUpload}
        onClearData={onClearData}
      />
      <main className={collapsed ? 'lg:pl-20' : 'lg:pl-72'}>
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-4 backdrop-blur lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-ink">{pageMeta[page].label}</h1>
              <p className="mt-1 text-xs text-muted">{pageMeta[page].description}</p>
              <p className="mt-1 text-xs text-muted">
                {upload?.fileName ? `当前文件：${upload.fileName}` : '当前未上传业务数据表'} · 标准化明细 {rowCount.toLocaleString('zh-CN')} 行 · 筛选 {activeFilterCount} 项
                {upload?.uploadedAt ? ` · 最近更新 ${new Date(upload.uploadedAt).toLocaleString('zh-CN')}` : ''}
              </p>
            </div>
            <div className="flex gap-2 lg:hidden">
              {(Object.keys(pageMeta) as PageKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-md border px-3 py-1.5 text-sm ${page === key ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line bg-white text-slate-600'}`}
                  onClick={() => onPageChange(key)}
                >
                  {pageMeta[key].label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="px-4 py-5 lg:px-6">{children}</div>
      </main>
    </div>
  );
}
