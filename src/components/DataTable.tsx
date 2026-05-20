import { ArrowDownUp, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { exportCsv } from '../lib/exportCsv';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  render?: (row: T) => string | JSX.Element;
  numeric?: boolean;
}

interface DataTableProps<T> {
  title: string;
  rows: T[];
  columns: Column<T>[];
  exportName: string;
  maxHeight?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ title, rows, columns, exportName, maxHeight = '520px', onRowClick }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [query, setQuery] = useState('');

  const visibleRows = useMemo(() => {
    const filtered = query
      ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
      : rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column) return filtered;
    return [...filtered].sort((a, b) => {
      const av = column.accessor(a);
      const bv = column.accessor(b);
      const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), 'zh-CN');
      return direction === 'asc' ? result : -result;
    });
  }, [columns, direction, query, rows, sortKey]);

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setDirection('desc');
    }
  };

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white p-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-xs text-muted">共 {visibleRows.length.toLocaleString('zh-CN')} 行</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="control w-48" placeholder="表内筛选" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button
            type="button"
            className="icon-button"
            title="导出 CSV"
            onClick={() =>
              exportCsv(
                exportName,
                visibleRows.map((row) => Object.fromEntries(columns.map((column) => [column.header, column.accessor(row)]))),
              )
            }
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-[#f1f5fb]">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={`border-b border-line px-3 py-3 text-left text-xs font-semibold text-slate-600 ${column.numeric ? 'text-right' : ''} ${
                    index === 0 ? 'sticky left-0 z-20 bg-[#f1f5fb]' : ''
                  }`}
                >
                  <button type="button" className={`inline-flex items-center gap-1 ${column.numeric ? 'justify-end' : ''}`} onClick={() => toggleSort(column.key)}>
                    {column.header}
                    <ArrowDownUp size={12} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={onRowClick ? 'cursor-pointer hover:bg-primarySoft' : 'hover:bg-slate-50/80'} onClick={() => onRowClick?.(row)}>
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`border-b border-line px-3 py-2 align-middle ${column.numeric ? 'text-right tabular-nums' : ''} ${
                      index === 0 ? 'sticky left-0 bg-white font-medium text-ink shadow-[1px_0_0_#e2e8f0]' : 'text-slate-700'
                    }`}
                  >
                    {column.render ? column.render(row) : column.accessor(row) ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
