import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, Download } from 'lucide-react';
import type { ScanCodeStage } from 'shared';
import { Field, inputCls, textareaCls } from './shared';

interface Props { stage: ScanCodeStage; onChange: (u: Partial<ScanCodeStage>) => void; }

function randomPayload() {
  return `avt-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function ScanCodeEditor({ stage, onChange }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(stage.targetQrPayload || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-preview-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${stage.targetQrPayload || 'kod'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
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
          <button
            type="button"
            title="Генерирај случаен код"
            onClick={() => onChange({ targetQrPayload: randomPayload() })}
            className="shrink-0 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Копирај"
            onClick={copy}
            disabled={!stage.targetQrPayload}
            className="shrink-0 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
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
          <button
            type="button"
            onClick={downloadQR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Симни QR код (SVG)
          </button>
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
