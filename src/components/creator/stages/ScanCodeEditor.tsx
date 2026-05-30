import type { ScanCodeStage } from '../../../types';
import { Field, inputCls, textareaCls } from './shared';

interface Props { stage: ScanCodeStage; onChange: (u: Partial<ScanCodeStage>) => void; }

export function ScanCodeEditor({ stage, onChange }: Props) {
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
      <Field label="Очекуван QR payload" hint="Текстот/ID кој QR кодот треба да го содржи">
        <input type="text" className={inputCls} placeholder="npr. location-skopje-001"
          value={stage.targetQrPayload} onChange={e => onChange({ targetQrPayload: e.target.value })} />
      </Field>
      <Field label="Поени">
        <input type="number" className={inputCls} min={0} max={10000}
          value={stage.points ?? 75} onChange={e => onChange({ points: Number(e.target.value) })} />
      </Field>
    </div>
  );
}
