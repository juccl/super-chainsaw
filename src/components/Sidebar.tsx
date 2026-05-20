import { BarChart3, ChevronLeft, ChevronRight, Database, FolderPlus, Route, Trash2, UploadCloud } from 'lucide-react';
import { ChangeEvent } from 'react';
import { parseFile } from '../lib/fileParser';
import { normalizeUpload } from '../lib/dataCleaner';
import { detectFieldStatus } from '../lib/fieldMapping';
import { PageKey } from './Layout';
import { StandardRow, UploadRecord } from '../types';

interface SidebarProps {
  page: PageKey;
  upload?: UploadRecord;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPageChange: (page: PageKey) => void;
  onUpload: (payload: { upload: UploadRecord; rows: StandardRow[] }) => void;
  onClearData: () => void;
}

const items: Array<{ key: PageKey; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: '首页', icon: BarChart3 },
  { key: 'channel', label: '渠道诊断', icon: Route },
];

export function Sidebar({ page, upload, collapsed, onToggleCollapsed, onPageChange, onUpload, onClearData }: SidebarProps) {
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseFile(file);
      const normalized = normalizeUpload(file.name, raw);
      onUpload({ upload: normalized.upload, rows: normalized.standardRows });
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件解析失败';
      window.alert(message);
    }
    event.target.value = '';
  };
  const fieldStatus = upload ? detectFieldStatus(upload.mapping) : '-';

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
        </nav>

        <div className="mt-4 rounded-lg border border-line bg-white p-3 shadow-card">
          <label
            className={`flex cursor-pointer items-center rounded-md border border-dashed border-primary bg-primarySoft px-3 py-2 text-sm text-[#2459af] hover:bg-blue-100 ${collapsed ? 'justify-center' : 'gap-2'}`}
            title={collapsed ? '上传业务数据表' : ''}
          >
            <UploadCloud size={16} />
            {collapsed ? null : '上传业务数据表'}
            <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
          </label>
          {collapsed ? null : (
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div>文件名：{upload?.fileName || '-'}</div>
              <div>上传时间：{upload ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
              <div>原始行数：{upload?.rawRows.toLocaleString('zh-CN') || '-'}</div>
              <div>有效行数：{upload?.cleanedRows.toLocaleString('zh-CN') || '-'}</div>
              <div>过滤行数：{upload?.filteredRows.toLocaleString('zh-CN') || '-'}</div>
              <div>字段识别：{fieldStatus}</div>
              <button type="button" onClick={onClearData} className="mt-2 inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                <Trash2 size={12} />
                清空数据
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-line pt-3 text-xs text-slate-500">
          <div className={collapsed ? 'text-center' : ''} title={collapsed ? `字段识别：${fieldStatus}` : ''}>
            {collapsed ? <Database size={14} className="mx-auto" /> : `字段识别状态：${fieldStatus}`}
          </div>
          {!collapsed && <div className="mt-1">数据更新时间：{upload ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>}
        </div>
      </div>
    </aside>
  );
}
