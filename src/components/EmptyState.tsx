import { Database } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="panel flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Database size={26} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">暂无数据</h2>
      <p className="mt-2 max-w-md text-sm text-muted">请在左侧导航栏上传一张业务数据表（.xlsx / .csv），系统会按单表口径自动清洗并生成看板。</p>
    </div>
  );
}
