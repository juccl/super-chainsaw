import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, headerExtra, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {headerExtra}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
