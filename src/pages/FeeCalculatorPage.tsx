import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { formatMoney, formatPercent, formatRatio } from '../lib/formatters';
import { readStorage, writeStorage } from '../lib/storage';

interface Scenario {
  id: string;
  name: string;
  leads: number;
  leadCost: number;
  conversionRatePct: number;
  unitPrice: number;
}

const STORAGE_KEY = 'business-dashboard:fee-calculator:scenarios-v1';

const defaultScenarios: Scenario[] = [
  { id: 'a', name: '方案 A：保守方案', leads: 1000, leadCost: 40, conversionRatePct: 1.0, unitPrice: 2980 },
  { id: 'b', name: '方案 B：基准方案', leads: 1000, leadCost: 40, conversionRatePct: 1.5, unitPrice: 2980 },
  { id: 'c', name: '方案 C：乐观方案', leads: 1000, leadCost: 40, conversionRatePct: 2.0, unitPrice: 2980 },
];

function normalizeScenarios(input: unknown): Scenario[] {
  if (!Array.isArray(input)) return defaultScenarios;
  const parsed = input
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, idx) => ({
      id: typeof item.id === 'string' ? item.id : `x-${idx}`,
      name: typeof item.name === 'string' ? item.name : `方案 ${idx + 1}`,
      leads: toNum(item.leads, 1000),
      leadCost: toNum(item.leadCost, 40),
      conversionRatePct: toNum(item.conversionRatePct, 1.5),
      unitPrice: toNum(item.unitPrice, 2980),
    }));
  return parsed.length ? parsed : defaultScenarios;
}

function toNum(input: unknown, fallback: number): number {
  const n = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function calcMetrics(s: Scenario) {
  const conversionRate = s.conversionRatePct / 100;
  const deals = s.leads * conversionRate;
  const gmv = deals * s.unitPrice;
  const cost = s.leads * s.leadCost;
  const costRate = gmv > 0 ? cost / gmv : null;
  const roi = cost > 0 ? gmv / cost : null;
  const rValue = s.leads > 0 ? gmv / s.leads : null;
  return { deals, gmv, cost, costRate, roi, rValue };
}

export function FeeCalculatorPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => normalizeScenarios(readStorage(STORAGE_KEY, defaultScenarios)));
  const [activeId, setActiveId] = useState<string>(() => normalizeScenarios(readStorage(STORAGE_KEY, defaultScenarios))[0]?.id || 'a');

  useEffect(() => writeStorage(STORAGE_KEY, scenarios), [scenarios]);

  const activeScenario = scenarios.find((item) => item.id === activeId) || scenarios[0];
  const activeMetrics = activeScenario ? calcMetrics(activeScenario) : null;

  const rows = useMemo(
    () =>
      scenarios.map((scenario) => {
        const metrics = calcMetrics(scenario);
        return { ...scenario, ...metrics };
      }),
    [scenarios],
  );

  const updateScenario = (id: string, patch: Partial<Scenario>) => {
    setScenarios((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addScenario = () => {
    const id = `x-${Date.now()}`;
    setScenarios((prev) => [
      ...prev,
      { id, name: `方案 ${prev.length + 1}`, leads: 1000, leadCost: 40, conversionRatePct: 1.5, unitPrice: 2980 },
    ]);
    setActiveId(id);
  };

  const removeScenario = (id: string) => {
    setScenarios((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : prev;
    });
    if (activeId === id) {
      const next = scenarios.find((item) => item.id !== id);
      if (next) setActiveId(next.id);
    }
  };

  return (
    <div className="space-y-5">
      <section className="panel bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">测算输入</h2>
          <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" onClick={addScenario}>
            <Plus size={14} />
            新增方案
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {scenarios.map((scenario) => {
            const active = scenario.id === activeId;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveId(scenario.id)}
                className={`rounded-lg border px-3 py-2 text-left ${active ? 'border-sky-300 bg-sky-50' : 'border-line bg-white'}`}
              >
                <div className="text-sm font-medium text-ink">{scenario.name}</div>
                <div className="mt-1 text-xs text-muted">
                  leads {formatMoney(scenario.leads)} · 出价 {formatMoney(scenario.leadCost)} · 转化率 {scenario.conversionRatePct}%
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeScenario && activeMetrics ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="成交人数" value={formatMoney(activeMetrics.deals, 1)} metricKey="deals" />
          <MetricCard label="GMV" value={formatMoney(activeMetrics.gmv)} metricKey="gmv" />
          <MetricCard label="消耗" value={formatMoney(activeMetrics.cost)} metricKey="cost" />
          <MetricCard label="费比" value={formatPercent(activeMetrics.costRate, 2)} metricKey="costRate" tone="highlight" />
          <MetricCard label="ROI" value={formatRatio(activeMetrics.roi, 2)} metricKey="roi" tone="highlight" />
          <MetricCard label="R值" value={formatMoney(activeMetrics.rValue, 1)} metricKey="rValue" tone="highlight" />
          <MetricCard label="leads成本" value={formatMoney(activeScenario.leadCost)} metricKey="leadCost" />
        </section>
      ) : null}

      <section className="panel overflow-hidden bg-white">
        <div className="border-b border-line p-4">
          <h3 className="text-sm font-semibold text-ink">方案对比表</h3>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 bg-[#f1f5fb] text-xs text-slate-600">
              <tr>
                {['方案名称', 'leads数', '出价', '转化率%', '客单价', '成交人数', 'GMV', '消耗', '费比', 'ROI', 'R值', '操作'].map((h) => (
                  <th key={h} className="border-b border-line px-3 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="border-b border-line px-3 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateScenario(row.id, { name: e.target.value })}
                      className="w-44 rounded border border-line px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="border-b border-line px-3 py-2">
                    <input value={row.leads} onChange={(e) => updateScenario(row.id, { leads: toNum(e.target.value, row.leads) })} className="w-24 rounded border border-line px-2 py-1 text-sm" />
                  </td>
                  <td className="border-b border-line px-3 py-2">
                    <input value={row.leadCost} onChange={(e) => updateScenario(row.id, { leadCost: toNum(e.target.value, row.leadCost) })} className="w-20 rounded border border-line px-2 py-1 text-sm" />
                  </td>
                  <td className="border-b border-line px-3 py-2">
                    <input value={row.conversionRatePct} onChange={(e) => updateScenario(row.id, { conversionRatePct: toNum(e.target.value, row.conversionRatePct) })} className="w-20 rounded border border-line px-2 py-1 text-sm" />
                  </td>
                  <td className="border-b border-line px-3 py-2">
                    <input value={row.unitPrice} onChange={(e) => updateScenario(row.id, { unitPrice: toNum(e.target.value, row.unitPrice) })} className="w-24 rounded border border-line px-2 py-1 text-sm" />
                  </td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatMoney(row.deals, 1)}</td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatMoney(row.gmv)}</td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatMoney(row.cost)}</td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatPercent(row.costRate, 2)}</td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatRatio(row.roi, 2)}</td>
                  <td className="border-b border-line px-3 py-2 tabular-nums">{formatMoney(row.rValue, 1)}</td>
                  <td className="border-b border-line px-3 py-2">
                    <button type="button" onClick={() => removeScenario(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-slate-600 hover:bg-slate-50">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

