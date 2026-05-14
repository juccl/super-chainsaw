import { UploadCloud } from 'lucide-react';
import { parseFile } from '../lib/fileParser';
import { normalizeUpload } from '../lib/dataCleaner';
import { StandardRow, UploadRecord } from '../types';

interface FileUploaderProps {
  onParsed: (upload: UploadRecord, rows: StandardRow[]) => void;
  onError: (message: string) => void;
  label?: string;
  compact?: boolean;
}

export function FileUploader({ onParsed, onError, label = '上传 .xlsx / .csv 数据表', compact = false }: FileUploaderProps) {
  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const rawRows = await parseFile(file);
      if (!rawRows.length) {
        onError('上传文件为空，未解析到数据行。');
        return;
      }
      const { upload, standardRows } = normalizeUpload(file.name, rawRows);
      onParsed(upload, standardRows);
    } catch (error) {
      onError(error instanceof Error ? error.message : '文件解析失败。');
    }
  };

  return (
    <label className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-sky-300 bg-sky-50/60 px-4 text-center transition hover:bg-sky-50 ${compact ? 'py-4' : 'py-8'}`}>
      <UploadCloud className="text-sky-600" size={compact ? 22 : 28} />
      <span className="mt-2 text-sm font-semibold text-ink">{label}</span>
      {!compact ? <span className="mt-1 text-xs text-muted">解析、识别、清洗都在本地浏览器完成</span> : null}
      <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => handleFile(event.target.files?.[0])} />
    </label>
  );
}
