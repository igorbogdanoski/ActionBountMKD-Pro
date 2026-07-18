import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { QuizStage, MatchingPair, OrderingItem } from 'shared';
import { Tabs, Field, Toggle, inputCls } from './shared';
import { MathRichEditor } from '../../editor/MathRichEditor';
import { Button } from '../../ui/Button';

const MAX_QUIZ_OPTIONS = 8;
const MAX_MATCHING_PAIRS = 20;
const MAX_ORDERING_ITEMS = 20;

function uid() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}

// textareaCls no longer used directly — MathRichEditor replaces it

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
          <MathRichEditor
            label="Прашање / Опис"
            rows={4}
            placeholder="Внеси го прашањето... Користи $x^2$ за inline math или $$\frac{a}{b}$$ за блок формула"
            value={stage.description}
            onChange={v => onChange({ description: v })}
            hint="Поддржува KaTeX математика: $формула$ или $$блок$$"
          />
          <Field label="Поени">
            <input
              type="number"
              aria-label="Поени"
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
              aria-label="Тип на одговор"
              className={inputCls}
              value={stage.questionType}
              onChange={e => onChange({ questionType: e.target.value as QuizStage['questionType'] })}
            >
              <option value="free_text">Слободен текст</option>
              <option value="multiple_choice">Повеќекратен избор</option>
              <option value="estimate_number">Проценка на број</option>
              <option value="matching">Поврзување парови</option>
              <option value="ordering">Подредување</option>
            </select>
          </Field>

          {stage.questionType === 'matching' && (
            <Field label="Парови за поврзување" hint="Играчот ги поврзува левата и десната страна">
              <div className="space-y-2">
                {(stage.matchingPairs ?? []).map((pair, i) => (
                  <div key={pair.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={`Лево ${i + 1}`}
                      value={pair.left}
                      onChange={e => {
                        const next = [...(stage.matchingPairs ?? [])];
                        next[i] = { ...next[i], left: e.target.value };
                        onChange({ matchingPairs: next });
                      }}
                    />
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={`Десно ${i + 1}`}
                      value={pair.right}
                      onChange={e => {
                        const next = [...(stage.matchingPairs ?? [])];
                        next[i] = { ...next[i], right: e.target.value };
                        onChange({ matchingPairs: next });
                      }}
                    />
                    <Button
                      type="button"
                      aria-label={`Отстрани пар ${i + 1}`}
                      onClick={() => onChange({ matchingPairs: (stage.matchingPairs ?? []).filter((_, j) => j !== i) })}
                      variant="ghost" size="icon"
                      colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  disabled={(stage.matchingPairs ?? []).length >= MAX_MATCHING_PAIRS}
                  onClick={() => {
                    const pair: MatchingPair = { id: uid(), left: '', right: '' };
                    onChange({ matchingPairs: [...(stage.matchingPairs ?? []), pair] });
                  }}
                  variant="ghost" size="sm"
                  colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Додај пар
                </Button>
              </div>
            </Field>
          )}

          {stage.questionType === 'ordering' && (
            <Field label="Ставки по редослед" hint="Играчот мора да ги подреди во истиот редослед">
              <div className="space-y-2">
                {(stage.orderingItems ?? []).map((item, i) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <span className="w-6 text-xs font-bold text-slate-500 shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder={`Ставка ${i + 1}`}
                      value={item.text}
                      onChange={e => {
                        const next = [...(stage.orderingItems ?? [])];
                        next[i] = { ...next[i], text: e.target.value };
                        onChange({ orderingItems: next });
                      }}
                    />
                    <Button
                      type="button"
                      aria-label={`Помести нагоре ${i + 1}`}
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...(stage.orderingItems ?? [])];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        onChange({ orderingItems: next });
                      }}
                      variant="ghost" size="icon"
                      colorClassName="text-slate-500 hover:text-indigo-400 focus-visible:ring-indigo-400"
                      className="shrink-0"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      aria-label={`Помести надолу ${i + 1}`}
                      disabled={i === (stage.orderingItems ?? []).length - 1}
                      onClick={() => {
                        const next = [...(stage.orderingItems ?? [])];
                        [next[i], next[i + 1]] = [next[i + 1], next[i]];
                        onChange({ orderingItems: next });
                      }}
                      variant="ghost" size="icon"
                      colorClassName="text-slate-500 hover:text-indigo-400 focus-visible:ring-indigo-400"
                      className="shrink-0"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      aria-label={`Отстрани ставка ${i + 1}`}
                      onClick={() => onChange({ orderingItems: (stage.orderingItems ?? []).filter((_, j) => j !== i) })}
                      variant="ghost" size="icon"
                      colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  disabled={(stage.orderingItems ?? []).length >= MAX_ORDERING_ITEMS}
                  onClick={() => {
                    const item: OrderingItem = { id: uid(), text: '' };
                    onChange({ orderingItems: [...(stage.orderingItems ?? []), item] });
                  }}
                  variant="ghost" size="sm"
                  colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Додај ставка
                </Button>
              </div>
            </Field>
          )}

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
                    <Button
                      type="button"
                      aria-label={`Отстрани опција ${i + 1}`}
                      onClick={() => {
                        const opts = (stage.options ?? ['']).filter((_, j) => j !== i);
                        onChange({ options: opts });
                      }}
                      variant="ghost" size="icon"
                      colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  disabled={(stage.options ?? []).length >= MAX_QUIZ_OPTIONS}
                  onClick={() => onChange({ options: [...(stage.options ?? []), ''] })}
                  variant="ghost" size="sm"
                  colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Додај опција
                </Button>
              </div>
            </Field>
          )}

          {stage.questionType !== 'matching' && stage.questionType !== 'ordering' && (
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
          )}

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
              aria-label="Временски лимит во секунди"
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
