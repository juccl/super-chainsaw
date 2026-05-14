import { ReactNode, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { Column, DataTable } from '../components/DataTable';
import { formatMoney, formatPercent, formatRatio } from '../lib/formatters';
import { buildCampaignTrend, summarizeRows, toMetricContext } from '../lib/metrics';
import { MetricWithContext, StandardRow } from '../types';

interface Props {
  rows: StandardRow[];
}

type LocalFilters = {
  channel: string[];
  channelId: string[];
  channelOwner: string[];
  productType: string[];
  campaign: string[];
};

const emptyLocalFilters: LocalFilters = { channel: [], channelId: [], channelOwner: [], productType: [], campaign: [] };

export function ChannelDiagnosisPage({ rows }: Props) {
  const [localFilters, setLocalFilters] = useState<LocalFilters>(emptyLocalFilters);
  const filteredRows = useMemo(() => {
    const inList = (value: string, selected: string[]) => !selected.length || selected.includes(value || '未填写');
    return rows.filter((row) => {
      if (!inList(row.channel, localFilters.channel)) return false;
      if (!inList(row.channelId, localFilters.channelId)) return false;
      if (!inList(row.channelOwner, localFilters.channelOwner)) return false;
      if (!inList(row.productType, localFilters.productType)) return false;
      if (!inList(row.campaign, localFilters.campaign)) return false;
      return true;
    });
  }, [localFilters, rows]);

  const average = summarizeRows(filteredRows);
  const detailRows = toMetricContext(filteredRows, average);
  const campaignTrend = buildCampaignTrend(filteredRows);
  const attendanceTrend = campaignTrend.map((item) => ({
    campaign: item.campaign,
    d1: item.metrics.dAttendanceRates[1],
    d2: item.metrics.dAttendanceRates[2],
    d3: item.metrics.dAttendanceRates[3],
    d4: item.metrics.dAttendanceRates[4],
    d5: item.metrics.dAttendanceRates[5],
    d6: item.metrics.dAttendanceRates[6],
  }));
  const completionTrend = campaignTrend.map((item) => ({
    campaign: item.campaign,
    d1: item.metrics.dCompletionRates[1],
    d2: item.metrics.dCompletionRates[2],
    d3: item.metrics.dCompletionRates[3],
    d4: item.metrics.dCompletionRates[4],
    d5: item.metrics.dCompletionRates[5],
    d6: item.metrics.dCompletionRates[6],
  }));
  const convertTrend = campaignTrend.map((item) => ({
    campaign: item.campaign,
    conversionRate: item.metrics.conversionRate,
    roi: item.metrics.roi,
    rValue: item.metrics.rValue,
  }));
  const pressureTrend = campaignTrend.map((item) => ({
    campaign: item.campaign,
    leadCost: item.metrics.leadCost,
    costRate: item.metrics.costRate,
    cost: item.metrics.cost,
  }));

  const columns: Column<MetricWithContext>[] = [
    { key: 'channel', header: '渠道', accessor: (row) => row.channel },
    { key: 'channelId', header: '渠道ID', accessor: (row) => row.channelId },
    { key: 'channelOwner', header: '渠道归属', accessor: (row) => row.channelOwner },
    { key: 'productType', header: '产品类型', accessor: (row) => row.productType },
    { key: 'campaign', header: '营期', accessor: (row) => row.campaign },
    { key: 'leads', header: 'leads数', accessor: (row) => row.leads, render: (row) => formatMoney(row.leads), numeric: true },
    { key: 'cost', header: '消耗总金额', accessor: (row) => row.cost, render: (row) => formatMoney(row.cost), numeric: true },
    { key: 'gmv', header: 'day7当期成交gmv', accessor: (row) => row.gmv, render: (row) => formatMoney(row.gmv), numeric: true },
    { key: 'conversionRate', header: '转化率', accessor: (row) => row.conversionRate, render: (row) => formatPercent(row.conversionRate, 2), numeric: true },
    { key: 'roi', header: 'ROI', accessor: (row) => row.roi, render: (row) => formatRatio(row.roi), numeric: true },
    { key: 'costRate', header: '费比', accessor: (row) => row.costRate, render: (row) => formatPercent(row.costRate, 2), numeric: true },
    { key: 'leadCost', header: 'leads成本', accessor: (row) => row.leadCost, render: (row) => formatMoney(row.leadCost), numeric: true },
    { key: 'rValue', header: 'R值', accessor: (row) => row.rValue, render: (row) => formatMoney(row.rValue, 1), numeric: true },
    { key: 'd1Attend', header: 'D1到课率', accessor: (row) => row.dAttendanceRates[1], render: (row) => formatPercent(row.dAttendanceRates[1], 2), numeric: true },
    { key: 'd1Complete', header: 'D1完课率', accessor: (row) => row.dCompletionRates[1], render: (row) => formatPercent(row.dCompletionRates[1], 2), numeric: true },
    { key: 'd2Attend', header: 'D2到课率', accessor: (row) => row.dAttendanceRates[2], render: (row) => formatPercent(row.dAttendanceRates[2], 2), numeric: true },
    { key: 'd2Complete', header: 'D2完课率', accessor: (row) => row.dCompletionRates[2], render: (row) => formatPercent(row.dCompletionRates[2], 2), numeric: true },
    { key: 'd3Attend', header: 'D3到课率', accessor: (row) => row.dAttendanceRates[3], render: (row) => formatPercent(row.dAttendanceRates[3], 2), numeric: true },
    { key: 'd3Complete', header: 'D3完课率', accessor: (row) => row.dCompletionRates[3], render: (row) => formatPercent(row.dCompletionRates[3], 2), numeric: true },
    { key: 'd4Attend', header: 'D4到课率', accessor: (row) => row.dAttendanceRates[4], render: (row) => formatPercent(row.dAttendanceRates[4], 2), numeric: true },
    { key: 'd4Complete', header: 'D4完课率', accessor: (row) => row.dCompletionRates[4], render: (row) => formatPercent(row.dCompletionRates[4], 2), numeric: true },
    { key: 'd5Attend', header: 'D5到课率', accessor: (row) => row.dAttendanceRates[5], render: (row) => formatPercent(row.dAttendanceRates[5], 2), numeric: true },
    { key: 'd5Complete', header: 'D5完课率', accessor: (row) => row.dCompletionRates[5], render: (row) => formatPercent(row.dCompletionRates[5], 2), numeric: true },
    { key: 'd6Attend', header: 'D6到课率', accessor: (row) => row.dAttendanceRates[6], render: (row) => formatPercent(row.dAttendanceRates[6], 2), numeric: true },
    { key: 'd6Complete', header: 'D6完课率', accessor: (row) => row.dCompletionRates[6], render: (row) => formatPercent(row.dCompletionRates[6], 2), numeric: true },
    {
      key: 'tags',
      header: '渠道状态',
      accessor: (row) => row.statusTags.join(' / '),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.statusTags.map((tag) => (
            <span key={`${row.channelId}-${row.campaign}-${tag}`} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {tag}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="panel p-4">
        <h2 className="text-sm font-semibold text-ink">渠道选择区</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <FilterChips label="渠道" options={unique(rows, 'channel')} selected={localFilters.channel} onChange={(value) => setLocalFilters({ ...localFilters, channel: value })} />
          <FilterChips label="渠道ID" options={unique(rows, 'channelId')} selected={localFilters.channelId} onChange={(value) => setLocalFilters({ ...localFilters, channelId: value })} />
          <FilterChips label="渠道归属" options={unique(rows, 'channelOwner')} selected={localFilters.channelOwner} onChange={(value) => setLocalFilters({ ...localFilters, channelOwner: value })} />
          <FilterChips label="产品类型" options={unique(rows, 'productType')} selected={localFilters.productType} onChange={(value) => setLocalFilters({ ...localFilters, productType: value })} />
          <FilterChips label="营期" options={unique(rows, 'campaign')} selected={localFilters.campaign} onChange={(value) => setLocalFilters({ ...localFilters, campaign: value })} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="渠道 × 营期 到课率趋势">
          <TrendLine data={attendanceTrend} />
        </ChartCard>
        <ChartCard title="渠道 × 营期 完课率趋势">
          <TrendLine data={completionTrend} />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="转化效率趋势（转化率 / ROI / R值）">
          <SimpleLine data={convertTrend}>
            <Line type="monotone" dataKey="conversionRate" stroke="#0284c7" strokeWidth={2} />
            <Line type="monotone" dataKey="roi" stroke="#16a34a" strokeWidth={2} />
            <Line type="monotone" dataKey="rValue" stroke="#6366f1" strokeWidth={2} />
          </SimpleLine>
        </ChartCard>
        <ChartCard title="成本压力趋势（leads成本 / 费比 / 消耗）">
          <SimpleLine data={pressureTrend}>
            <Line type="monotone" dataKey="leadCost" stroke="#f97316" strokeWidth={2} />
            <Line type="monotone" dataKey="costRate" stroke="#dc2626" strokeWidth={2} />
            <Line type="monotone" dataKey="cost" stroke="#0f766e" strokeWidth={2} />
          </SimpleLine>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <Ranking title="ROI排名" rows={detailRows} value={(row) => row.roi} />
        <Ranking title="R值排名" rows={detailRows} value={(row) => row.rValue} />
        <Ranking title="转化率排名" rows={detailRows} value={(row) => row.conversionRate} />
        <Ranking title="leads成本排名" rows={detailRows} value={(row) => row.leadCost} />
        <Ranking title="day7当期成交gmv排名" rows={detailRows} value={(row) => row.gmv} />
        <Ranking title="leads数排名" rows={detailRows} value={(row) => row.leads} />
        <Ranking title="D1到课率排名" rows={detailRows} value={(row) => row.dAttendanceRates[1]} />
        <Ranking title="D4完课率排名" rows={detailRows} value={(row) => row.dCompletionRates[4]} />
      </div>

      <DataTable title="渠道波动明细表" rows={detailRows} columns={columns} exportName="channel-diagnosis.csv" />
    </div>
  );
}

function unique(rows: StandardRow[], key: keyof Pick<StandardRow, 'channel' | 'channelId' | 'channelOwner' | 'productType' | 'campaign'>) {
  return Array.from(new Set(rows.map((row) => row[key] || '未填写'))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function FilterChips({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div className="flex max-h-32 flex-wrap gap-1 overflow-auto rounded-md border border-line bg-white p-2">
        {!selected.length ? (
          <button type="button" className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700">
            全部
          </button>
        ) : (
          <button type="button" className="rounded border border-line px-2 py-1 text-xs text-slate-600" onClick={() => onChange([])}>
            清空
          </button>
        )}
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
              className={`rounded border px-2 py-1 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-line text-slate-600'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrendLine({ data }: { data: Array<{ campaign: string; d1: number | null; d2: number | null; d3: number | null; d4: number | null; d5: number | null; d6: number | null }> }) {
  return (
    <SimpleLine data={data}>
      <Line type="monotone" dataKey="d1" stroke="#0284c7" strokeWidth={2} />
      <Line type="monotone" dataKey="d2" stroke="#0ea5e9" strokeWidth={2} />
      <Line type="monotone" dataKey="d3" stroke="#06b6d4" strokeWidth={2} />
      <Line type="monotone" dataKey="d4" stroke="#10b981" strokeWidth={2.5} />
      <Line type="monotone" dataKey="d5" stroke="#22c55e" strokeWidth={2} />
      <Line type="monotone" dataKey="d6" stroke="#4ade80" strokeWidth={2} />
    </SimpleLine>
  );
}

function SimpleLine({ data, children }: { data: Array<Record<string, string | number | null>>; children: ReactNode }) {
  if (!data.length) return <div className="py-16 text-center text-sm text-muted">暂无可展示数据</div>;
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="campaign" />
          <YAxis />
          <Tooltip />
          <Legend />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Ranking({ title, rows, value }: { title: string; rows: MetricWithContext[]; value: (row: MetricWithContext) => number | null }) {
  const data = [...rows]
    .filter((row) => value(row) !== null)
    .sort((a, b) => (value(b) || 0) - (value(a) || 0))
    .slice(0, 8)
    .map((row) => ({ name: `${row.channelId}-${row.campaign}`, value: value(row) }));
  return (
    <ChartCard title={title}>
      {data.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-muted">暂无数据</div>
      )}
    </ChartCard>
  );
}
