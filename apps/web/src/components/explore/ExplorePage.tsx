import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Clock, Layers, ChevronRight, Compass } from 'lucide-react';
import { getPublicQuests } from '../../utils/storage';
import { EDUCATION_SUBJECTS, EDUCATION_GRADES, type EducationSubject, type EducationGrade } from 'shared';
import type { Quest } from 'shared';
import { SEO, BreadcrumbSchema } from '../SEO';
import { Footer } from '../layout/Footer';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://avantura.mismath.net';

const CATEGORY_LABELS: Record<string, string> = {
  educational: 'Едукативна',
  cultural: 'Културна',
  teambuilding: 'Тимбилдинг',
  tourism: 'Туризам',
  personal: 'Лична',
  other: 'Друго',
};

function QuestCard({ quest }: { quest: Quest }) {
  const navigate = useNavigate();
  const subject = quest.pedagogy?.subject;
  const grade = quest.pedagogy?.grade;

  return (
    <article
      onClick={() => navigate(`/play/${quest.id}`)}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md hover:shadow-brand-100 transition-all cursor-pointer flex flex-col overflow-hidden"
      itemScope
      itemType="https://schema.org/Game"
    >
      {/* Cover / placeholder */}
      <div className="h-32 bg-gradient-to-br from-brand-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
        {quest.coverImage
          ? <img src={quest.coverImage} alt={quest.title} className="w-full h-full object-cover" itemProp="image" />
          : <Compass className="w-12 h-12 text-brand-300" />}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors" itemProp="name">
          {quest.title}
        </h3>

        {quest.description && (
          <p className="text-xs text-slate-500 line-clamp-2 flex-1" itemProp="description">
            {quest.description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {subject && (
            <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
              {subject}
            </span>
          )}
          {grade && grade !== 'Сите' && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {grade}
            </span>
          )}
          {quest.category && CATEGORY_LABELS[quest.category] && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[quest.category]}
            </span>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Layers size={11} /> {quest.stages?.length ?? 0} задачи
          </span>
          {quest.playingTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> ~{quest.playingTimeMinutes} мин
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto text-brand-500 font-medium group-hover:gap-1.5 transition-all">
            Играј <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function ExplorePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState<EducationSubject | ''>('');
  const [grade, setGrade] = useState<EducationGrade | ''>('');

  useEffect(() => {
    getPublicQuests(60)
      .then(setQuests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quests.filter(quest => {
      if (q && !quest.title.toLowerCase().includes(q) && !quest.description?.toLowerCase().includes(q)) return false;
      if (subject && quest.pedagogy?.subject !== subject) return false;
      if (grade && grade !== 'Сите' && quest.pedagogy?.grade !== grade && quest.pedagogy?.grade !== 'Сите') return false;
      return true;
    });
  }, [quests, search, subject, grade]);

  const pageTitle = 'Јавни Авантури — Авантура МКД';
  const pageDesc = 'Истражи бесплатни едукативни GPS авантури создадени од македонски наставници. Филтрирај по предмет и одделение.';
  const pageUrl = `${APP_URL}/explore`;

  return (
    <>
      <SEO
        title="Јавни Авантури"
        description={pageDesc}
        url="/explore"
      />
      <BreadcrumbSchema items={[
        { name: 'Авантура МКД', url: '/' },
        { name: 'Јавни Авантури', url: '/explore' },
      ]} />

      <div className="min-h-screen bg-[#e8eedd] flex flex-col">
        {/* Header */}
        <header className="bg-[#2a2522] text-white px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:text-brand-400 transition-colors">
            <span>🗺️</span> Авантура МКД
          </Link>
          <Link
            to="/"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            ← Главна
          </Link>
        </header>

        {/* Hero */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="text-brand-500" size={24} />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Јавни Авантури
              </h1>
            </div>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl">
              Истражи GPS авантури создадени од македонски наставници. Отвори ја и играј директно во прелистувачот.
            </p>

            {/* Filters */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Пребарај авантури..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value as EducationSubject | '')}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-slate-700"
              >
                <option value="">Сите предмети</option>
                {EDUCATION_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value as EducationGrade | '')}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-slate-700"
              >
                <option value="">Сите одделенија</option>
                {EDUCATION_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Compass className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="font-medium">Нема пронајдени авантури.</p>
              {(search || subject || grade) && (
                <button
                  onClick={() => { setSearch(''); setSubject(''); setGrade(''); }}
                  className="mt-2 text-brand-600 text-sm hover:underline"
                >
                  Исчисти филтри
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4">
                {filtered.length} {filtered.length === 1 ? 'авантура' : 'авантури'} пронајдени
              </p>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                itemScope
                itemType="https://schema.org/ItemList"
              >
                {filtered.map((q, i) => (
                  <div key={q.id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <meta itemProp="position" content={String(i + 1)} />
                    <meta itemProp="url" content={`${APP_URL}/play/${q.id}`} />
                    <QuestCard quest={q} />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
