import { BarChart3, ChevronLeft, ChevronRight, Database, Route, Trash2, UploadCloud } from 'lucide-react';
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
  { key: 'overview', label: '经营总览', icon: BarChart3 },
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
    <aside className={`fixed left-0 top-0 hidden h-screen border-r border-slate-200 bg-slate-950 text-white lg:block ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex h-full flex-col px-3 py-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className={collapsed ? 'hidden' : 'block'}>
            <div className="text-sm font-semibold">钢琴经营看板</div>
            <div className="text-xs text-slate-400">单表分析</div>
          </div>
          <button type="button" onClick={onToggleCollapsed} className="icon-button border-white/20 bg-white/10 text-white hover:bg-white/20" title={collapsed ? '展开' : '折叠'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.key === page;
            return (
              <button
                key={item.key}
                type="button"
                title={collapsed ? item.label : ''}
                onClick={() => onPageChange(item.key)}
                className={`flex h-10 w-full items-center rounded-md px-3 text-sm ${
                  active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : 'gap-3'}`}
              >
                <Icon size={16} />
                {collapsed ? null : item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
          <label
            className={`flex cursor-pointer items-center rounded-md border border-dashed border-sky-300/80 bg-sky-400/10 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/20 ${collapsed ? 'justify-center' : 'gap-2'}`}
            title={collapsed ? '上传业务数据表' : ''}
          >
            <UploadCloud size={16} />
            {collapsed ? null : '上传业务数据表'}
            <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
          </label>
          {collapsed ? null : (
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <div>文件名：{upload?.fileName || '-'}</div>
              <div>上传时间：{upload ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>
              <div>原始行数：{upload?.rawRows.toLocaleString('zh-CN') || '-'}</div>
              <div>有效行数：{upload?.cleanedRows.toLocaleString('zh-CN') || '-'}</div>
              <div>过滤行数：{upload?.filteredRows.toLocaleString('zh-CN') || '-'}</div>
              <div>字段识别：{fieldStatus}</div>
              <button type="button" onClick={onClearData} className="mt-2 inline-flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs text-slate-100 hover:bg-white/10">
                <Trash2 size={12} />
                清空数据
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-white/10 pt-3 text-xs text-slate-400">
          <div className={collapsed ? 'text-center' : ''} title={collapsed ? `字段识别：${fieldStatus}` : ''}>
            {collapsed ? <Database size={14} className="mx-auto" /> : `字段识别状态：${fieldStatus}`}
          </div>
          {!collapsed && <div className="mt-1">数据更新时间：{upload ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'}</div>}
        </div>
      </div>
    </aside>
  );
}
