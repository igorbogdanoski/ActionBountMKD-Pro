import { useState, useEffect, useMemo } from 'react';
import { getQuests, getQuestResults } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { Quest, QuestResult } from 'shared';
import { computeStageCompletion, computeQuizAccuracy } from '../../utils/completion';
import { downloadWorkbook, type SheetData } from '../../utils/excelExport';
import { Trophy, Clock, User, Download, FileSpreadsheet, Filter, TrendingDown, AlertTriangle, Lock, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { SubmissionReviewModal } from './SubmissionReviewModal';

export function ResultsDashboard() {
  const { user } = useAuth();
  const { planId } = usePlan();
  const isPro = planId === 'pro' || planId === 'enterprise';
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortByStageId, setSortByStageId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'funnel' | 'weakspots' | 'grade'>('leaderboard');
  const [reviewing, setReviewing] = useState<{ result: QuestResult; stageId: string } | null>(null);

  // Cross-quest weak-spot data — loaded lazily (only once the tab is opened)
  // and cached per session, since it means fetching results for every quest
  // the teacher owns, not just the one currently selected.
  const [weakspotResults, setWeakspotResults] = useState<Record<string, QuestResult[]> | null>(null);
  const [weakspotsLoading, setWeakspotsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const data = await getQuests(user!.uid);
      setQuests(data);
      if (data.length > 0) {
        setSelectedQuestId(data[0].id);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    async function loadResults() {
      if (!selectedQuestId) return;
      setLoading(true);
      const data = await getQuestResults(selectedQuestId);
      setResults(data);
      setLoading(false);
      setSortByStageId(''); // reset sort when quest changes
    }
    loadResults();
  }, [selectedQuestId]);

  useEffect(() => {
    if (activeTab !== 'weakspots' || !isPro || weakspotResults !== null || quests.length === 0) return;
    setWeakspotsLoading(true);
    Promise.all(quests.map(q => getQuestResults(q.id).then(r => [q.id, r] as const)))
      .then(entries => setWeakspotResults(Object.fromEntries(entries)))
      .finally(() => setWeakspotsLoading(false));
  }, [activeTab, isPro, quests, weakspotResults]);

  // Ranked lists across every quest the teacher owns: the lowest-accuracy
  // QUIZ questions and the biggest per-stage drop-offs, each reusing the
  // exact same pure derivations the per-quest funnel tab already uses.
  const crossQuestWeakQuestions = useMemo(() => {
    if (!weakspotResults) return [];
    const MIN_ANSWERS = 3;
    return quests.flatMap(q => {
      const quizStages = (q.stages ?? []).filter((s: any) => s.type === 'QUIZ');
      if (quizStages.length === 0) return [];
      return computeQuizAccuracy(quizStages, weakspotResults[q.id] ?? [])
        .filter(s => s.answers >= MIN_ANSWERS && s.accuracy !== null)
        .map(s => ({ ...s, questId: q.id, questTitle: q.title }));
    }).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 10);
  }, [quests, weakspotResults]);

  const crossQuestDropOffs = useMemo(() => {
    if (!weakspotResults) return [];
    const MIN_DROP = 15;
    return quests.flatMap(q =>
      computeStageCompletion(q.stages ?? [], weakspotResults[q.id] ?? [])
        .filter(s => s.dropOff >= MIN_DROP)
        .map(s => ({ ...s, questId: q.id, questTitle: q.title }))
    ).sort((a, b) => b.dropOff - a.dropOff).slice(0, 10);
  }, [quests, weakspotResults]);

  const openQuestInFunnel = (questId: string) => {
    setSelectedQuestId(questId);
    setActiveTab('funnel');
  };

  const selectedQuest = quests.find(q => q.id === selectedQuestId);

  // Calculate average stage times
  const stageStats = useMemo(() => {
    if (!selectedQuest?.stages) return [];
    return selectedQuest.stages.map((stage, idx) => {
      let totalSec = 0;
      let count = 0;
      results.forEach(r => {
        const stageDuration = r.stageDurations?.find((sd: any) => sd.stageId === stage.id);
        if (stageDuration) {
          totalSec += stageDuration.durationSec;
          count++;
        }
      });
      return {
        id: stage.id,
        name: `Етапа ${idx + 1}`,
        title: stage.title,
        avgSec: count > 0 ? Math.round(totalSec / count) : 0,
        plays: count
      };
    });
  }, [selectedQuest, results]);

  const funnelStats = useMemo(() => {
    if (!stageStats.length) return [];
    const topPlays = stageStats[0]?.plays || 0;
    return stageStats.map((s, idx) => {
      const pct = topPlays > 0 ? Math.round((s.plays / topPlays) * 100) : 0;
      const prevPct = idx > 0 && topPlays > 0 ? Math.round((stageStats[idx - 1].plays / topPlays) * 100) : 100;
      const drop = prevPct - pct;
      return { ...s, pct, drop, bigDrop: drop >= 20 };
    });
  }, [stageStats]);

  const stageCompletion = useMemo(
    () => computeStageCompletion(selectedQuest?.stages ?? [], results),
    [selectedQuest, results],
  );

  // Rubric-graded MISSION/SURVEY submissions, newest-first, ungraded first.
  const gradeQueue = useMemo(() => {
    const gradableStages = (selectedQuest?.stages ?? []).filter(
      (s: any) => (s.type === 'MISSION' || s.type === 'SURVEY') && s.rubric?.criteria?.length,
    );
    if (gradableStages.length === 0) return [];
    const items: { result: QuestResult; stage: any; graded: boolean }[] = [];
    for (const r of results as QuestResult[]) {
      for (const stage of gradableStages) {
        const submission = r.submissions?.find(s => s.stageId === stage.id);
        if (!submission) continue;
        const graded = (r.grades ?? []).some(g => g.stageId === stage.id);
        items.push({ result: r, stage, graded });
      }
    }
    return items.sort((a, b) => Number(a.graded) - Number(b.graded));
  }, [selectedQuest, results]);
  const pendingGradeCount = gradeQueue.filter(i => !i.graded).length;

  // Per-question accuracy + distractor breakdown for QUIZ stages — which
  // wrong options students actually pick, not just that a stage was slow.
  const quizStats = useMemo(() => {
    const quizStages = (selectedQuest?.stages ?? []).filter((s: any) => s.type === 'QUIZ');
    if (quizStages.length === 0) return [];
    const accuracyById = new Map(computeQuizAccuracy(quizStages, results as QuestResult[]).map(a => [a.id, a]));
    return quizStages.map((stage: any, idx: number) => {
      const answers = (results as QuestResult[]).flatMap(r => (r.quizAnswers ?? []).filter(a => a.stageId === stage.id));
      const { accuracy } = accuracyById.get(stage.id)!;

      const counts = new Map<string, number>();
      for (const a of answers) counts.set(a.selectedAnswer, (counts.get(a.selectedAnswer) ?? 0) + 1);
      const optionPool = stage.questionType === 'multiple_choice' && stage.options?.length
        ? stage.options
        : [...counts.keys()];
      const distribution = optionPool
        .map((opt: string) => ({
          option: opt,
          count: counts.get(opt) ?? 0,
          isCorrect: String(opt).trim().toLowerCase() === String(stage.correctAnswer).trim().toLowerCase(),
        }))
        .sort((a, b) => b.count - a.count);

      return { id: stage.id, name: `Прашање ${idx + 1}`, title: stage.title, answers: answers.length, accuracy, distribution };
    });
  }, [selectedQuest, results]);

  const sortedResults = useMemo(() => {
    const data = [...results];
    if (sortByStageId) {
      data.sort((a, b) => {
        const aDur = a.stageDurations?.find((sd: any) => sd.stageId === sortByStageId)?.durationSec || 999999;
        const bDur = b.stageDurations?.find((sd: any) => sd.stageId === sortByStageId)?.durationSec || 999999;
        return aDur - bDur;
      });
    } else {
      data.sort((a, b) => b.points - a.points || new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    }
    return data;
  }, [results, sortByStageId]);

  const exportCSV = () => {
    if (results.length === 0) return;

    const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

    // Add BOM for Excel UTF-8 display
    const bom = "\uFEFF";
    const ped = selectedQuest?.pedagogy;
    const metaLines: string[] = [];
    if (selectedQuest?.title) metaLines.push(['Авантура:', csvCell(selectedQuest.title)].join(','));
    if (ped?.subject) metaLines.push(['Предмет:', csvCell(ped.subject)].join(','));
    if (ped?.grade) metaLines.push(['Одделение:', csvCell(ped.grade)].join(','));
    if (ped?.curriculumRef) metaLines.push(['Курикулум:', csvCell(ped.curriculumRef)].join(','));
    if (ped?.learningGoals?.length) metaLines.push(['Цели на учење:', csvCell(ped.learningGoals.join(' • '))].join(','));

    const headers = ['Играч', 'Поени', 'Датум', ...stageStats.map(s => `${s.name} (секунди)`)];
    const rows = sortedResults.map(r => {
      const stageTimes = stageStats.map(stat => {
        const stageDur = r.stageDurations?.find((sd: any) => sd.stageId === stat.id);
        return stageDur ? stageDur.durationSec : 0;
      });
      return [
        r.playerName || 'Анонимен',
        r.points,
        new Date(r.completedAt).toLocaleDateString(),
        ...stageTimes
      ].join(',');
    });

    const csvContent = bom + [...(metaLines.length ? [...metaLines, ''] : []), headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rezultati_${selectedQuestId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    if (results.length === 0) return;

    const ped = selectedQuest?.pedagogy;
    const metaRows: (string | number)[][] = [];
    if (selectedQuest?.title) metaRows.push(['Авантура', selectedQuest.title]);
    if (ped?.subject) metaRows.push(['Предмет', ped.subject]);
    if (ped?.grade) metaRows.push(['Одделение', ped.grade]);
    if (ped?.curriculumRef) metaRows.push(['Курикулум', ped.curriculumRef]);
    if (ped?.learningGoals?.length) metaRows.push(['Цели на учење', ped.learningGoals.join(' • ')]);

    const resultsSheet: SheetData = {
      name: 'Резултати',
      rows: [
        ...(metaRows.length ? [...metaRows, []] : []),
        ['Играч', 'Поени', 'Датум', ...stageStats.map(s => `${s.name} (секунди)`)],
        ...sortedResults.map(r => [
          r.playerName || 'Анонимен',
          r.points ?? 0,
          new Date(r.completedAt).toLocaleDateString(),
          ...stageStats.map(stat => {
            const stageDur = r.stageDurations?.find((sd: any) => sd.stageId === stat.id);
            return stageDur ? stageDur.durationSec : 0;
          }),
        ]),
      ],
    };

    const completionSheet: SheetData = {
      name: 'Завршеност по етапа',
      rows: [
        ['Етапа', 'Наслов', 'Стигнале', 'Вкупно играчи', 'Завршеност (%)', 'Пад од претходна (п.п.)'],
        ...stageCompletion.map(s => [
          s.label,
          s.title,
          s.reached,
          s.totalPlayers,
          s.completionRate,
          s.dropOff,
        ]),
      ],
    };

    downloadWorkbook([resultsSheet, completionSheet], `rezultati_${selectedQuestId}`);
  };

  return (
    <div className="space-y-6 mx-auto max-w-6xl w-full p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Резултати и Аналитика</h2>
          <p className="text-sm text-slate-400 mt-1">Анализирајте ги перформансите на играчите и времињата по етапа.</p>
        </div>

        <div className="relative w-full sm:max-w-xs flex gap-2">
          <select
            title="Избери авантура"
            value={selectedQuestId}
            onChange={(e) => setSelectedQuestId(e.target.value)}
            className="block w-full rounded-md border-0 bg-slate-800 py-2.5 pl-4 pr-10 text-slate-200 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm font-semibold"
          >
            {quests.length === 0 && <option value="">Нема авантури</option>}
            {quests.map(q => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCSV}
            title="Извоз во CSV"
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={exportExcel}
            title="Извоз во Excel (со завршеност по етапа)"
            className="p-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-md transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pedagogy summary */}
      {selectedQuest?.pedagogy && (selectedQuest.pedagogy.subject || selectedQuest.pedagogy.grade || selectedQuest.pedagogy.curriculumRef || (selectedQuest.pedagogy.learningGoals?.length ?? 0) > 0) && (
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedQuest.pedagogy.subject && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold">📚 {selectedQuest.pedagogy.subject}</span>
            )}
            {selectedQuest.pedagogy.grade && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">🎓 {selectedQuest.pedagogy.grade}</span>
            )}
            {selectedQuest.pedagogy.curriculumRef && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold">🏷 {selectedQuest.pedagogy.curriculumRef}</span>
            )}
          </div>
          {(selectedQuest.pedagogy.learningGoals?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Цели на учење</p>
              <ul className="space-y-1">
                {selectedQuest.pedagogy.learningGoals!.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 mt-0.5">✓</span>
                    <span className="flex-1 min-w-0 break-words">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {([['leaderboard', '🏆 Топ Листа'], ['funnel', '📊 Аналитика'], ['weakspots', '🎯 Слаби точки'], ['grade', '📝 За оценување']] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
            {(tab === 'funnel' || tab === 'weakspots') && !isPro && (
              <Lock className="inline w-3 h-3 ml-1.5 text-slate-600" />
            )}
            {tab === 'grade' && pendingGradeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingGradeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
         <div className="p-8 text-center text-slate-400 font-medium">Се вчитува...</div>
      ) : activeTab === 'funnel' ? (
        /* ── FUNNEL TAB ─────────────────────────────────────────────── */
        isPro ? (
          <div className="space-y-6">
            {funnelStats.length === 0 ? (
              <div className="text-center py-16 text-slate-500">Нема доволно податоци за funnel анализа.</div>
            ) : (
              <>
                {/* Summary chips */}
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{results.length}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Вкупно играчи</p>
                  </div>
                  <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{funnelStats[funnelStats.length - 1]?.pct ?? 0}%</p>
                    <p className="text-xs text-slate-400 mt-0.5">Завршиле квестот</p>
                  </div>
                  <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-rose-400">
                      {funnelStats.filter(s => s.bigDrop).length}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Критичен пад (&gt;20%)</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                  <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    Стапка на завршување по етапа (%)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelStats} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                          formatter={(v: number, _n: string, props: { payload?: { bigDrop?: boolean } }) => [
                            `${v}%${props.payload?.bigDrop ? ' ⚠ Голем пад' : ''}`,
                            'Завршиле'
                          ]}
                        />
                        <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                          {funnelStats.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={entry.bigDrop ? '#f43f5e' : entry.pct >= 70 ? '#34d399' : '#6366f1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Per-stage drop list */}
                <div className="space-y-2">
                  {funnelStats.map((s, idx) => (
                    <div key={s.id} className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${
                      s.bigDrop ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-800 border-slate-700'
                    }`}>
                      <span className="text-xs font-bold text-slate-500 w-8 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{s.title || s.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.bigDrop ? 'bg-rose-500' : s.pct >= 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${s.pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold shrink-0 ${s.bigDrop ? 'text-rose-400' : 'text-slate-400'}`}>
                            {s.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">{s.plays} играчи</p>
                        {s.bigDrop && idx > 0 && (
                          <p className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> -{s.drop}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-question accuracy + distractor breakdown */}
                {quizStats.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2 mt-2">
                      <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                      Точност по прашање
                    </h3>
                    {quizStats.map(q => (
                      <div key={q.id} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-semibold text-slate-200 truncate">{q.title || q.name}</p>
                          {q.accuracy !== null ? (
                            <span className={`text-xs font-bold shrink-0 ${q.accuracy >= 70 ? 'text-emerald-400' : q.accuracy >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {q.accuracy}% точност · {q.answers} одговори
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 shrink-0">Нема одговори</span>
                          )}
                        </div>
                        {q.distribution.length > 0 && (
                          <div className="space-y-1.5">
                            {q.distribution.map((d, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className={`text-xs w-40 sm:w-56 truncate ${d.isCorrect ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                                  {d.isCorrect ? '✓ ' : ''}{d.option}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${d.isCorrect ? 'bg-emerald-500' : 'bg-rose-400'}`}
                                    style={{ width: `${q.answers > 0 ? Math.round((d.count / q.answers) * 100) : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 w-8 text-right shrink-0">{d.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Lock className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-300">Funnel Аналитика — Pro план</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Видете каде ги губите играчите — стапка на завршување и критични падови по етапа.
            </p>
            <a href="/pricing" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              Надгради во Pro
            </a>
          </div>
        )
      ) : activeTab === 'weakspots' ? (
        /* ── CROSS-QUEST WEAK SPOTS TAB ─────────────────────────────── */
        isPro ? (
          weakspotsLoading ? (
            <div className="p-8 text-center text-slate-400 font-medium">Се вчитува...</div>
          ) : (
            <div className="space-y-8">
              <p className="text-sm text-slate-400">
                Најслаби прашања и најголеми падови низ <strong className="text-slate-300">сите</strong> твои авантури —
                не само во тековно избраната.
              </p>

              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <ClipboardCheck className="w-4 h-4 text-rose-400" />
                  Најслаби прашања (минимум 3 одговори)
                </h3>
                {crossQuestWeakQuestions.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Сè уште нема доволно податоци низ квестовите.</p>
                ) : (
                  <div className="space-y-2">
                    {crossQuestWeakQuestions.map(q => (
                      <button
                        key={`${q.questId}-${q.id}`}
                        type="button"
                        onClick={() => openQuestInFunnel(q.questId)}
                        className="w-full text-left rounded-xl border border-slate-700 bg-slate-800 hover:border-indigo-500/50 px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{q.title}</p>
                          <p className="text-xs text-slate-500 truncate">{q.questTitle} · {q.answers} одговори</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${
                          (q.accuracy ?? 0) >= 40 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {q.accuracy}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  Најголеми падови по етапа (&gt;15 п.п.)
                </h3>
                {crossQuestDropOffs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Сè уште нема доволно податоци низ квестовите.</p>
                ) : (
                  <div className="space-y-2">
                    {crossQuestDropOffs.map(s => (
                      <button
                        key={`${s.questId}-${s.id}`}
                        type="button"
                        onClick={() => openQuestInFunnel(s.questId)}
                        className="w-full text-left rounded-xl border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50 px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{s.title || s.label}</p>
                          <p className="text-xs text-slate-500 truncate">{s.questTitle}</p>
                        </div>
                        <span className="text-sm font-bold text-rose-400 shrink-0 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> -{s.dropOff}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Lock className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-300">Слаби точки — Pro план</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Најслаби прашања и падови низ сите твои авантури, на едно место.
            </p>
            <a href="/pricing" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              Надгради во Pro
            </a>
          </div>
        )
      ) : activeTab === 'grade' ? (
        /* ── GRADE TAB ───────────────────────────────────────────────── */
        <div className="space-y-2">
          {gradeQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
                <ClipboardCheck className="w-7 h-7 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-300">Нема поднесоци за оценување</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                Кога етапа со рубрика (MISSION/SURVEY) има рубрика за оценување и играч ќе поднесе одговор, ќе се појави тука.
              </p>
            </div>
          ) : (
            gradeQueue.map(({ result, stage, graded }) => (
              <div
                key={`${result.id}-${stage.id}`}
                className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${
                  graded ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-500/5 border-amber-500/20'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{result.playerName || 'Анонимен'}</p>
                  <p className="text-xs text-slate-500 truncate">{stage.title || stage.type}</p>
                </div>
                {graded ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Оценето
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 shrink-0">Чека оценување</span>
                )}
                <button
                  type="button"
                  onClick={() => setReviewing({ result, stageId: stage.id })}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
                >
                  {graded ? 'Прегледај' : 'Оцени'}
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── LEADERBOARD TAB ────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-slate-200">Топ Листа на играчи</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    title="Подреди по"
                    value={sortByStageId}
                    onChange={(e) => setSortByStageId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 outline-none focus:border-indigo-500"
                  >
                    <option value="">Подреди по поени</option>
                    {stageStats.map((stat, idx) => (
                      <option key={stat.id} value={stat.id}>Најбрзи на Етапа {idx + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-0 overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-2 md:px-4 py-3 w-10 md:w-16 text-center">Ранг</th>
                      <th className="px-2 md:px-4 py-3">Играч</th>
                      <th className="px-2 md:px-4 py-3 text-right">Поени</th>
                      <th className="hidden sm:table-cell px-2 md:px-4 py-3 text-right">{sortByStageId ? 'Време' : 'Датум'}</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    className="divide-y divide-slate-700/50"
                    layout
                  >
                    <AnimatePresence>
                      {sortedResults.length === 0 ? (
                        <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td colSpan={4} className="px-4 py-8 text-center bg-transparent">Нема одиграни игри за оваа авантура.</td>
                        </motion.tr>
                      ) : (
                        sortedResults.map((r, idx) => (
                          <motion.tr 
                            key={`${r.playerName}-${r.completedAt}`} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            className="hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-2 md:px-4 py-3 text-center">
                              {!sortByStageId && idx === 0 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-amber-500 text-white font-bold rounded-full text-xs shadow-md shadow-amber-500/20">1</span> :
                               !sortByStageId && idx === 1 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-300 text-slate-800 font-bold rounded-full text-xs shadow-md shadow-slate-300/20">2</span> :
                               !sortByStageId && idx === 2 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-amber-700 text-white font-bold rounded-full text-xs shadow-md shadow-amber-700/20">3</span> :
                               <span className="font-bold">{idx + 1}</span>}
                            </td>
                            <td className="px-2 md:px-4 py-3 font-bold text-slate-200 flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="truncate">{r.playerName || 'Анонимен'}</span>
                            </td>
                            <td className="px-2 md:px-4 py-3 text-right font-black text-indigo-400">{r.points}</td>
                            <td className="hidden sm:table-cell px-2 md:px-4 py-3 text-right text-xs">
                              {sortByStageId ? (
                                (() => {
                                  const dur = r.stageDurations?.find((sd: any) => sd.stageId === sortByStageId)?.durationSec;
                                  if (dur !== undefined) {
                                    return <span className="font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">{Math.floor(dur/60)}:{(dur%60).toString().padStart(2,'0')}</span>;
                                  }
                                  return '-';
                                })()
                              ) : (
                                new Date(r.completedAt).toLocaleDateString()
                              )}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>
            </div>

            {/* Recharts Visualization */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden p-4">
               <h3 className="font-bold text-slate-200 mb-4 ml-2">Динамика на просечно време (секунди)</h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={stageStats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                     <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                     <RechartsTooltip 
                       contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                       itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                     />
                     <Line type="monotone" dataKey="avgSec" name="Просечни секунди" stroke="#34d399" strokeWidth={3} dot={{ r: 5, fill: '#34d399', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 7 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* Average Times List per stage */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col h-fit">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-slate-200">Преглед по етапа</h3>
            </div>
            <div className="p-4 flex-1">
               {stageStats.length === 0 ? (
                 <p className="text-sm text-slate-500 text-center py-4">Нема податоци за етапи</p>
               ) : (
                 <div className="space-y-4">
                   {stageStats.map((stat, idx) => (
                     <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-lg hover:border-indigo-500/50 transition-colors">
                       <h4 className="font-bold text-slate-300 text-sm line-clamp-1 mb-2">{idx + 1}. {stat.title}</h4>
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-slate-500">Одиграна {stat.plays} пати</span>
                         <span className="font-mono font-bold text-emerald-400">{Math.floor(stat.avgSec / 60)}:{(stat.avgSec % 60).toString().padStart(2, '0')}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {reviewing && selectedQuest && (
        <SubmissionReviewModal
          open
          onClose={() => setReviewing(null)}
          quest={selectedQuest}
          result={reviewing.result}
          stageId={reviewing.stageId}
          onGraded={updated => {
            setResults(prev => prev.map(r => (r.id === updated.id ? updated : r)));
          }}
        />
      )}
    </div>
  );
}


