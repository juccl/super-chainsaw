import { Calculator, ChevronDown, ChevronLeft, ChevronRight, FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageKey } from './Layout';

interface SidebarProps {
  page: PageKey;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPageChange: (page: PageKey) => void;
}

const CHANNEL_SUBMENU_KEY = 'business-dashboard:channel-submenu-open';
const PRIMARY_MENU_ORDER_KEY = 'business-dashboard:primary-menu-order';

type IconKind = 'overview' | 'personal' | 'channel' | 'calculator';

type PrimaryMenuKey = 'overview' | 'personal' | 'channel' | 'fee-calculator';
const DEFAULT_PRIMARY_MENU_ORDER: PrimaryMenuKey[] = ['overview', 'personal', 'channel', 'fee-calculator'];

export function Sidebar({
  page,
  collapsed,
  onToggleCollapsed,
  onPageChange,
}: SidebarProps) {
  const [primaryMenuOrder, setPrimaryMenuOrder] = useState<PrimaryMenuKey[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRIMARY_MENU_ORDER;
    const cached = window.localStorage.getItem(PRIMARY_MENU_ORDER_KEY);
    if (!cached) return DEFAULT_PRIMARY_MENU_ORDER;
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return DEFAULT_PRIMARY_MENU_ORDER;
      const valid = parsed.filter((item): item is PrimaryMenuKey =>
        item === 'overview' || item === 'personal' || item === 'channel' || item === 'fee-calculator',
      );
      const merged = [...valid];
      DEFAULT_PRIMARY_MENU_ORDER.forEach((key) => {
        if (!merged.includes(key)) merged.push(key);
      });
      return merged;
    } catch {
      return DEFAULT_PRIMARY_MENU_ORDER;
    }
  });
  const [draggingMenuKey, setDraggingMenuKey] = useState<PrimaryMenuKey | null>(null);
  const [channelSubmenuOpen, setChannelSubmenuOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const cached = window.localStorage.getItem(CHANNEL_SUBMENU_KEY);
    if (cached === 'true') return true;
    if (cached === 'false') return false;
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CHANNEL_SUBMENU_KEY, String(channelSubmenuOpen));
  }, [channelSubmenuOpen]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRIMARY_MENU_ORDER_KEY, JSON.stringify(primaryMenuOrder));
  }, [primaryMenuOrder]);

  const onMenuDrop = (targetKey: PrimaryMenuKey) => {
    if (!draggingMenuKey || draggingMenuKey === targetKey) return;
    const prevOrder = [...primaryMenuOrder];
    const from = prevOrder.indexOf(draggingMenuKey);
    const to = prevOrder.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    prevOrder.splice(from, 1);
    prevOrder.splice(to, 0, draggingMenuKey);
    setPrimaryMenuOrder(prevOrder);
  };

  const primaryItemMap: Record<Exclude<PrimaryMenuKey, 'channel'>, { key: PageKey; label: string; icon: IconKind }> = {
    overview: { key: 'overview', label: '首页', icon: 'overview' },
    personal: { key: 'personal', label: '个人经营', icon: 'personal' },
    'fee-calculator': { key: 'fee-calculator', label: '费比测算', icon: 'calculator' },
  };

  return (
    <aside className={`fixed left-0 top-0 hidden h-screen border-r border-[#e5edf8] bg-[#eef4fb] text-ink lg:block ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex h-full flex-col px-3 py-4">
        <div className="flex items-center justify-between pb-4">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f8ff0] to-[#2f7bf6] text-white shadow-soft">
              <FolderPlus size={16} />
            </div>
            {collapsed ? null : (
              <div>
                <div className="text-xl font-semibold">钢琴看板</div>
                <div className="text-xs text-muted">单 SKU 经营分析</div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e3f4] bg-white text-slate-600 transition hover:bg-slate-50"
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="mt-2 space-y-2 border-t border-[#dce7f5] pt-4">
          {primaryMenuOrder.map((menuKey) => {
            if (menuKey === 'channel') {
              return (
                <div
                  key={menuKey}
                  className={`${collapsed ? '' : 'rounded-2xl border border-[#dce7f5] bg-white/80 p-2'} ${draggingMenuKey === menuKey ? 'opacity-60' : ''}`}
                  draggable={!collapsed}
                  onDragStart={() => setDraggingMenuKey(menuKey)}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={() => onMenuDrop(menuKey)}
                  onDragEnd={() => setDraggingMenuKey(null)}
                  title={collapsed ? '一级菜单拖拽排序请先展开侧栏' : '可拖拽排序'}
                >
                  <div className={`flex ${collapsed ? 'justify-center' : 'items-center gap-2'}`}>
                    <button
                      type="button"
                      title={collapsed ? '渠道明细' : ''}
                      onClick={() => onPageChange('channel-detail')}
                      className={`sidebar-nav-item flex h-11 items-center rounded-2xl px-3 text-sm ${
                        page === 'channel-detail' || page === 'channel-breakdown'
                          ? 'sidebar-nav-item-active bg-gradient-to-r from-[#4f8ff0] to-[#357ef6] text-white shadow-soft'
                          : 'text-slate-700 hover:bg-white hover:text-slate-900'
                      } ${collapsed ? 'w-11 justify-center' : 'w-full gap-3'}`}
                    >
                      <SidebarIcon kind="channel" active={page === 'channel-detail' || page === 'channel-breakdown'} />
                      {collapsed ? null : '渠道明细'}
                    </button>
                    {collapsed ? null : (
                      <button
                        type="button"
                        onClick={() => setChannelSubmenuOpen((prev) => !prev)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dce7f5] bg-white text-slate-500 transition hover:bg-slate-50"
                        title={channelSubmenuOpen ? '收起二级菜单' : '展开二级菜单'}
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-150 ${channelSubmenuOpen ? 'rotate-0' : '-rotate-90'}`}
                        />
                      </button>
                    )}
                  </div>
                  {!collapsed && channelSubmenuOpen ? (
                    <div className="mt-2 space-y-1.5 pl-2">
                      <button
                        type="button"
                        onClick={() => onPageChange('channel-detail')}
                        className={`sidebar-nav-subitem flex h-9 w-full items-center rounded-xl px-3 text-sm ${
                          page === 'channel-detail'
                            ? 'bg-[#eaf2ff] text-[#2459af]'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        板块一｜整体波动
                      </button>
                      <button
                        type="button"
                        onClick={() => onPageChange('channel-breakdown')}
                        className={`sidebar-nav-subitem flex h-9 w-full items-center rounded-xl px-3 text-sm ${
                          page === 'channel-breakdown'
                            ? 'bg-[#eaf2ff] text-[#2459af]'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        板块二｜个人拆解
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }

            const item = primaryItemMap[menuKey];
            const active = item.key === page;
            return (
              <div
                key={menuKey}
                draggable={!collapsed}
                onDragStart={() => setDraggingMenuKey(menuKey)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => onMenuDrop(menuKey)}
                onDragEnd={() => setDraggingMenuKey(null)}
                className={draggingMenuKey === menuKey ? 'opacity-60' : ''}
                title={collapsed ? '' : '可拖拽排序'}
              >
                <button
                  type="button"
                  title={collapsed ? item.label : ''}
                  onClick={() => onPageChange(item.key)}
                  className={`sidebar-nav-item flex h-11 w-full items-center rounded-2xl px-3 text-sm ${
                    active
                      ? 'sidebar-nav-item-active bg-gradient-to-r from-[#4f8ff0] to-[#357ef6] text-white shadow-soft'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  } ${collapsed ? 'justify-center' : 'gap-3'}`}
                >
                  <SidebarIcon kind={item.icon} active={active} />
                  {collapsed ? null : item.label}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#dce7f5] pt-3 text-xs text-slate-500">
          <div className={collapsed ? 'text-center' : ''}>分析优先，数据源请在顶部管理</div>
        </div>
      </div>
    </aside>
  );
}

interface SidebarIconProps {
  kind: IconKind;
  active: boolean;
}

function SidebarIcon({ kind, active }: SidebarIconProps) {
  const base = active ? '#ffffff' : '#20242d';
  const accent = active ? '#baf8ff' : '#59e4ea';

  const icon = (() => {
    switch (kind) {
      case 'overview':
        return (
          <>
            <rect x="8" y="7" width="10" height="10" rx="2.5" fill={accent} />
            <rect x="4" y="5" width="12" height="12" rx="3" fill={base} />
            <path d="M10 8.4V13.6" stroke={active ? '#3e6ad9' : '#f4f7fb'} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7.4 11H12.6" stroke={active ? '#3e6ad9' : '#f4f7fb'} strokeWidth="1.8" strokeLinecap="round" />
          </>
        );
      case 'channel':
        return (
          <>
            <rect x="8" y="8.2" width="10" height="8.2" rx="2.2" fill={accent} />
            <path
              d="M4.2 6.8A2.8 2.8 0 0 1 7 4h7a2.8 2.8 0 0 1 2.8 2.8v5.8A2.8 2.8 0 0 1 14 15.4H8.6l-2.4 2v-2H7A2.8 2.8 0 0 1 4.2 12.6z"
              fill={base}
            />
            <circle cx="8.3" cy="9.7" r="0.95" fill={active ? '#4a74dc' : '#f4f7fb'} />
            <circle cx="11" cy="9.7" r="0.95" fill={active ? '#4a74dc' : '#f4f7fb'} />
            <circle cx="13.7" cy="9.7" r="0.95" fill={active ? '#4a74dc' : '#f4f7fb'} />
          </>
        );
      case 'personal':
        return (
          <>
            <path d="M11.6 4.6a2.8 2.8 0 1 0 0 5.6h1.8v2.6c0 1.3-1.1 2.4-2.4 2.4H7.2A3.2 3.2 0 0 1 4 12V8.6c0-2.2 1.8-4 4-4z" fill={base} />
            <path d="M13.4 5.2a2.6 2.6 0 0 1 2.6 2.6v4.3l2 2.1h-3.1a2.5 2.5 0 0 1-2.5-2.5V7.8a2.6 2.6 0 0 1 .8-1.8z" fill={accent} />
            <path d="M8 7.2a2 2 0 1 0 0 4" stroke={active ? '#4a74dc' : '#f4f7fb'} strokeWidth="1.6" strokeLinecap="round" />
          </>
        );
      case 'calculator':
      default:
        return (
          <>
            <path d="M11.8 4.6a2.5 2.5 0 0 1 2.1 1.2l2.6 4.3a2.5 2.5 0 0 1-2.1 3.8H8.3a2.5 2.5 0 0 1-2.1-3.8l2.6-4.3a2.5 2.5 0 0 1 2.1-1.2z" fill={base} />
            <path d="M10.8 6.2h2.6l2.2 3.7a1.8 1.8 0 0 1-1.6 2.7h-2.5z" fill={accent} />
            <path d="M8.4 10.7h2.8" stroke={active ? '#4a74dc' : '#f4f7fb'} strokeWidth="1.7" strokeLinecap="round" />
          </>
        );
    }
  })();

  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      {icon}
    </svg>
  );
}
