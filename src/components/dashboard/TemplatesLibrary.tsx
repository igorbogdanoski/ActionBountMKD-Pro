import { useState, useEffect } from 'react';
import { Search, BookOpen, Star, Heart, Play, Lock, Loader2, GitBranch, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { getPublicTemplates, incrementTemplateUsage, saveTemplate } from '../../utils/storage';
import type { Template, TemplateSubject, Quest } from '../../types';

const SUBJECTS: TemplateSubject[] = [
  'Математика', 'Природни науки', 'Јазици', 'Историја', 'Физичко', 'Уметност', 'Останато',
];

const DIFFICULTY_COLORS = {
  'лесно':  'bg-emerald-500/10 text-emerald-400',
  'средно': 'bg-amber-500/10 text-amber-400',
  'тешко':  'bg-rose-500/10 text-rose-400',
};

interface Props {
  onUseTemplate: (template: { title: string; description: string; stages: Template['stages'] }) => void;
}

function TemplateCard({
  template,
  isFavorite,
  onFavorite,
  onUse,
  canUse,
}: {
  template: Template;
  isFavorite: boolean;
  onFavorite: (e: React.MouseEvent) => void;
  onUse: () => void;
  canUse: boolean;
}) {
  const hasSwitch = template.stages.some(s => s.type === 'SWITCH');
  return (
    <div className="rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all flex flex-col overflow-hidden group">
      {/* Header strip */}
      <div className="px-5 pt-5 pb-4 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
              {template.subject}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {template.grade}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[template.difficulty]}`}>
              {template.difficulty}
            </span>
            {template.isFeatured && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                ⭐ Избор на редакција
              </span>
            )}
            {template.isPro && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Pro
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onFavorite}
            aria-label={isFavorite ? 'Отстрани од омилени' : 'Додај во омилени'}
            className={`shrink-0 transition-colors ${isFavorite ? 'text-rose-400' : 'text-slate-600 hover:text-rose-400'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        <h3 className="font-bold text-slate-100 leading-snug">{template.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{template.description}</p>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{template.stageCount} етапи</span>
          <span>~{template.estimatedMinutes} мин</span>
          {hasSwitch && (
            <span className="flex items-center gap-1 text-violet-400">
              <GitBranch className="w-3 h-3" /> Условна логика
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span className="font-semibold text-slate-300">{template.rating.toFixed(1)}</span>
          <span>({template.ratingCount})</span>
          {template.usageCount > 0 && <span className="ml-2">{template.usageCount} употреби</span>}
        </div>

        <button
          type="button"
          onClick={onUse}
          disabled={!canUse}
          title={!canUse ? 'Потребен Pro план' : undefined}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
            canUse
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canUse ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          Користи
        </button>
      </div>
    </div>
  );
}

export function TemplatesLibrary({ onUseTemplate }: Props) {
  const { user } = useAuth();
  const { planId } = usePlan();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('Сите');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [submitMode, setSubmitMode] = useState(false);
  const [submitQuest, setSubmitQuest] = useState<Quest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    subject: 'Математика' as TemplateSubject,
    grade: '',
    difficulty: 'средно' as Template['difficulty'],
    estimatedMinutes: 30,
    tags: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('actionbound_fav_templates');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    setLoading(true);
    getPublicTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('actionbound_fav_templates', JSON.stringify(next));
  };

  const handleUse = async (template: Template) => {
    await incrementTemplateUsage(template.id).catch(() => {});
    onUseTemplate({
      title: `(Копија) ${template.title}`,
      description: template.description,
      stages: template.stages,
    });
  };

  const canUseTemplate = (template: Template) =>
    !template.isPro || planId === 'pro' || planId === 'enterprise';

  const filtered = templates.filter(t => {
    if (selectedSubject === 'Омилени') return favorites.includes(t.id);
    if (selectedSubject !== 'Сите' && t.subject !== selectedSubject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSubmitTemplate = async () => {
    if (!submitQuest || !user) return;
    setSubmitting(true);
    try {
      const tpl: Template = {
        id: crypto.randomUUID(),
        title: submitQuest.title,
        subject: submitForm.subject,
        grade: submitForm.grade,
        description: submitQuest.description,
        stages: submitQuest.stages,
        stageCount: submitQuest.stages.length,
        rating: 0,
        ratingCount: 0,
        authorId: user.uid,
        authorName: user.displayName ?? user.email ?? 'Наставник',
        status: 'pending',
        isPublic: false,
        isFeatured: false,
        isPro: false,
        difficulty: submitForm.difficulty,
        estimatedMinutes: submitForm.estimatedMinutes,
        playMode: submitQuest.playMode,
        tags: submitForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTemplate(tpl);
      setSubmitDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-6xl w-full p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Библиотека со шаблони
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Откријте готови авантури по предмет и одделение. Копирајте и прилагодете во секунда.
          </p>
        </div>

        {(planId === 'pro' || planId === 'enterprise') && (
          <button
            type="button"
            onClick={() => setSubmitMode(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shrink-0"
          >
            <Upload className="w-4 h-4" />
            Предложи шаблон
          </button>
        )}
      </div>

      {/* Submit form (Pro+) */}
      {submitMode && (planId === 'pro' || planId === 'enterprise') && (
        <div className="rounded-2xl bg-slate-800 border border-indigo-500/30 p-6 space-y-4">
          <h3 className="font-bold text-slate-100">Предложи свој шаблон</h3>
          {submitDone ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Шаблонот е поднесен и чека одобрување. Благодарам!</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">Прво избери еден од твоите квестови, потоа пополни ги деталите.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Предмет</label>
                  <select
                    title="Предмет"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={submitForm.subject}
                    onChange={e => setSubmitForm(f => ({ ...f, subject: e.target.value as TemplateSubject }))}
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Одделение</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="на пр. 8 одд. или 7-9 одд."
                    value={submitForm.grade}
                    onChange={e => setSubmitForm(f => ({ ...f, grade: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Тежина</label>
                  <select
                    title="Тежина"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={submitForm.difficulty}
                    onChange={e => setSubmitForm(f => ({ ...f, difficulty: e.target.value as Template['difficulty'] }))}
                  >
                    <option value="лесно">Лесно</option>
                    <option value="средно">Средно</option>
                    <option value="тешко">Тешко</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Времетраење (мин)</label>
                  <input
                    type="number"
                    title="Времетраење во минути"
                    placeholder="30"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={submitForm.estimatedMinutes}
                    onChange={e => setSubmitForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Тагови (одделени со запирка)</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="GPS, теренска настава, тимска работа"
                  value={submitForm.tags}
                  onChange={e => setSubmitForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
              <p className="text-xs text-slate-500">
                Потребен е квест од твојот профил — пасте го ID-то или изберете директно (функционалност наскоро).
              </p>
              <button
                type="button"
                onClick={handleSubmitTemplate}
                disabled={submitting || !submitForm.grade}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Поднеси за одобрување
              </button>
            </>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Пребарај шаблони..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {['Сите', 'Омилени', ...SUBJECTS].map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedSubject(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSubject === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Вчитување шаблони...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <BookOpen className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 text-sm">
            {searchQuery ? 'Нема резултати за пребарувањето.' : 'Нема шаблони во оваа категорија.'}
          </p>
          {templates.length === 0 && !searchQuery && (
            <p className="text-slate-500 text-xs max-w-xs">
              Администраторот сè уште не додал шаблони. Наскоро ќе бидат достапни!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isFavorite={favorites.includes(template.id)}
              onFavorite={e => toggleFavorite(template.id, e)}
              onUse={() => handleUse(template)}
              canUse={canUseTemplate(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
