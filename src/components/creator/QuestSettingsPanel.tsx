import { useState } from 'react';
import type { Quest, QuestCategory } from '../../types';
import { QUEST_CATEGORY_LABELS } from '../../types';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './stages/shared';

interface Props {
  quest: Quest;
  onChange: <K extends keyof Quest>(key: K, value: Quest[K]) => void;
}

const TABS = ['Профил', 'Карактеристики', 'Мапи', 'Опасна зона'];

export function QuestSettingsPanel({ quest, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-zа-шѓ0-9-_]/gi, '');
    if (!t) return;
    const tags = quest.tags ?? [];
    if (tags.length >= 10 || tags.includes(t)) { setTagInput(''); return; }
    onChange('tags', [...tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => onChange('tags', (quest.tags ?? []).filter(x => x !== t));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700">
        <p className="text-sm font-bold text-slate-200">Поставки на Квестот</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Tab 0: Profile */}
          {tab === 0 && (
            <>
              <Field label="Наслов">
                <input type="text" className={inputCls} placeholder="Наслов на квестот..."
                  value={quest.title} maxLength={200}
                  onChange={e => onChange('title', e.target.value)} />
              </Field>
              <Field label="Опис">
                <textarea className={textareaCls} rows={3} placeholder="Кратко опишете ја авантурата..."
                  value={quest.description} maxLength={2000}
                  onChange={e => onChange('description', e.target.value)} />
              </Field>
              <Field label="Категорија">
                <select className={inputCls} value={quest.category ?? 'other'}
                  onChange={e => onChange('category', e.target.value as QuestCategory)}>
                  {(Object.keys(QUEST_CATEGORY_LABELS) as QuestCategory[]).map(cat => (
                    <option key={cat} value={cat}>{QUEST_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Тагови" hint="Максимум 10 тагови, притисни Enter за додавање">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" className={inputCls} placeholder="npr. скопје, историја..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                    <button type="button" onClick={addTag}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition-colors shrink-0">
                      +
                    </button>
                  </div>
                  {(quest.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(quest.tags ?? []).map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                          #{t}
                          <button type="button" onClick={() => removeTag(t)}
                            className="hover:text-white leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Проценето траење (минути)">
                <input type="number" className={inputCls} min={1} max={480}
                  value={quest.playingTimeMinutes ?? ''}
                  placeholder="npr. 45"
                  onChange={e => onChange('playingTimeMinutes', Number(e.target.value) || undefined)} />
              </Field>
            </>
          )}

          {/* Tab 1: Characteristics */}
          {tab === 1 && (
            <>
              <Field label="Режим на играње">
                <select className={inputCls} value={quest.playMode}
                  onChange={e => onChange('playMode', e.target.value as Quest['playMode'])}>
                  <option value="singleplayer">Еден играч</option>
                  <option value="multiplayer">Повеќе играчи (тимски)</option>
                </select>
              </Field>
              <Field label="Видливост">
                <select className={inputCls} value={quest.visibility}
                  onChange={e => onChange('visibility', e.target.value as Quest['visibility'])}>
                  <option value="public">Јавна — видлива за сите</option>
                  <option value="secret">Тајна — само со линк</option>
                </select>
              </Field>
              <Field label="Редослед на етапи">
                <select className={inputCls} value={quest.sequence}
                  onChange={e => onChange('sequence', e.target.value as Quest['sequence'])}>
                  <option value="fixed">Фиксен (линеарен)</option>
                  <option value="selectable">Избор од играч</option>
                  <option value="random">Случаен редослед</option>
                </select>
              </Field>
              <Toggle label="Јавни резултати"
                hint="Играчите можат да ги гледаат резултатите после завршување"
                checked={quest.publicResults ?? false}
                onChange={v => onChange('publicResults', v)} />
              <Toggle label="Вовед (Intro)"
                hint="Прва етапа е посебен вовед (не брои во редослед)"
                checked={quest.hasIntro ?? false}
                onChange={v => onChange('hasIntro', v)} />
              <Toggle label="Завршница (Outro)"
                hint="Последна етапа е посебна завршница"
                checked={quest.hasOutro ?? false}
                onChange={v => onChange('hasOutro', v)} />
            </>
          )}

          {/* Tab 2: Maps */}
          {tab === 2 && (
            <>
              <Field label="Стил на мара">
                <select className={inputCls} value={quest.mapStyle ?? 'standard'}
                  onChange={e => onChange('mapStyle', e.target.value)}>
                  <option value="standard">Стандардна</option>
                  <option value="satellite">Сателитска</option>
                  <option value="terrain">Теренска</option>
                </select>
              </Field>
              <Field label="Должина на рутата (km)" hint="Рачно или auto-пресметано">
                <input type="number" className={inputCls} min={0} step={0.1}
                  value={quest.boundLengthKm ?? ''}
                  placeholder="npr. 2.5"
                  onChange={e => onChange('boundLengthKm', Number(e.target.value) || undefined)} />
              </Field>
            </>
          )}

          {/* Tab 3: Danger zone */}
          {tab === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Опасна зона</p>
              <div className="p-4 border border-red-500/20 rounded-xl space-y-3">
                <button type="button"
                  className="w-full text-left px-4 py-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-400 text-sm font-medium transition-colors border border-red-500/20">
                  🗑 Избриши квест
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
