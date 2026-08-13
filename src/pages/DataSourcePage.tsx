import { ChangeEvent, DragEvent, FormEvent, useState } from 'react';
import { Database, FilePenLine, Link2, Trash2, UploadCloud, WandSparkles } from 'lucide-react';
import { type ChannelDetailRow, type ChannelDetailUploadRecord } from '../lib/channelDetail';

export interface ManualChannelInput {
  campaign: string;
  owner: string;
  channelId: string;
  category: string;
  leads: number;
  cost: number;
  d4gmv: number;
  d5gmv: number;
  d6gmv: number;
  d7gmv: number;
  d8gmv: number;
  d9gmv: number;
  d10gmv: number;
}

interface DataSourcePageProps {
  rows: ChannelDetailRow[];
  upload?: ChannelDetailUploadRecord;
  onUpload: (file: File) => void;
  onClear: () => void;
  onManualSubmit: (input: ManualChannelInput) => void;
}

const initialManualInput: ManualChannelInput = {
  campaign: '',
  owner: '',
  channelId: '',
  category: '图书',
  leads: 0,
  cost: 0,
  d4gmv: 0,
  d5gmv: 0,
  d6gmv: 0,
  d7gmv: 0,
  d8gmv: 0,
  d9gmv: 0,
  d10gmv: 0,
};

export function DataSourcePage({ rows, upload, onUpload, onClear, onManualSubmit }: DataSourcePageProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<ManualChannelInput>(initialManualInput);
  const [dragActive, setDragActive] = useState(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload(file);
    event.target.value = '';
  };

  const onDropFile = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    onUpload(file);
  };

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onManualSubmit(manual);
    setManual(initialManualInput);
    setManualOpen(false);
  };

  return (
    <div className="source-workbench">
      <section className="source-hero">
        <div>
          <h2>渠道经营明细数据源</h2>
          <p>只保留一个常用数据源，新文件会覆盖本地缓存；手动录入作为兜底入口。</p>
        </div>
        <div className="source-status-pill">
          <Database size={16} />
          <span>{upload ? '已接入' : '待上传'}</span>
        </div>
      </section>

      <label
        className={`source-dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDropFile}
      >
        <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
        <span className="source-upload-icon">
          <UploadCloud size={34} />
        </span>
        <strong>上传渠道明细文件</strong>
        <p>点击选择，或将 .csv / .xlsx 文件拖到这里</p>
        {upload ? <em>当前文件：{upload.fileName}</em> : null}
      </label>

      <section className="source-action-grid" aria-label="数据源操作">
        <button type="button" className="source-option" onClick={() => setManualOpen(true)}>
          <FilePenLine size={30} />
          <span>手动录入</span>
        </button>
        <label className="source-option as-label">
          <UploadCloud size={30} />
          <span>上传覆盖</span>
          <input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
        </label>
        <div className="source-option muted">
          <WandSparkles size={30} />
          <span>定点导入</span>
          <small>预留</small>
        </div>
        <div className="source-side-options">
          <button type="button" className="source-side-option" onClick={() => setManualOpen(true)}>
            <FilePenLine size={24} />
            兜底录入
          </button>
          <button type="button" className="source-side-option muted" disabled>
            <Link2 size={24} />
            链接导入
          </button>
        </div>
      </section>

      <section className="source-current-card">
        <div className="source-current-head">
          <div>
            <span>当前数据源</span>
            <strong>{upload?.fileName || '暂无文件'}</strong>
          </div>
          <button type="button" onClick={onClear} disabled={!upload && rows.length === 0}>
            <Trash2 size={15} />
            清空
          </button>
        </div>
        <div className="source-current-grid">
          <InfoItem label="上传时间" value={upload?.uploadedAt ? new Date(upload.uploadedAt).toLocaleString('zh-CN') : '-'} />
          <InfoItem label="清洗后行数" value={rows.length.toLocaleString('zh-CN')} />
          <InfoItem label="字段识别" value={upload?.mapping ? '已缓存映射' : '-'} />
          <InfoItem label="导入方式" value={upload ? '上传覆盖 / 手动补录' : '等待接入'} />
        </div>
      </section>

      {manualOpen ? (
        <div className="modal-mask" onClick={() => setManualOpen(false)}>
          <form className="manual-modal" onSubmit={submitManual} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>手动录入兜底</h2>
              <button type="button" onClick={() => setManualOpen(false)}>
                关闭
              </button>
            </div>
            <div className="manual-grid">
              <TextField label="营期" value={manual.campaign} onChange={(value) => setManual((prev) => ({ ...prev, campaign: value }))} />
              <TextField label="归属人" value={manual.owner} onChange={(value) => setManual((prev) => ({ ...prev, owner: value }))} />
              <TextField label="渠道号" value={manual.channelId} onChange={(value) => setManual((prev) => ({ ...prev, channelId: value }))} />
              <TextField label="分类" value={manual.category} onChange={(value) => setManual((prev) => ({ ...prev, category: value }))} />
              <NumberField label="leads" value={manual.leads} onChange={(value) => setManual((prev) => ({ ...prev, leads: value }))} />
              <NumberField label="消耗" value={manual.cost} onChange={(value) => setManual((prev) => ({ ...prev, cost: value }))} />
              {([4, 5, 6, 7, 8, 9, 10] as const).map((day) => {
                const key = `d${day}gmv` as keyof ManualChannelInput;
                return (
                  <NumberField
                    key={key}
                    label={`D${day} GMV`}
                    value={manual[key] as number}
                    onChange={(value) => setManual((prev) => ({ ...prev, [key]: value }))}
                  />
                );
              })}
            </div>
            <div className="modal-actions">
              <button type="button" className="sku-secondary" onClick={() => setManualOpen(false)}>
                取消
              </button>
              <button type="submit" className="sku-primary">
                保存录入
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
      />
    </label>
  );
}
