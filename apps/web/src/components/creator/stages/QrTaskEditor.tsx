import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Copy, Check, Download, Plus, Trash2 } from 'lucide-react';
import type { QrTaskStage } from 'shared';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './shared';
import { Button } from '../../ui/Button';
import { downloadSvgById, useClipboardFeedback } from './qrEditorUtils';

interface Props {
  stage: QrTaskStage;
  onChange: (u: Partial<QrTaskStage>) => void;
}

const TABS = ['QR Код', 'Задача', 'Поставки'];

function randomPayload() {
  return `avt-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function QrTaskEditor({ stage, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const { status: copyStatus, copy } = useClipboardFeedback();

  const downloadQR = () => {
    downloadSvgById('qrtask-preview-svg', `qr-zadaca-${stage.targetQrPayload || 'kod'}.svg`);
  };

  const addOption = () => onChange({ options: [...(stage.options || []), ''] });
  const updateOption = (i: number, val: string) => {
    const opts = [...(stage.options || [])];
    opts[i] = val;
    onChange({ options: opts });
  };
  const removeOption = (i: number) => {
    const opts = [...(stage.options || [])];
    opts.splice(i, 1);
    onChange({ options: opts });
  };

  return (
    <div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab 0: QR Code */}
      {tab === 0 && (
        <div className="space-y-4">
          <Field label="Наслов на етапата">
            <input type="text" className={inputCls}
              placeholder="Скенирај QR и реши задача..."
              value={stage.title}
              onChange={e => onChange({ title: e.target.value })} />
          </Field>
          <Field label="Упатство за играчот" hint="Каде да го бараат QR кодот">
            <textarea className={textareaCls} rows={2}
              placeholder="Пронајди го QR кодот на таблата..."
              value={stage.description}
              onChange={e => onChange({ description: e.target.value })} />
          </Field>
          <Field label="QR Payload" hint="Уникатен текст во QR кодот">
            <div className="flex gap-2">
              <input type="text" className={inputCls}
                placeholder="avt-ABC123"
                value={stage.targetQrPayload}
                onChange={e => onChange({ targetQrPayload: e.target.value })} />
              <Button type="button" aria-label="Генерирај случаен"
                onClick={() => onChange({ targetQrPayload: randomPayload() })}
                variant="secondary" size="icon" className="shrink-0">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button"
                aria-label={copyStatus === 'success' ? 'Копирано' : copyStatus === 'error' ? 'Копирањето не успеа' : 'Копирај'}
                onClick={() => void copy(stage.targetQrPayload || '')} disabled={!stage.targetQrPayload}
                variant="secondary" size="icon" className="shrink-0">
                {copyStatus === 'success' ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </Field>

          {stage.targetQrPayload && (
            <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">QR Код за печатење</p>
              <QRCodeSVG id="qrtask-preview-svg" value={stage.targetQrPayload}
                size={180} level="M" includeMargin />
              <p className="text-xs text-slate-400 font-mono">{stage.targetQrPayload}</p>
              <Button type="button" onClick={downloadQR} variant="app-primary" size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}>
                Симни QR (SVG)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Task (shown AFTER scan) */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs text-indigo-300">
            💡 Оваа содржина се прикажува <strong>ОТКАКО играчот ќе го скенира QR кодот</strong>
          </div>
          <Field label="Наслов на задачата">
            <input type="text" className={inputCls}
              placeholder="Одговори на прашањето..."
              value={stage.taskTitle}
              onChange={e => onChange({ taskTitle: e.target.value })} />
          </Field>
          <Field label="Прашање / Задача">
            <textarea className={textareaCls} rows={4}
              placeholder="Кој е главниот лик во романот? / Пресметај ја вредноста на x..."
              value={stage.taskDescription}
              onChange={e => onChange({ taskDescription: e.target.value })} />
          </Field>
          <Field label="Слика кон задачата (URL)" hint="Опционално — дијаграм, фото, карта...">
            <input type="url" className={inputCls}
              placeholder="https://..."
              value={stage.taskMediaUrl || ''}
              onChange={e => onChange({ taskMediaUrl: e.target.value })} />
          </Field>

          <Field label="Тип на одговор">
            <select title="Тип на одговор" className={inputCls}
              value={stage.answerType}
              onChange={e => onChange({ answerType: e.target.value as QrTaskStage['answerType'] })}>
              <option value="text">✏️ Текстуален одговор</option>
              <option value="multiple_choice">🔘 Избор на одговор (А/Б/В/Г)</option>
              <option value="photo">📷 Фото доказ</option>
            </select>
          </Field>

          {stage.answerType === 'multiple_choice' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Понудени одговори</p>
              {(stage.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-slate-400 text-sm font-bold w-5 shrink-0">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input type="text" className={inputCls}
                    placeholder={`Одговор ${String.fromCharCode(65 + i)}`}
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)} />
                  <Button type="button" onClick={() => removeOption(i)} variant="ghost" size="icon"
                    aria-label={`Отстрани одговор ${String.fromCharCode(65 + i)}`}
                    colorClassName="bg-slate-700 text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 focus-visible:ring-rose-400">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {(stage.options || []).length < 6 && (
                <Button type="button" onClick={addOption} variant="ghost" size="sm"
                  colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
                  Додади одговор
                </Button>
              )}
            </div>
          )}

          {(stage.answerType === 'text' || stage.answerType === 'multiple_choice') && (
            <Field label="Точен одговор" hint="Оставете празно за рачно оценување">
              <input type="text" className={inputCls}
                placeholder="Точниот одговор (за автоматска проверка)..."
                value={stage.correctAnswer || ''}
                onChange={e => onChange({ correctAnswer: e.target.value })} />
            </Field>
          )}

          <Field label="Поени">
            <input type="number" className={inputCls} min={0} max={10000}
              title="Поени" placeholder="100"
              value={stage.points ?? 100}
              onChange={e => onChange({ points: Number(e.target.value) })} />
          </Field>
        </div>
      )}

      {/* Tab 2: Settings */}
      {tab === 2 && (
        <div className="space-y-4">
          <Toggle
            label="Потребно за продолжување"
            hint="Играчот мора да одговори за да продолжи"
            checked={stage.requiredToAdvance ?? true}
            onChange={v => onChange({ requiredToAdvance: v })} />
        </div>
      )}
    </div>
  );
}
