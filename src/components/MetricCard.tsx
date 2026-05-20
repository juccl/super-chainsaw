interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'highlight';
  unit?: string;
}

export function MetricCard({ label, value, hint, tone = 'neutral', unit }: MetricCardProps) {
  const toneClass = {
    neutral: 'text-ink',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-rose-700',
    highlight: 'text-sky-700',
  }[tone];
  const borderClass = {
    neutral: '',
    good: 'ring-1 ring-emerald-100',
    warn: 'ring-1 ring-amber-100',
    bad: 'ring-1 ring-rose-100',
    highlight: 'ring-1 ring-sky-100 bg-primarySoft',
  }[tone];

  return (
    <div className={`panel p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${borderClass}`}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-2 flex items-end gap-1 text-[28px] font-semibold tabular-nums ${toneClass}`}>
        <span>{value}</span>
        {unit ? <span className="pb-1 text-xs font-medium text-muted">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
