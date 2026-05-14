export type StandardField =
  | 'channel'
  | 'channelId'
  | 'productType'
  | 'channelOwner'
  | 'studio'
  | 'campaign'
  | 'startDate'
  | 'leads'
  | 'cost'
  | 'currentGmv'
  | 'day7Gmv'
  | 'totalGmv'
  | 'd1Attendance'
  | 'd1Completion'
  | 'd2Attendance'
  | 'd2Completion'
  | 'd3Attendance'
  | 'd3Completion'
  | 'd4Attendance'
  | 'd4Completion'
  | 'd5Attendance'
  | 'd5Completion'
  | 'd6Attendance'
  | 'd6Completion';

export type RawRow = Record<string, unknown>;
export type FieldMapping = Partial<Record<StandardField, string>>;

export interface StandardRow {
  id: string;
  sourceFile: string;
  fileType: 'csv' | 'xlsx' | 'xls' | 'unknown';
  channel: string;
  channelId: string;
  productType: string;
  channelOwner: string;
  studio: string;
  campaign: string;
  startDate: string;
  leads: number;
  cost: number;
  currentGmv?: number;
  day7Gmv: number;
  totalGmv?: number;
  attendance: Record<1 | 2 | 3 | 4 | 5 | 6, number | undefined>;
  completion: Record<1 | 2 | 3 | 4 | 5 | 6, number | undefined>;
  raw: RawRow;
}

export interface UploadRecord {
  id: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'xls' | 'unknown';
  rawRows: number;
  cleanedRows: number;
  filteredRows: number;
  headers: string[];
  rawRowsData?: RawRow[];
  mapping: FieldMapping;
  filterLogs: Record<string, number>;
  missingRequired: StandardField[];
  uploadedAt: string;
}

export interface Filters {
  channel: string[];
  channelId: string[];
  channelOwner: string[];
  productType: string[];
  campaign: string[];
}

export interface MetricSummary {
  leads: number;
  cost: number;
  leadCost: number | null;
  gmv: number;
  currentGmv: number;
  day7Gmv: number;
  totalGmv: number;
  conversionRate: number | null;
  roi: number | null;
  costRate: number | null;
  rValue: number | null;
  dAttendanceRates: Record<1 | 2 | 3 | 4 | 5 | 6, number | null>;
  dCompletionRates: Record<1 | 2 | 3 | 4 | 5 | 6, number | null>;
}

export interface MetricWithContext extends MetricSummary {
  channel: string;
  channelId: string;
  channelOwner: string;
  productType: string;
  campaign: string;
  startDate: string;
  studio: string;
  statusTags: string[];
}
