import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { QuizStage } from '../../../types';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './shared';

interface Props {
  stage: QuizStage;
  onChange: (updates: Partial<QuizStage>) => void;
}

const TABS = ['Квиз', 'Одговор', 'Поставки', 'Временски лимит'];

export function QuizStageEditor({ stage, onChange }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab 0: Question */}
      {tab === 0 && (
        <div className="space-y-4">
          <Field label="Наслов на прашањето">
            <input
              type="text"
              className={inputCls}
              placeholder="Внеси наслов..."
              value={stage.title}
              onChange={e => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Прашање / Опис">
            <textarea
              className={textareaCls}
              rows={4}
              placeholder="Внеси го прашањето..."
              value={stage.description}
              onChange={e => onChange({ description: e.target.value })}
            />
          </Field>
          <Field label="Поени">
            <input
              type="number"
              className={inputCls}
              min={0} max={10000}
              value={stage.points ?? 50}
              onChange={e => onChange({ points: Number(e.target.value) })}
            />
          </Field>
        </div>
      )}

      {/* Tab 1: Answer */}
      {tab === 1 && (
        <div className="space-y-4">
          <Field label="Тип на одговор">
            <select
              className={inputCls}
              value={stage.questionType}
              onChange={e => onChange({ questionType: e.target.value as QuizStage['questionType'] })}
            >
              <option value="free_text">Слободен текст</option>
              <option value="multiple_choice">Повеќекратен избор</option>
              <option value="estimate_number">Проценка на број</option>
            </select>
          </Field>

          {stage.questionType === 'multiple_choice' && (
            <Field label="Опции">
              <div className="space-y-2">
                {(stage.options ?? ['']).map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={`Опција ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const opts = [...(stage.options ?? [''])];
                        opts[i] = e.target.value;
                        onChange({ options: opts });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const opts = (stage.options ?? ['']).filter((_, j) => j !== i);
                        onChange({ options: opts });
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onChange({ options: [...(stage.options ?? []), ''] })}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Додај опција
                </button>
              </div>
            </Field>
          )}

          <Field label="Точен одговор">
            <input
              type={stage.questionType === 'estimate_number' ? 'number' : 'text'}
              className={inputCls}
              placeholder="Точен одговор..."
              value={String(stage.correctAnswer)}
              onChange={e => onChange({
                correctAnswer: stage.questionType === 'estimate_number'
                  ? Number(e.target.value)
                  : e.target.value,
              })}
            />
          </Field>

          <Field label="Совет (опционално)" hint="Прикажи се ако играчот греши">
            <input
              type="text"
              className={inputCls}
              placeholder="Совет за играчот..."
              value={stage.hintText ?? ''}
              onChange={e => onChange({ hintText: e.target.value })}
            />
          </Field>
        </div>
      )}

      {/* Tab 2: Settings */}
      {tab === 2 && (
        <div className="space-y-5">
          <Toggle
            label="Точен одговор потребен за продолжување"
            hint="Играчот не може да продолжи без точен одговор"
            checked={stage.requiredToAdvance ?? false}
            onChange={v => onChange({ requiredToAdvance: v })}
          />
          <Field label="Аудио URL (опционално)">
            <input
              type="url"
              className={inputCls}
              placeholder="https://..."
              value={stage.audioUrl ?? ''}
              onChange={e => onChange({ audioUrl: e.target.value })}
            />
          </Field>
        </div>
      )}

      {/* Tab 3: Time limit */}
      {tab === 3 && (
        <div className="space-y-4">
          <Field label="Временски лимит (секунди)" hint="0 = без лимит">
            <input
              type="number"
              className={inputCls}
              min={0} max={3600}
              value={stage.timeLimitSeconds ?? 0}
              onChange={e => onChange({ timeLimitSeconds: Number(e.target.value) })}
            />
          </Field>
          {(stage.timeLimitSeconds ?? 0) > 0 && (
            <p className="text-sm text-amber-400">
              ⏱ {Math.floor((stage.timeLimitSeconds ?? 0) / 60)}м {(stage.timeLimitSeconds ?? 0) % 60}с
            </p>
          )}
        </div>
      )}
    </div>
  );
}
