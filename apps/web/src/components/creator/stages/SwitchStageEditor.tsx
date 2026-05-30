import { useState } from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { Tabs, Field, Toggle, inputCls } from './shared';
import type { SwitchStage, SwitchCondition, Stage } from 'shared';

interface Props {
  stage: SwitchStage;
  allStages: Stage[];
  onChange: (updates: Partial<SwitchStage>) => void;
}

function makeConditionId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}

export function SwitchStageEditor({ stage, allStages, onChange }: Props) {
  const [tab, setTab] = useState(0);

  const otherStages = allStages.filter(s => s.id !== stage.id);

  const updateCondition = (id: string, updates: Partial<SwitchCondition>) => {
    onChange({
      conditions: stage.conditions.map(c => c.id === id ? { ...c, ...updates } : c),
    });
  };

  const addCondition = () => {
    onChange({
      conditions: [
        ...stage.conditions,
        { id: makeConditionId(), label: '', targetStageId: '' },
      ],
    });
  };

  const removeCondition = (id: string) => {
    onChange({ conditions: stage.conditions.filter(c => c.id !== id) });
  };

  return (
    <div className="space-y-5">
      <Tabs tabs={['Услови', 'Поставки']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3">
            <GitBranch className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-300 leading-relaxed">
              Оваа етапа го насочува играчот кон различна следна станица врз основа на освоени поени или завршени етапи. Се проверуваат условите по ред — прв кој се совпаѓа го добива играчот.
            </p>
          </div>

          <Field label="Опис (опционално)">
            <input
              className={inputCls}
              placeholder="На пример: Избери го патот според поените..."
              value={stage.description}
              onChange={e => onChange({ description: e.target.value })}
            />
          </Field>

          <div className="space-y-3">
            {stage.conditions.map((cond, idx) => (
              <div key={cond.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Услов {idx + 1}
                  </span>
                  {stage.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(cond.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Field label="Опис на условот">
                  <input
                    className={inputCls}
                    placeholder="На пример: Ако имаш повеќе од 50 поени"
                    value={cond.label}
                    onChange={e => updateCondition(cond.id, { label: e.target.value })}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Мин. поени" hint="Остави празно ако не е важно">
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="0"
                      value={cond.minPoints ?? ''}
                      onChange={e => updateCondition(cond.id, {
                        minPoints: e.target.value === '' ? undefined : Number(e.target.value),
                      })}
                    />
                  </Field>
                  <Field label="Макс. поени" hint="Остави празно ако не е важно">
                    <input
                      type="number"
                      className={inputCls}
                      placeholder="∞"
                      value={cond.maxPoints ?? ''}
                      onChange={e => updateCondition(cond.id, {
                        maxPoints: e.target.value === '' ? undefined : Number(e.target.value),
                      })}
                    />
                  </Field>
                </div>

                <Field label="Оди на етапа">
                  <select
                    className={inputCls}
                    value={cond.targetStageId}
                    onChange={e => updateCondition(cond.id, { targetStageId: e.target.value })}
                  >
                    <option value="">— Избери етапа —</option>
                    {otherStages.map(s => (
                      <option key={s.id} value={s.id}>
                        Етапа {s.order + 1}{s.title ? ` – ${s.title}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ))}

            <button
              type="button"
              onClick={addCondition}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Додај услов
            </button>
          </div>

          <Field label="Стандардна етапа (ако ниеден услов не се совпадне)">
            <select
              className={inputCls}
              value={stage.defaultTargetStageId ?? ''}
              onChange={e => onChange({ defaultTargetStageId: e.target.value || undefined })}
            >
              <option value="">— Следна по ред —</option>
              {otherStages.map(s => (
                <option key={s.id} value={s.id}>
                  Етапа {s.order + 1}{s.title ? ` – ${s.title}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          <Toggle
            label="Покажи ги патиштата на играчот"
            hint="Ако е вклучено, играчот ги гледа условите и сам бира. Ако е исклучено, апликацијата автоматски го насочува."
            checked={stage.showPathsToPlayer}
            onChange={v => onChange({ showPathsToPlayer: v })}
          />
        </div>
      )}
    </div>
  );
}

