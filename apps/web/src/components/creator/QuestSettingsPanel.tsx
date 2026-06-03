import { useState } from 'react';
import type { Quest, QuestCategory, QuestPedagogy, EducationSubject, EducationGrade } from 'shared';
import { QUEST_CATEGORY_LABELS, EDUCATION_SUBJECTS, EDUCATION_GRADES, MAX_LEARNING_GOALS, MAX_LEARNING_GOAL_LENGTH } from 'shared';
import { Tabs, Field, Toggle, inputCls, textareaCls } from './stages/shared';
import { ImageUploader } from '../upload/ImageUploader';
import { TrackUploader } from '../upload/TrackUploader';
import { usePlan } from '../../hooks/usePlan';
import { Lock } from 'lucide-react';

interface Props {
  quest: Quest;
  onChange: <K extends keyof Quest>(key: K, value: Quest[K]) => void;
}

const TABS = ['Профил', 'Педагогија', 'Карактеристики', 'Мапи', 'Опасна зона'];

export function QuestSettingsPanel({ quest, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [inventoryName, setInventoryName] = useState('');
  const [inventoryIcon, setInventoryIcon] = useState('');
  const [inventoryMediaUrl, setInventoryMediaUrl] = useState('');
  const { planId } = usePlan();
  const canLeaderboard = planId === 'pro' || planId === 'enterprise';
  const cleanCertificate = planId !== 'free';

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-zа-шѓ0-9-_]/gi, '');
    if (!t) return;
    const tags = quest.tags ?? [];
    if (tags.length >= 10 || tags.includes(t)) { setTagInput(''); return; }
    onChange('tags', [...tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => onChange('tags', (quest.tags ?? []).filter(x => x !== t));

  const pedagogy = quest.pedagogy ?? {};
  const updatePedagogy = (patch: Partial<QuestPedagogy>) => {
    const next: QuestPedagogy = { ...pedagogy, ...patch };
    (Object.keys(next) as (keyof QuestPedagogy)[]).forEach(k => {
      const v = next[k];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[k];
    });
    onChange('pedagogy', Object.keys(next).length ? next : undefined);
  };
  const learningGoals = pedagogy.learningGoals ?? [];
  const addGoal = () => {
    const g = goalInput.trim().slice(0, MAX_LEARNING_GOAL_LENGTH);
    if (!g) return;
    if (learningGoals.length >= MAX_LEARNING_GOALS || learningGoals.includes(g)) { setGoalInput(''); return; }
    updatePedagogy({ learningGoals: [...learningGoals, g] });
    setGoalInput('');
  };
  const removeGoal = (g: string) => updatePedagogy({ learningGoals: learningGoals.filter(x => x !== g) });

  const addInventoryItem = () => {
    const name = inventoryName.trim();
    const icon = inventoryIcon.trim();
    if (!name) return;
    const id = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9а-шѓжчќљњѕј_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || `item-${Date.now()}`;
    const items = quest.inventoryItems ?? [];
    if (items.some(item => item.id === id)) return;
    onChange('inventoryItems', [...items, { id, name, icon: icon || undefined, mediaUrl: inventoryMediaUrl.trim() || undefined }]);
    setInventoryName('');
    setInventoryIcon('');
    setInventoryMediaUrl('');
  };
  const removeInventoryItem = (id: string) => onChange('inventoryItems', (quest.inventoryItems ?? []).filter(item => item.id !== id));

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
              <ImageUploader
                label="Насловна слика"
                folder="covers"
                value={quest.coverImage ?? ''}
                onChange={url => onChange('coverImage', url)}
                hint="Се прикажува на картичката и насловната страница на квестот"
              />
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
              <Field label="Инвентар" hint="Предмети што играчите ги собираат во текот на авантурата">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" className={inputCls} placeholder="Име на предмет"
                      value={inventoryName}
                      onChange={e => setInventoryName(e.target.value)} />
                    <input type="text" className={inputCls} placeholder="Икона, напр. 🗝️"
                      value={inventoryIcon}
                      onChange={e => setInventoryIcon(e.target.value)} />
                    <input type="url" className={inputCls} placeholder="Media URL (опц.)"
                      value={inventoryMediaUrl}
                      onChange={e => setInventoryMediaUrl(e.target.value)} />
                  </div>
                  <button type="button" onClick={addInventoryItem}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition-colors">
                    Додај предмет
                  </button>
                  {(quest.inventoryItems ?? []).length > 0 && (
                    <div className="space-y-2">
                      {(quest.inventoryItems ?? []).map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-200 truncate">{item.icon ? `${item.icon} ` : ''}{item.name}</div>
                            <div className="text-xs text-slate-500 truncate">{item.id}</div>
                          </div>
                          <button type="button" onClick={() => removeInventoryItem(item.id)} className="text-slate-500 hover:text-rose-400">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </>
          )}

          {/* Tab 1: Pedagogy */}
          {tab === 1 && (
            <>
              <p className="text-xs text-slate-400 -mb-1">
                Претворете ја авантурата во вистинска наставна единица — поврзете ја со предмет, одделение и цели на учење.
              </p>
              <Field label="Предмет">
                <select className={inputCls} value={pedagogy.subject ?? ''}
                  onChange={e => updatePedagogy({ subject: (e.target.value || undefined) as EducationSubject | undefined })}>
                  <option value="">— Изберете предмет —</option>
                  {EDUCATION_SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Одделение / ниво">
                <select className={inputCls} value={pedagogy.grade ?? ''}
                  onChange={e => updatePedagogy({ grade: (e.target.value || undefined) as EducationGrade | undefined })}>
                  <option value="">— Изберете ниво —</option>
                  {EDUCATION_GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Курикулумска ознака" hint="Тема или стандард од наставната програма, напр. „МАТ-6.3“">
                <input type="text" className={inputCls} placeholder="напр. МАТ-6.3 — Геометриски тела"
                  value={pedagogy.curriculumRef ?? ''} maxLength={120}
                  onChange={e => updatePedagogy({ curriculumRef: e.target.value || undefined })} />
              </Field>
              <Field label="Цели на учење" hint={`Што ќе научат учениците. Максимум ${MAX_LEARNING_GOALS}, притисни Enter за додавање`}>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" className={inputCls} placeholder="напр. Препознава историски обележја во градот..."
                      value={goalInput} maxLength={MAX_LEARNING_GOAL_LENGTH}
                      onChange={e => setGoalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }} />
                    <button type="button" onClick={addGoal}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-semibold transition-colors shrink-0">
                      +
                    </button>
                  </div>
                  {learningGoals.length > 0 && (
                    <ol className="space-y-1.5">
                      {learningGoals.map((g, i) => (
                        <li key={g} className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2">
                          <span className="text-xs font-bold text-indigo-400 mt-0.5 shrink-0">{i + 1}.</span>
                          <span className="text-sm text-slate-200 flex-1 min-w-0 break-words">{g}</span>
                          <button type="button" onClick={() => removeGoal(g)}
                            className="text-slate-500 hover:text-rose-400 leading-none shrink-0">×</button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </Field>
            </>
          )}

          {/* Tab 2: Characteristics */}
          {tab === 2 && (
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
              {canLeaderboard ? (
                <Toggle label="Јавна табела со резултати (Pro)"
                  hint="Активира јавна URL страница /leaderboard/:id — без логирање"
                  checked={quest.publicLeaderboard ?? false}
                  onChange={v => onChange('publicLeaderboard', v)} />
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700">
                  <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  Јавна табела со резултати — достапна со Pro план
                </div>
              )}
              <Toggle label="Сертификат за завршување"
                hint={cleanCertificate
                  ? 'Играчот добива чист брендиран PDF сертификат на крајот'
                  : 'Играчот добива PDF сертификат (со водено втиснат знак — отстранете го со Starter+ план)'}
                checked={quest.certificateEnabled ?? true}
                onChange={v => {
                  onChange('certificateEnabled', v);
                  if (v) onChange('certificateWatermark', !cleanCertificate);
                }} />
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

          {/* Tab 3: Maps */}
          {tab === 3 && (
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
              <TrackUploader
                points={quest.track}
                trackName={quest.trackName}
                hint="Качи GPX/KML рута — должината, стартот и целта се пресметуваат автоматски"
                onChange={result => {
                  if (result) {
                    onChange('track', result.points);
                    onChange('trackName', result.name);
                    onChange('boundLengthKm', result.lengthKm);
                    onChange('startCoordinates', result.points[0]);
                    onChange('destinationCoordinates', result.points[result.points.length - 1]);
                  } else {
                    onChange('track', undefined);
                    onChange('trackName', undefined);
                  }
                }}
              />
            </>
          )}

          {/* Tab 4: Danger zone */}
          {tab === 4 && (
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

