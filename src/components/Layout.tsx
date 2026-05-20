import { ReactNode } from 'react';
import { Bell, Search } from 'lucide-react';
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
      <main className={collapsed ? 'lg:pl-20' : 'lg:pl-64'}>
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 px-4 py-4 backdrop-blur lg:px-7">
          <div className="panel border-none bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-4xl font-semibold text-ink">晚上好</h1>
                <p className="mt-1 text-base text-muted">{pageMeta[page].description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="pill">总计：{rowCount.toLocaleString('zh-CN')} 行</span>
                  <span className="pill border-emerald-200 bg-mintSoft text-emerald-700">筛选：{activeFilterCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="icon-button">
                  <Search size={16} />
                </button>
                <button type="button" className="icon-button">
                  <Bell size={16} />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              {upload?.fileName ? `当前文件：${upload.fileName}` : '当前未上传业务数据表'} · 最近更新{' '}
              {upload?.uploadedAt ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}
            </p>
            <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-[#36a0ff] to-[#6ee7c8]" />
            <div className="mt-3 flex gap-2 lg:hidden">
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
        <div className="px-4 py-5 lg:px-7">{children}</div>
      </main>
    </div>
  );
}
