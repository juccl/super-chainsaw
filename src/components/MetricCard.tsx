import {
  Activity,
  BarChart3,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Percent,
  Target,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'highlight';
  unit?: string;
  metricKey?: string;
}

export function MetricCard({ label, value, hint, tone = 'neutral', unit, metricKey }: MetricCardProps) {
  const style = getMetricStyle(metricKey || label);
  const toneAccent = {
    neutral: '',
    good: 'border-emerald-200 text-emerald-700',
    warn: 'border-amber-200 text-amber-700',
    bad: 'border-rose-200 text-rose-700',
    highlight: '',
  }[tone];
  const ToneIcon = style.icon;

  return (
    <div className={`panel rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${style.panel}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${style.iconWrap} ${toneAccent}`}>
          <ToneIcon size={16} />
        </div>
      </div>
      <div className={`mt-2 flex items-end gap-1 text-[28px] font-semibold tabular-nums ${style.value}`}>
        <span className="truncate">{value}</span>
        {unit ? <span className="pb-1 text-xs font-medium text-slate-500">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function getMetricStyle(metricKeyOrLabel: string): {
  panel: string;
  value: string;
  iconWrap: string;
  icon: typeof UserPlus;
} {
  const key = normalize(metricKeyOrLabel);

  const scaleKeys = ['leads', 'cost', 'gmv', 'currentgmv', 'day7gmv', 'totalgmv'];
  const efficiencyKeys = ['conversionrate', 'roi', 'rvalue'];
  const costKeys = ['leadcost', 'costrate'];
  const dKeys = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'attend', 'complete'];

  const isScale = scaleKeys.some((x) => key.includes(x));
  const isEfficiency = efficiencyKeys.some((x) => key.includes(x));
  const isCost = costKeys.some((x) => key.includes(x));
  const isD = dKeys.some((x) => key.includes(x));

  if (isEfficiency) {
    return {
      panel: 'bg-[#ecfdf5] border-[#a7f3d0]',
      value: 'text-[#059669]',
      iconWrap: 'bg-white border-[#a7f3d0] text-[#059669]',
      icon: key.includes('roi') ? Activity : key.includes('rvalue') ? Gauge : Target,
    };
  }

  if (isCost) {
    return {
      panel: 'bg-[#fff7ed] border-[#fed7aa]',
      value: 'text-[#ea580c]',
      iconWrap: 'bg-white border-[#fed7aa] text-[#ea580c]',
      icon: key.includes('costrate') ? Percent : Calculator,
    };
  }

  if (isD) {
    return {
      panel: 'bg-[#f5f3ff] border-[#ddd6fe]',
      value: 'text-[#7c3aed]',
      iconWrap: 'bg-white border-[#ddd6fe] text-[#7c3aed]',
      icon: key.includes('complete') ? CheckCircle2 : BarChart3,
    };
  }

  if (isScale) {
    return {
      panel: 'bg-[#eff6ff] border-[#bfdbfe]',
      value: 'text-[#2563eb]',
      iconWrap: 'bg-white border-[#bfdbfe] text-[#2563eb]',
      icon: key.includes('leads')
        ? UserPlus
        : key.includes('cost')
          ? Wallet
          : key.includes('total')
            ? CircleDollarSign
            : TrendingUp,
    };
  }

  return {
    panel: 'bg-[#f8fafc] border-[#cbd5e1]',
    value: 'text-[#334155]',
    iconWrap: 'bg-white border-[#cbd5e1] text-[#334155]',
    icon: BarChart3,
  };
}

function normalize(input: string) {
  return input.toLowerCase().replace(/[\s_，。/%（）()]+/g, '');
}
