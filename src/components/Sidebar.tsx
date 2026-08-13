import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { PageKey } from './Layout';

export type ThemeMode = 'day' | 'night';

interface SidebarProps {
  page: PageKey;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPageChange: (page: PageKey) => void;
}

type IconKind = 'overview' | 'detail' | 'calculator' | 'source';

const navItems: Array<{ key: PageKey; label: string; icon: IconKind }> = [
  { key: 'overview', label: '总览', icon: 'overview' },
  { key: 'detail', label: '明细', icon: 'detail' },
  { key: 'fee-calculator', label: '费比测算', icon: 'calculator' },
  { key: 'data-source', label: '数据源', icon: 'source' },
];

const navGroups: Array<{ label?: string; items: typeof navItems }> = [
  { items: navItems.slice(0, 2) },
  { label: 'Tools', items: navItems.slice(2) },
];

export function Sidebar({
  page,
  collapsed,
  onToggleCollapsed,
  onPageChange,
}: SidebarProps) {
  return (
    <aside className={`sku-side ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sku-window-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="sku-brand">
        <div className="sku-brand-mark" aria-hidden="true" />
        {collapsed ? null : (
          <div>
            <div className="sku-brand-name">SKU 业务看板</div>
          </div>
        )}
      </div>

      {collapsed ? null : (
        <button type="button" className="sku-side-search">
          <Search size={15} />
          <span>搜索看板</span>
        </button>
      )}

      <nav className="sku-nav" aria-label="主导航">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label || `main-${groupIndex}`} className="sku-nav-group">
            {collapsed || !group.label ? null : <div className="sku-nav-heading">{group.label}</div>}
            {group.items.map((item) => {
              const active = item.key === page;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={active ? 'active' : ''}
                  title={collapsed ? item.label : undefined}
                  onClick={() => onPageChange(item.key)}
                >
                  <SidebarGlyph kind={item.icon} />
                  {collapsed ? null : <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sku-side-spacer" />

      <div className="sku-bottom">
        <button type="button" title="帮助">
          ?
        </button>
        <button type="button" title={collapsed ? '展开侧栏' : '折叠侧栏'} onClick={onToggleCollapsed}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
    </aside>
  );
}

function SidebarGlyph({ kind }: { kind: IconKind }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={`glyph glyph-${kind}`}>
      {kind === 'overview' ? (
        <>
          <path d="M3.8 11.1 12 4.2l8.2 6.9a1.1 1.1 0 0 1-.7 1.95h-1.1v5.45a1.7 1.7 0 0 1-1.7 1.7H7.3a1.7 1.7 0 0 1-1.7-1.7v-5.45H4.5a1.1 1.1 0 0 1-.7-1.95Z" />
        </>
      ) : null}
      {kind === 'detail' ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.7" />
          <rect x="13" y="4" width="7" height="7" rx="1.7" />
          <rect x="4" y="13" width="7" height="7" rx="1.7" />
          <rect x="13" y="13" width="7" height="7" rx="1.7" />
        </>
      ) : null}
      {kind === 'calculator' ? (
        <>
          <path d="M6.2 5.3h10.1a1.9 1.9 0 0 1 1.84 2.35l-1.18 5A2.5 2.5 0 0 1 14.52 14.6H8.85a2.5 2.5 0 0 1-2.43-1.93L5.08 6.95H3.8a1.15 1.15 0 0 1 0-2.3h1.5c.45 0 .8.25.9.65Z" />
          <circle cx="8.6" cy="19" r="1.55" />
          <circle cx="15.8" cy="19" r="1.55" />
        </>
      ) : null}
      {kind === 'source' ? (
        <>
          <path d="M5.2 4.8h7.2c.55 0 1.08.22 1.47.61l5.05 5.05a2.06 2.06 0 0 1 0 2.92l-5.54 5.54a2.06 2.06 0 0 1-2.92 0L5.41 13.87a2.08 2.08 0 0 1-.61-1.47V5.2c0-.22.18-.4.4-.4Z" />
          <circle cx="9.1" cy="8.8" r="1.45" className="glyph-hole" />
        </>
      ) : null}
    </svg>
  );
}
