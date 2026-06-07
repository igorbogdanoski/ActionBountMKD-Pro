import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Play, Edit2, Trash2, Heart, Cloud, CloudOff, MapPin, Loader2, Radio, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getQuests, deleteQuest, cacheQuestResources } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { PlanUsageWidget } from './PlanUsageWidget';
import { GenerateQuestModal } from '../ai/GenerateQuestModal';
import { EDUCATION_SUBJECTS, EDUCATION_GRADES, questMatchesPedagogy } from 'shared';
import type { Quest, EducationSubject, EducationGrade } from 'shared';

interface BoundsDashboardProps {
  onCreateNew: () => void;
}

type FilterStatus = 'all' | 'public' | 'secret';

export function BoundsDashboard({ onCreateNew }: BoundsDashboardProps) {
  const { user } = useAuth();
  const { limits, isPro, can } = usePlan();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);

  const [quests, setQuests]               = useState<Quest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('all');
  const [filterSubject, setFilterSubject] = useState<EducationSubject | ''>('');
  const [filterGrade, setFilterGrade]     = useState<EducationGrade | ''>('');
  const [favorites, setFavorites]         = useState<Set<string>>(new Set());
  const [downloaded, setDownloaded]       = useState<Set<string>>(new Set());

  // Load persisted favourites/downloads from localStorage
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('ak_favs') ?? '[]') as string[];
      const dls  = JSON.parse(localStorage.getItem('ak_dls')  ?? '[]') as string[];
      setFavorites(new Set(favs));
      setDownloaded(new Set(dls));
    } catch { /* ignore */ }
  }, []);

  const loadQuests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getQuests(user.uid);
      setQuests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuests(); }, [user]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quests.filter(quest => {
      const matchSearch = !q || quest.title.toLowerCase().includes(q) || quest.description.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || quest.visibility === filterStatus;
      const matchPedagogy = questMatchesPedagogy(quest, { subject: filterSubject, grade: filterGrade });
      return matchSearch && matchStatus && matchPedagogy;
    });
  }, [quests, search, filterStatus, filterSubject, filterGrade]);

  const atLimit = limits.maxQuests !== -1 && quests.length >= limits.maxQuests;

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('ak_favs', JSON.stringify([...next]));
      return next;
    });
  };

  const toggleDownload = (quest: Quest, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloaded(prev => {
      const next = new Set(prev);
      if (next.has(quest.id)) {
        next.delete(quest.id);
      } else {
        next.add(quest.id);
        cacheQuestResources(quest).catch(() => {});
      }
      localStorage.setItem('ak_dls', JSON.stringify([...next]));
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    await deleteQuest(id);
    setQuests(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">

      {/* Plan usage */}
      <PlanUsageWidget questCount={quests.length} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.subtitle', { count: quests.length, max: limits.maxQuests === -1 ? '∞' : limits.maxQuests })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => can('canUseAI') ? setAiOpen(true) : navigate('/pricing')}
            title={can('canUseAI') ? 'Генерирај авантура со AI' : 'Достапно на Starter+ план'}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:from-fuchsia-400 hover:to-indigo-500 transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            AI Генерирај
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            disabled={atLimit}
            title={atLimit ? 'Го достигнавте лимитот на вашиот план' : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            {t('dashboard.newAdventure')}
          </button>
        </div>
      </div>

      <GenerateQuestModal open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            aria-label={t('dashboard.searchPlaceholder')}
            placeholder={t('dashboard.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <select
          aria-label="Филтрирај по видливост"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="py-2.5 px-4 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('dashboard.filterAll')}</option>
          <option value="public">{t('dashboard.filterPublic')}</option>
          <option value="secret">{t('dashboard.filterPrivate')}</option>
        </select>
        <select
          aria-label={t('dashboard.filterSubject')}
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value as EducationSubject | '')}
          className="py-2.5 px-4 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('dashboard.filterSubject')}</option>
          {EDUCATION_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          aria-label={t('dashboard.filterGrade')}
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value as EducationGrade | '')}
          className="py-2.5 px-4 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('dashboard.filterGrade')}</option>
          {EDUCATION_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
            <MapPin className="w-10 h-10 text-indigo-400" />
          </div>
          {quests.length === 0 ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {t('dashboard.emptyTitle')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
                {t('dashboard.emptyDesc')}
              </p>
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus className="h-5 w-5" />
                {t('dashboard.createFirst')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {t('dashboard.emptySearch', { query: search })}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {t('dashboard.emptySearchDesc')}
              </p>
            </>
          )}
        </div>
      )}

      {/* Quest grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(quest => (
            <article
              key={quest.id}
              className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                favorites.has(quest.id)
                  ? 'border-rose-400/50 dark:border-rose-500/40'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Cover */}
              <div className="aspect-video w-full relative bg-gradient-to-br from-indigo-900 to-slate-900 overflow-hidden">
                {quest.coverImage && (
                  <img
                    src={quest.coverImage}
                    alt={quest.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Visibility badge */}
                <div className="absolute top-3 left-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full backdrop-blur-sm ${
                    quest.visibility === 'public'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  }`}>
                    {quest.visibility === 'public' ? t('dashboard.public') : t('dashboard.private')}
                  </span>
                </div>

                {/* Action buttons top-right */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <button
                    type="button"
                    aria-label={downloaded.has(quest.id) ? 'Офлајн зачувано' : 'Зачувај офлајн'}
                    onClick={e => toggleDownload(quest, e)}
                    className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                      downloaded.has(quest.id)
                        ? 'bg-emerald-500/80 text-white'
                        : 'bg-black/30 text-white/70 hover:text-white'
                    }`}
                  >
                    {downloaded.has(quest.id) ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label={favorites.has(quest.id) ? 'Отстрани од омилени' : 'Додај во омилени'}
                    onClick={e => toggleFavorite(quest.id, e)}
                    className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                      favorites.has(quest.id)
                        ? 'bg-rose-500/80 text-white'
                        : 'bg-black/30 text-white/70 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites.has(quest.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-white font-bold text-lg leading-tight line-clamp-1">{quest.title}</h2>
                  <p className="text-white/70 text-sm line-clamp-1 mt-0.5">{quest.description}</p>
                </div>
              </div>

              {/* Pedagogy badges */}
              {(quest.pedagogy?.subject || quest.pedagogy?.grade) && (
                <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                  {quest.pedagogy?.subject && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/40">
                      {quest.pedagogy.subject}
                    </span>
                  )}
                  {quest.pedagogy?.grade && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
                      {quest.pedagogy.grade}
                    </span>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="px-4 py-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                <span><strong className="text-slate-700 dark:text-slate-200">{quest.stages?.length ?? 0}</strong> {t('common.stages').toLowerCase()}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(quest.updatedAt).toLocaleDateString('mk-MK')}
                </span>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.open(`/play/${quest.id}`, '_blank')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-sm font-semibold transition-colors"
                >
                  <Play className="h-4 w-4" /> {t('dashboard.play')}
                </button>
                <button
                  type="button"
                  aria-label="Игра во живо"
                  title={isPro ? 'Започни игра во живо' : 'Достапно на Pro план'}
                  onClick={() => navigate(isPro ? `/host/${quest.id}` : '/pricing')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-sm font-semibold transition-colors"
                >
                  <Radio className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/creator/${quest.id}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
                >
                  <Edit2 className="h-4 w-4" /> {t('dashboard.quickEdit')}
                </button>
                <button
                  type="button"
                  aria-label="Избриши авантура"
                  onClick={() => handleDelete(quest.id)}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

    </div>
  );
}

