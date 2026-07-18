import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Rubric, RubricCriterion, RubricLevel } from 'shared';
import { MAX_RUBRIC_CRITERIA, MAX_RUBRIC_LEVELS, MAX_FEEDBACK_PRESETS, rubricMaxPoints } from 'shared';
import { Field, inputCls } from './shared';
import { Button } from '../../ui/Button';

interface Props {
  rubric?: Rubric;
  onChange: (rubric: Rubric | undefined) => void;
}

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

const defaultLevels = (): RubricLevel[] => [
  { id: uid(), label: 'Одлично', points: 4 },
  { id: uid(), label: 'Делумно', points: 2 },
  { id: uid(), label: 'Недоволно', points: 0 },
];

export function RubricEditor({ rubric, onChange }: Props) {
  const [presetInput, setPresetInput] = useState('');
  const criteria = rubric?.criteria ?? [];
  const presets = rubric?.feedbackPresets ?? [];

  const commit = (nextCriteria: RubricCriterion[], nextPresets: string[]) => {
    if (nextCriteria.length === 0 && nextPresets.length === 0) {
      onChange(undefined);
      return;
    }
    const next: Rubric = { criteria: nextCriteria };
    if (nextPresets.length) next.feedbackPresets = nextPresets;
    onChange(next);
  };

  const addCriterion = () => {
    if (criteria.length >= MAX_RUBRIC_CRITERIA) return;
    commit([...criteria, { id: uid(), title: '', levels: defaultLevels() }], presets);
  };
  const updateCriterion = (id: string, patch: Partial<RubricCriterion>) =>
    commit(criteria.map(c => (c.id === id ? { ...c, ...patch } : c)), presets);
  const removeCriterion = (id: string) =>
    commit(criteria.filter(c => c.id !== id), presets);

  const addLevel = (cId: string) => {
    const c = criteria.find(x => x.id === cId);
    if (!c || c.levels.length >= MAX_RUBRIC_LEVELS) return;
    updateCriterion(cId, { levels: [...c.levels, { id: uid(), label: '', points: 0 }] });
  };
  const updateLevel = (cId: string, lId: string, patch: Partial<RubricLevel>) => {
    const c = criteria.find(x => x.id === cId);
    if (!c) return;
    updateCriterion(cId, { levels: c.levels.map(l => (l.id === lId ? { ...l, ...patch } : l)) });
  };
  const removeLevel = (cId: string, lId: string) => {
    const c = criteria.find(x => x.id === cId);
    if (!c || c.levels.length <= 1) return;
    updateCriterion(cId, { levels: c.levels.filter(l => l.id !== lId) });
  };

  const addPreset = () => {
    const p = presetInput.trim().slice(0, 200);
    if (!p || presets.length >= MAX_FEEDBACK_PRESETS || presets.includes(p)) { setPresetInput(''); return; }
    commit(criteria, [...presets, p]);
    setPresetInput('');
  };
  const removePreset = (p: string) => commit(criteria, presets.filter(x => x !== p));

  const maxPoints = rubricMaxPoints(rubric);
  const normalizedPreset = presetInput.trim().slice(0, 200);
  const canAddPreset = Boolean(normalizedPreset)
    && presets.length < MAX_FEEDBACK_PRESETS
    && !presets.includes(normalizedPreset);

  return (
    <Field
      label="Рубрика за оценување"
      hint="Дефинирајте критериуми и нивоа за рачно оценување на овој одговор. Опционално."
    >
      <div className="space-y-3">
        {criteria.length === 0 ? (
          <p className="text-xs text-slate-500">Сè уште нема критериуми.</p>
        ) : (
          <div className="space-y-3">
            {criteria.map((c, ci) => (
              <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 shrink-0">{ci + 1}.</span>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Критериум, напр. Точност"
                    value={c.title}
                    maxLength={120}
                    onChange={e => updateCriterion(c.id, { title: e.target.value })}
                  />
                  <Button
                    type="button"
                    aria-label={`Отстрани критериум ${ci + 1}`}
                    onClick={() => removeCriterion(c.id)}
                    variant="ghost" size="icon"
                    colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                    className="shrink-0 p-1.5"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-1.5 pl-5">
                  {c.levels.map((l, li) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        className={inputCls}
                        placeholder="Ниво, напр. Одлично"
                        value={l.label}
                        maxLength={80}
                        onChange={e => updateLevel(c.id, l.id, { label: e.target.value })}
                      />
                      <input
                        type="number"
                        className={`${inputCls} w-20 shrink-0`}
                        min={0}
                        max={1000}
                        value={l.points}
                        title="Поени"
                        onChange={e => updateLevel(c.id, l.id, {
                          points: Math.min(1000, Math.max(0, Number(e.target.value) || 0)),
                        })}
                      />
                      {c.levels.length > 1 && (
                        <Button
                          type="button"
                          aria-label={`Отстрани ниво ${li + 1} од критериум ${ci + 1}`}
                          onClick={() => removeLevel(c.id, l.id)}
                          variant="ghost" size="icon"
                          colorClassName="text-slate-500 hover:text-rose-400 focus-visible:ring-rose-400"
                          className="shrink-0 p-1"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {c.levels.length < MAX_RUBRIC_LEVELS && (
                    <Button
                      type="button"
                      onClick={() => addLevel(c.id)}
                      variant="ghost" size="sm"
                      colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
                      leftIcon={<Plus className="h-3 w-3" aria-hidden="true" />}
                    >
                      Додај ниво
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {criteria.length < MAX_RUBRIC_CRITERIA && (
          <Button
            type="button"
            onClick={addCriterion}
            variant="ghost" size="sm"
            colorClassName="text-indigo-400 hover:text-indigo-300 focus-visible:ring-indigo-400"
            leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Додај критериум
          </Button>
        )}

        {maxPoints > 0 && (
          <p className="text-xs text-slate-400">
            Максимален резултат од рубрика: <span className="font-bold text-slate-200">{maxPoints}</span> поени
          </p>
        )}

        {/* Directed feedback presets */}
        <div className="pt-1 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Брзи коментари (насочена повратна информација)</p>
          <div className="flex gap-2">
            <input
              type="text"
              className={inputCls}
              placeholder="напр. Одлично образложение!"
              value={presetInput}
              maxLength={200}
              onChange={e => setPresetInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPreset(); } }}
            />
            <Button
              type="button"
              onClick={addPreset}
              disabled={!canAddPreset}
              aria-label="Додај брз коментар"
              variant="app-primary" size="icon" className="shrink-0"
            >
              +
            </Button>
          </div>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/60 text-slate-200 text-xs rounded-full">
                  {p}
                  <Button type="button" onClick={() => removePreset(p)} variant="ghost" size="icon"
                    aria-label={`Отстрани брз коментар: ${p}`}
                    colorClassName="text-slate-300 hover:text-rose-400 focus-visible:ring-rose-400"
                    className="h-5 w-5 p-0 leading-none">×</Button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Field>
  );
}
