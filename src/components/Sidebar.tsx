import { BarChart3, Calculator, ChevronLeft, ChevronRight, Database, FolderPlus, ListTree, Trash2, UploadCloud, UserCircle2 } from 'lucide-react';
import { ChangeEvent } from 'react';
import { PageKey } from './Layout';

interface SidebarProps {
  page: PageKey;
  overviewUpload?: {
    fileName?: string;
    uploadedAt?: string;
    rawRows?: number;
    cleanedRows?: number;
    filteredRows?: number;
  };
  channelUpload?: {
    fileName?: string;
    uploadedAt?: string;
    rawRows?: number;
    cleanedRows?: number;
    filteredRows?: number;
  };
  overviewFieldStatus: string;
  channelFieldStatus: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPageChange: (page: PageKey) => void;
  onUploadOverview: (file: File) => void;
  onUploadChannel: (file: File) => void;
  onClearOverviewData: () => void;
  onClearChannelData: () => void;
}

const items: Array<{ key: PageKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: '首页', icon: BarChart3 },
  { key: 'personal', label: '个人经营', icon: UserCircle2 },
  { key: 'fee-calculator', label: '费比测算', icon: Calculator },
];

export function Sidebar({
  page,
  overviewUpload,
  channelUpload,
  overviewFieldStatus,
  channelFieldStatus,
  collapsed,
  onToggleCollapsed,
  onPageChange,
  onUploadOverview,
  onUploadChannel,
  onClearOverviewData,
  onClearChannelData,
}: SidebarProps) {
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
    <aside className={`fixed left-0 top-0 hidden h-screen border-r border-line bg-sidebar text-ink lg:block ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex h-full flex-col px-3 py-4">
        <div className="flex items-center justify-between pb-4">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8ff0] to-[#2f7bf6] text-white shadow-soft">
              <FolderPlus size={16} />
            </div>
            {collapsed ? null : (
              <div>
                <div className="text-xl font-semibold">钢琴看板</div>
                <div className="text-xs text-muted">单 SKU 经营分析</div>
              </div>
            )}
          </div>
          <button type="button" onClick={onToggleCollapsed} className="icon-button" title={collapsed ? '展开' : '折叠'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="mt-2 space-y-2 border-t border-line pt-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button
                key={item.key}
                type="button"
                title={collapsed ? item.label : ''}
                onClick={() => onPageChange(item.key)}
                className={`flex h-10 w-full items-center rounded-full px-3 text-sm ${
                  active
                    ? 'bg-gradient-to-r from-[#3d8cf6] to-[#2f7bf6] text-white shadow-soft'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                } ${collapsed ? 'justify-center' : 'gap-3'}`}
              >
                <Icon size={16} />
                {collapsed ? null : item.label}
              </button>
            );
          })}
          <div className={`${collapsed ? '' : 'rounded-2xl border border-slate-200 bg-white p-2'}`}>
            <button
              type="button"
              title={collapsed ? '渠道明细' : ''}
              onClick={() => onPageChange('channel-detail')}
              className={`flex h-10 w-full items-center rounded-full px-3 text-sm ${
                page === 'channel-detail' || page === 'channel-breakdown'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              } ${collapsed ? 'justify-center' : 'gap-3'}`}
            >
              <ListTree size={16} />
              {collapsed ? null : '渠道明细'}
            </button>
            {collapsed ? null : (
              <div className="mt-2 space-y-1 pl-2">
                <button
                  type="button"
                  onClick={() => onPageChange('channel-detail')}
                  className={`flex h-9 w-full items-center rounded-lg px-3 text-sm ${
                    page === 'channel-detail'
                      ? 'bg-gradient-to-r from-[#3d8cf6] to-[#2f7bf6] text-white shadow-soft'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  板块一｜整体波动
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange('channel-breakdown')}
                  className={`flex h-9 w-full items-center rounded-lg px-3 text-sm ${
                    page === 'channel-breakdown'
                      ? 'bg-gradient-to-r from-[#3d8cf6] to-[#2f7bf6] text-white shadow-soft'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  板块二｜个人拆解
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="mt-4 rounded-lg border border-line bg-white p-3 shadow-card">
          <label
            className={`flex cursor-pointer items-center rounded-md border border-dashed border-primary bg-primarySoft px-3 py-2 text-sm text-[#2459af] hover:bg-blue-100 ${collapsed ? 'justify-center' : 'gap-2'}`}
            title={collapsed ? '上传业务数据表' : ''}
          >
            <UploadCloud size={16} />
            {collapsed ? null : '上传业务数据表'}
            <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onOverviewFile} />
          </label>
          {collapsed ? null : (
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div>文件名：{overviewUpload?.fileName || '-'}</div>
              <div>上传时间：{overviewUpload?.uploadedAt ? new Date(overviewUpload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
              <div>原始行数：{overviewUpload?.rawRows ? overviewUpload.rawRows.toLocaleString('zh-CN') : '-'}</div>
              <div>有效行数：{overviewUpload?.cleanedRows ? overviewUpload.cleanedRows.toLocaleString('zh-CN') : '-'}</div>
              <div>过滤行数：{overviewUpload?.filteredRows ? overviewUpload.filteredRows.toLocaleString('zh-CN') : '-'}</div>
              <div>字段识别：{overviewFieldStatus}</div>
              <button type="button" onClick={onClearOverviewData} className="mt-2 inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                <Trash2 size={12} />
                清空数据
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-line bg-white p-3 shadow-card">
          <label
            className={`flex cursor-pointer items-center rounded-md border border-dashed border-primary bg-primarySoft px-3 py-2 text-sm text-[#2459af] hover:bg-blue-100 ${collapsed ? 'justify-center' : 'gap-2'}`}
            title={collapsed ? '上传渠道明细数据表' : ''}
          >
            <UploadCloud size={16} />
            {collapsed ? null : '上传渠道明细数据表'}
            <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onChannelFile} />
          </label>
          {collapsed ? null : (
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div>文件名：{channelUpload?.fileName || '-'}</div>
              <div>上传时间：{channelUpload?.uploadedAt ? new Date(channelUpload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
              <div>原始行数：{channelUpload?.rawRows ? channelUpload.rawRows.toLocaleString('zh-CN') : '-'}</div>
              <div>有效行数：{channelUpload?.cleanedRows ? channelUpload.cleanedRows.toLocaleString('zh-CN') : '-'}</div>
              <div>过滤行数：{channelUpload?.filteredRows ? channelUpload.filteredRows.toLocaleString('zh-CN') : '-'}</div>
              <div>字段识别：{channelFieldStatus}</div>
              <button type="button" onClick={onClearChannelData} className="mt-2 inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                <Trash2 size={12} />
                清空渠道明细数据
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-line pt-3 text-xs text-slate-500">
          <div className={collapsed ? 'text-center' : ''} title={collapsed ? `业务识别：${overviewFieldStatus}｜渠道识别：${channelFieldStatus}` : ''}>
            {collapsed ? <Database size={14} className="mx-auto" /> : '字段识别状态'}
          </div>
          {!collapsed && (
            <>
              <div className="mt-1">业务识别：{overviewFieldStatus}</div>
              <div className="mt-1">渠道识别：{channelFieldStatus}</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
