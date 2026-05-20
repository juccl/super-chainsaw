import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getFilterOptions } from '../lib/metrics';
import { readStorage, writeStorage } from '../lib/storage';
import { Filters, StandardRow } from '../types';

interface GlobalFiltersProps {
  rows: StandardRow[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const STORAGE = {
  panelCollapsed: 'business-dashboard:filters:panel-collapsed-v1',
  fieldCollapsed: 'business-dashboard:filters:field-collapsed-v1',
};

const fields: Array<{
  key: keyof Filters;
  rowKey: keyof Pick<StandardRow, 'channel' | 'channelId' | 'channelOwner' | 'productType' | 'campaign'>;
  label: string;
}> = [
  { key: 'channel', rowKey: 'channel', label: '渠道' },
  { key: 'channelId', rowKey: 'channelId', label: '渠道ID' },
  { key: 'channelOwner', rowKey: 'channelOwner', label: '渠道归属' },
  { key: 'productType', rowKey: 'productType', label: '产品类型' },
  { key: 'campaign', rowKey: 'campaign', label: '营期' },
];

type FieldCollapseState = Record<keyof Filters, boolean>;

const defaultFieldCollapse: FieldCollapseState = {
  channel: false,
  channelId: false,
  channelOwner: false,
  productType: false,
  campaign: false,
};

export function GlobalFilters({ rows, filters, onChange }: GlobalFiltersProps) {
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => normalizeBool(readStorage(STORAGE.panelCollapsed, false), false));
  const [fieldCollapsed, setFieldCollapsed] = useState<FieldCollapseState>(() =>
    normalizeFieldCollapsed(readStorage(STORAGE.fieldCollapsed, defaultFieldCollapse)),
  );
  const [queries, setQueries] = useState<Partial<Record<keyof Filters, string>>>({});

  useEffect(() => writeStorage(STORAGE.panelCollapsed, panelCollapsed), [panelCollapsed]);
  useEffect(() => writeStorage(STORAGE.fieldCollapsed, fieldCollapsed), [fieldCollapsed]);

  const allOptionsByField = useMemo(
    () =>
      Object.fromEntries(fields.map((field) => [field.key, getFilterOptions(rows, field.rowKey)])) as Record<keyof Filters, string[]>,
    [rows],
  );

  const setField = (key: keyof Filters, next: string[]) => onChange({ ...filters, [key]: next });

  const clearAll = () => onChange({ channel: [], channelId: [], channelOwner: [], productType: [], campaign: [] });

  const selectAllFields = () => {
    onChange({
      channel: allOptionsByField.channel,
      channelId: allOptionsByField.channelId,
      channelOwner: allOptionsByField.channelOwner,
      productType: allOptionsByField.productType,
      campaign: allOptionsByField.campaign,
    });
  };

  const summaryText = fields
    .map((field) => {
      const selectedCount = filters[field.key].length;
      return `${field.label} ${selectedCount ? `${selectedCount} 项` : '全部'}`;
    })
    .join(' / ');

  if (panelCollapsed) {
    return (
      <section className="panel mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-700">当前筛选：{summaryText}</div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border border-line px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={clearAll}>
              清空筛选
            </button>
            <button type="button" className="rounded-md border border-line px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => setPanelCollapsed(false)}>
              展开筛选
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel mb-4 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">筛选工具栏</h2>
          <p className="section-subtitle">支持搜索、多选、全选和折叠，筛选器按字段 AND 联动。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={selectAllFields}>
            全选全部
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={clearAll}>
            清空筛选
          </button>
          <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={() => setPanelCollapsed(true)}>
            收起筛选
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto pr-1 filter-scroll">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const selected = filters[field.key];
          const query = queries[field.key] || '';
          const allOptions = allOptionsByField[field.key];
          const visibleOptions = query ? allOptions.filter((item) => normalize(item).includes(normalize(query))) : allOptions;
          const selectedCount = selected.length;
          const title = selectedCount ? `${field.label}（已选 ${selectedCount} / 共 ${allOptions.length}）` : `${field.label}（全部）`;
          const collapsed = fieldCollapsed[field.key];

          const selectAllVisible = () => {
            const union = Array.from(new Set([...selected, ...visibleOptions]));
            setField(field.key, union);
          };

          return (
            <div key={field.key} className="rounded-lg border border-line bg-slate-50/40 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-700">{title}</div>
                  {collapsed ? <div className="mt-1 text-xs text-slate-500">{buildSelectedSummary(selected)}</div> : null}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setFieldCollapsed((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                >
                  {collapsed ? (
                    <>
                      展开
                      <ChevronDown size={12} />
                    </>
                  ) : (
                    <>
                      收起
                      <ChevronUp size={12} />
                    </>
                  )}
                </button>
              </div>

              {collapsed ? null : (
                <>
                    <label className="mb-2 flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2 shadow-sm">
                    <Search size={13} className="text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQueries((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      className="w-full border-none bg-transparent text-xs outline-none"
                      placeholder={`搜索${field.label}`}
                    />
                    {query ? (
                      <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setQueries((prev) => ({ ...prev, [field.key]: '' }))}>
                        <X size={12} />
                      </button>
                    ) : null}
                  </label>

                  <div className="mb-2 flex items-center gap-2">
                    <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={selectAllVisible}>
                      全选
                    </button>
                    <button type="button" className="rounded border border-line bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={() => setField(field.key, [])}>
                      清空
                    </button>
                  </div>

                  <div className="max-h-[196px] overflow-y-auto rounded-md bg-white p-1.5 filter-scroll">
                    {visibleOptions.length === 0 ? <div className="px-2 py-1 text-xs text-muted">无匹配项</div> : null}
                    {visibleOptions.map((option) => {
                      const active = selected.includes(option);
                      return (
                        <label key={option} className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() =>
                              setField(
                                field.key,
                                active ? selected.filter((item) => item !== option) : [...selected, option],
                              )
                            }
                          />
                          <span className="truncate">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}

function buildSelectedSummary(selected: string[]): string {
  if (!selected.length) return '全部';
  if (selected.length <= 2) return `已选 ${selected.join('、')}`;
  return `已选 ${selected.slice(0, 2).join('、')} +${selected.length - 2} 项`;
}

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, '');
}

function normalizeBool(input: unknown, fallback = false): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

function normalizeFieldCollapsed(input: unknown): FieldCollapseState {
  const fallback = defaultFieldCollapse;
  if (!input || typeof input !== 'object') return fallback;
  const raw = input as Partial<Record<keyof Filters, unknown>>;
  return {
    channel: normalizeBool(raw.channel, false),
    channelId: normalizeBool(raw.channelId, false),
    channelOwner: normalizeBool(raw.channelOwner, false),
    productType: normalizeBool(raw.productType, false),
    campaign: normalizeBool(raw.campaign, false),
  };
}
