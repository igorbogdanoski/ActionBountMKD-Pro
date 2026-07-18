import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, Download } from 'lucide-react';
import type { ScanCodeStage } from 'shared';
import { Field, inputCls, textareaCls } from './shared';
import { Button } from '../../ui/Button';
import { downloadSvgById, useClipboardFeedback } from './qrEditorUtils';

interface Props { stage: ScanCodeStage; onChange: (u: Partial<ScanCodeStage>) => void; }

function randomPayload() {
  return `avt-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function ScanCodeEditor({ stage, onChange }: Props) {
  const { status: copyStatus, copy } = useClipboardFeedback();

  const downloadQR = () => {
    downloadSvgById('qr-preview-svg', `qr-${stage.targetQrPayload || 'kod'}.svg`);
  };

  return (
    <div className="space-y-4">
      <Field label="Наслов">
        <input type="text" className={inputCls} placeholder="Скенирај го QR кодот..."
          value={stage.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Упатство за играчот">
        <textarea className={textareaCls} rows={3} placeholder="Пронајди го и скенирај го QR кодот..."
          value={stage.description} onChange={e => onChange({ description: e.target.value })} />
      </Field>

      <Field label="Очекуван QR payload" hint="Текстот кој QR кодот треба да го содржи">
        <div className="flex gap-2">
          <input type="text" className={inputCls} placeholder="npr. location-skopje-001"
            value={stage.targetQrPayload}
            onChange={e => onChange({ targetQrPayload: e.target.value })} />
          <Button
            type="button"
            aria-label="Генерирај случаен код"
            onClick={() => onChange({ targetQrPayload: randomPayload() })}
            variant="secondary" size="icon" className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            aria-label={copyStatus === 'success' ? 'Копирано' : copyStatus === 'error' ? 'Копирањето не успеа' : 'Копирај'}
            onClick={() => void copy(stage.targetQrPayload || '')}
            disabled={!stage.targetQrPayload}
            variant="secondary" size="icon" className="shrink-0"
          >
            {copyStatus === 'success' ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </Field>

      {/* Live QR preview */}
      {stage.targetQrPayload && (
        <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Преглед на QR код</p>
          <QRCodeSVG
            id="qr-preview-svg"
            value={stage.targetQrPayload}
            size={160}
            level="M"
            includeMargin
          />
          <p className="text-xs text-slate-400 font-mono">{stage.targetQrPayload}</p>
          <Button
            type="button"
            onClick={downloadQR}
            variant="app-primary" size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Симни QR код (SVG)
          </Button>
        </div>
      )}

      <Field label="Поени">
        <input type="number" className={inputCls} min={0} max={10000}
          placeholder="50" title="Поени за оваа етапа"
          value={stage.points ?? 75} onChange={e => onChange({ points: Number(e.target.value) })} />
      </Field>
    </div>
  );
}
