import { useEffect, useMemo, useState } from 'react';
import { PersonalPageFilters } from '../components/PersonalPageFilters';
import { applyFilters, emptyFilters } from '../lib/metrics';
import { readStorage, writeStorage } from '../lib/storage';
import { Filters, StandardRow, UploadRecord } from '../types';
import { OverviewPage } from './OverviewPage';

interface PersonalOverviewPageProps {
  rows: StandardRow[];
  upload?: UploadRecord;
  ownerSelection: string[];
  onOwnerSelectionChange: (owners: string[]) => void;
  onApplyFavoriteOwnersToGlobalFilter?: (owners: string[]) => void;
}

const FILTERS_KEY = 'business-dashboard:personal-page:filters-v1';

function normalizeFilters(input: unknown): Filters {
  const fallback = emptyFilters();
  if (!input || typeof input !== 'object') return fallback;
  const value = input as Partial<Record<keyof Filters, unknown>>;
  const asArray = (v: unknown) => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []);
  return {
    channel: asArray(value.channel),
    channelId: asArray(value.channelId),
    channelOwner: asArray(value.channelOwner),
    productType: asArray(value.productType),
    campaign: asArray(value.campaign),
  };
}

export function PersonalOverviewPage({
  rows,
  upload,
  ownerSelection,
  onOwnerSelectionChange,
  onApplyFavoriteOwnersToGlobalFilter,
}: PersonalOverviewPageProps) {
  const [filters, setFilters] = useState<Filters>(() => normalizeFilters(readStorage(FILTERS_KEY, emptyFilters())));

  useEffect(() => writeStorage(FILTERS_KEY, filters), [filters]);

  const filteredRows = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const applyFavoriteOwnersToPageFilter = (owners: string[]) => {
    const validOwners = owners.filter((owner) =>
      rows.some((row) => (row.channelOwner || '未填写') === owner),
    );
    setFilters((prev) => ({ ...prev, channelOwner: validOwners }));
    onApplyFavoriteOwnersToGlobalFilter?.(validOwners);
  };

  return (
    <div className="space-y-4">
      <PersonalPageFilters rows={rows} filters={filters} onChange={setFilters} />
      <OverviewPage
        rows={filteredRows}
        upload={upload}
        ownerSelection={ownerSelection}
        onOwnerSelectionChange={onOwnerSelectionChange}
        onApplyFavoriteOwnersToGlobalFilter={applyFavoriteOwnersToPageFilter}
        mode="module-b"
      />
    </div>
  );
}
