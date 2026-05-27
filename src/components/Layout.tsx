import { ChangeEvent, ReactNode, useEffect, useState } from 'react';
import { Bell, Database, Search, Trash2, UploadCloud } from 'lucide-react';
import { Filters, UploadRecord } from '../types';
import { Sidebar } from './Sidebar';

export type PageKey = 'overview' | 'personal' | 'channel-detail' | 'channel-breakdown' | 'fee-calculator';

const pageMeta: Record<PageKey, { label: string; description: string }> = {
  overview: { label: '业务经营总览', description: '查看当前 SKU 的整体经营表现，观察营期之间的规模、转化与到完课波动。' },
  personal: { label: '个人经营总览', description: '查看个人 / 渠道归属维度的经营表现，并与当前筛选后的大盘表现进行对比。' },
  'channel-detail': { label: '渠道经营明细', description: '观察渠道营期 D4～D10 单日转化表现，拆解当期转化、追单转化与封板转化。' },
  'channel-breakdown': { label: '渠道经营明细', description: '按渠道归属人和渠道号拆解 D4～D10 成交 GMV、单日转化率与封板转化表现。' },
  'fee-calculator': { label: '费比测算工具', description: '模拟不同经营参数组合下的费比、ROI、R值与成交产出。' },
};

interface LayoutProps {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  rowCount: number;
  upload?: UploadRecord;
  overviewSidebarUpload?: {
    fileName?: string;
    uploadedAt?: string;
    rawRows?: number;
    cleanedRows?: number;
    filteredRows?: number;
  };
  channelSidebarUpload?: {
    fileName?: string;
    uploadedAt?: string;
    rawRows?: number;
    cleanedRows?: number;
    filteredRows?: number;
  };
  overviewFieldStatus: string;
  channelFieldStatus: string;
  filters: Filters;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onUploadOverview: (file: File) => void;
  onUploadChannel: (file: File) => void;
  onClearOverviewData: () => void;
  onClearChannelData: () => void;
  dataSourceSummary: {
    kind: 'overview' | 'channel';
    text: string;
    warning?: string;
  };
}

export function Layout({
  page,
  onPageChange,
  children,
  rowCount,
  upload,
  overviewSidebarUpload,
  channelSidebarUpload,
  overviewFieldStatus,
  channelFieldStatus,
  filters,
  collapsed,
  onToggleCollapsed,
  onUploadOverview,
  onUploadChannel,
  onClearOverviewData,
  onClearChannelData,
  dataSourceSummary,
}: LayoutProps) {
  const [chinaNow, setChinaNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setChinaNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeFilterCount =
    filters.channel.length +
    filters.channelId.length +
    filters.channelOwner.length +
    filters.productType.length +
    filters.campaign.length;

  const greeting = getChinaGreeting(chinaNow);
  const showGreeting = page === 'overview';
  const [showDataSourceDrawer, setShowDataSourceDrawer] = useState(false);

  const onOverviewFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUploadOverview(file);
    event.target.value = '';
  };
  const onChannelFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUploadChannel(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        page={page}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onPageChange={onPageChange}
      />
      <main className={collapsed ? 'lg:pl-20' : 'lg:pl-72'}>
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 px-4 py-4 backdrop-blur lg:px-7">
          <div className="panel border-none bg-white p-3 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold text-ink">{showGreeting ? greeting : pageMeta[page].label}</h1>
                <p className="mt-1 text-sm text-muted">
                  {showGreeting ? '查看今日经营表现与营期趋势波动。' : pageMeta[page].description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="pill">总计：{rowCount.toLocaleString('zh-CN')} 行</span>
                  <span className="pill border-emerald-200 bg-mintSoft text-emerald-700">筛选：{activeFilterCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="icon-button" onClick={() => setShowDataSourceDrawer(true)} title="数据源管理">
                  <Database size={16} />
                </button>
                <button type="button" className="icon-button">
                  <Search size={16} />
                </button>
                <button type="button" className="icon-button">
                  <Bell size={16} />
                </button>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-[#36a0ff] to-[#6ee7c8]" />
            <div className="mt-2 flex gap-2 lg:hidden">
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
        <div className="px-4 py-5 lg:px-7">
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>{dataSourceSummary.text}</div>
              <button
                type="button"
                className="rounded-md border border-line px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => setShowDataSourceDrawer(true)}
              >
                查看数据源详情
              </button>
            </div>
            {dataSourceSummary.warning ? (
              <div className="mt-1 text-xs text-rose-600">{dataSourceSummary.warning}</div>
            ) : null}
          </div>
          {children}
        </div>
      </main>
      {showDataSourceDrawer ? (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowDataSourceDrawer(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">数据源管理</h3>
              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs text-slate-600" onClick={() => setShowDataSourceDrawer(false)}>
                关闭
              </button>
            </div>
            <div className="space-y-4">
              <section className="rounded-xl border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-ink">业务经营数据源</h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>文件名：{overviewSidebarUpload?.fileName || '-'}</div>
                  <div>上传时间：{overviewSidebarUpload?.uploadedAt ? new Date(overviewSidebarUpload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
                  <div>原始行数：{overviewSidebarUpload?.rawRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>有效行数：{overviewSidebarUpload?.cleanedRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>过滤行数：{overviewSidebarUpload?.filteredRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>字段识别状态：{overviewFieldStatus}</div>
                  <div>当前数据来源：{overviewSidebarUpload ? '本地缓存 / 手动上传' : '-'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700 hover:bg-sky-100">
                    <UploadCloud size={13} />
                    上传新文件
                    <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onOverviewFile} />
                  </label>
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={onClearOverviewData}>
                    <Trash2 size={13} />
                    清空数据
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-ink">渠道经营明细数据源</h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>文件名：{channelSidebarUpload?.fileName || '-'}</div>
                  <div>上传时间：{channelSidebarUpload?.uploadedAt ? new Date(channelSidebarUpload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
                  <div>原始行数：{channelSidebarUpload?.rawRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>有效行数：{channelSidebarUpload?.cleanedRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>过滤行数：{channelSidebarUpload?.filteredRows?.toLocaleString('zh-CN') || '-'}</div>
                  <div>字段识别状态：{channelFieldStatus}</div>
                  <div>当前数据来源：{channelSidebarUpload ? '本地缓存 / 手动上传' : '-'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700 hover:bg-sky-100">
                    <UploadCloud size={13} />
                    上传新文件
                    <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onChannelFile} />
                  </label>
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={onClearChannelData}>
                    <Trash2 size={13} />
                    清空渠道明细数据
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getChinaGreeting(now: Date): string {
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value;
  const hour = Number(hourPart ?? '0');
  if (hour >= 5 && hour <= 10) return '早上好';
  if (hour >= 11 && hour <= 13) return '中午好';
  if (hour >= 14 && hour <= 17) return '下午好';
  if (hour >= 18 && hour <= 23) return '晚上好';
  return '夜深了';
}
