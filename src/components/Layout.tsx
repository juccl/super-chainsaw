import { ReactNode, useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { Filters, UploadRecord } from '../types';
import { Sidebar } from './Sidebar';

export type PageKey = 'overview' | 'personal' | 'channel-detail' | 'channel-breakdown' | 'fee-calculator';

const pageMeta: Record<PageKey, { label: string; description: string }> = {
  overview: { label: '业务经营总览', description: '查看当前 SKU 的整体经营表现，观察营期之间的规模、转化与到完课波动。' },
  personal: { label: '个人经营总览', description: '查看个人 / 渠道归属维度的经营表现，并与当前筛选后的大盘表现进行对比。' },
  'channel-detail': { label: '渠道经营明细｜板块一', description: '观察 D4～D10 单日转化率、当期成交占比与追单占比波动。' },
  'channel-breakdown': { label: '渠道经营明细｜板块二', description: '按渠道归属人 / 渠道号 / 分类拆解封板转化表现与贡献结构。' },
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

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        page={page}
        overviewUpload={overviewSidebarUpload}
        channelUpload={channelSidebarUpload}
        overviewFieldStatus={overviewFieldStatus}
        channelFieldStatus={channelFieldStatus}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onPageChange={onPageChange}
        onUploadOverview={onUploadOverview}
        onUploadChannel={onUploadChannel}
        onClearOverviewData={onClearOverviewData}
        onClearChannelData={onClearChannelData}
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
        <div className="px-4 py-5 lg:px-7">{children}</div>
      </main>
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
