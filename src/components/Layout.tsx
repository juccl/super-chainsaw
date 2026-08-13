import { ReactNode } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { DailyInspiration } from './DailyInspiration';
import { Sidebar } from './Sidebar';

export type PageKey = 'overview' | 'detail' | 'fee-calculator' | 'data-source';

const pageMeta: Record<PageKey, { tab?: string; label: string; description: string }> = {
  overview: {
    tab: '总览',
    label: '业务经营总览',
    description: '聚焦 leads、封板成交 GMV、封板转化率与封板费比，按营期快速观察变化。',
  },
  detail: {
    tab: '明细',
    label: '渠道经营明细',
    description: '',
  },
  'fee-calculator': {
    label: '费比测算',
    description: '保留原有费比测算公式与场景编辑方式。',
  },
  'data-source': {
    label: '数据源 / 手动录入',
    description: '只保留一个常用渠道经营明细数据源，支持上传覆盖和手动录入兜底。',
  },
};

interface LayoutProps {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  topbarExtra?: ReactNode;
}

export function Layout({
  page,
  onPageChange,
  children,
  collapsed,
  onToggleCollapsed,
  topbarExtra,
}: LayoutProps) {
  const meta = pageMeta[page];

  return (
    <div className="sku-app">
      <Sidebar
        page={page}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onPageChange={onPageChange}
      />
      <main className={`sku-main ${collapsed ? 'sku-main-collapsed' : 'sku-main-expanded'}`}>
        <div className="sku-shell">
          <div className="sku-topbar">
            <div className="sku-breadcrumb" aria-label="当前位置">
              <ChevronLeft size={18} />
              <button type="button" onClick={() => onPageChange('overview')}>Home</button>
              <strong>{meta.tab || meta.label}</strong>
            </div>
            <div className="sku-actions">
              {topbarExtra}
              <button type="button" className="sku-round-button" aria-label="刷新" onClick={() => window.location.reload()}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {page === 'overview' ? <DailyInspiration /> : null}

          <section className="sku-hero">
            <div>
              <h1>{meta.label}</h1>
              {meta.description ? <p>{meta.description}</p> : null}
            </div>
          </section>

          {children}
        </div>
      </main>
    </div>
  );
}
