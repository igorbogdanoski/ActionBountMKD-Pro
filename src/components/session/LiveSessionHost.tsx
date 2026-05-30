import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Trophy, Users, Radio, Play, Square, ChevronLeft, ChevronRight,
  Copy, Check, ArrowLeft, Loader2, Flag,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useGameSession } from '../../hooks/useGameSession';
import { getQuestById } from '../../utils/storage';
import {
  createSession, setSessionStatus, setBroadcastStage, deleteSession,
} from '../../utils/sessionStorage';
import type { Quest, SessionMode } from '../../types';
import { SEO } from '../SEO';

export function LiveSessionHost() {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = usePlan();

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loadingQuest, setLoadingQuest] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode>('free');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session, leaderboard, stats } = useGameSession(code ?? undefined);

  useEffect(() => {
    if (!questId) return;
    getQuestById(questId)
      .then(q => setQuest(q))
      .catch(() => setQuest(null))
      .finally(() => setLoadingQuest(false));
  }, [questId]);

  const joinUrl = code ? `${window.location.origin}/join/${code}` : '';

  const handleCreate = async () => {
    if (!quest || !user || creating) return;
    setCreating(true);
    setError(null);
    try {
      const s = await createSession({
        questId: quest.id,
        questTitle: quest.title,
        hostId: user.uid,
        stageCount: quest.stages.length,
        mode,
      });
      setCode(s.id);
    } catch {
      setError('Не може да се создаде сесија. Обиди се повторно.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  // ─── Guards ───
  if (!isPro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-center p-6">
        <Radio className="w-12 h-12 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Игра во живо</h1>
        <p className="text-slate-400 max-w-sm">Соработката во реално време е достапна на Pro план и погоре.</p>
        <button onClick={() => navigate('/pricing')} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold">
          Надгради на Pro
        </button>
        <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white text-sm">← Назад</button>
      </div>
    );
  }

  if (loadingQuest) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-center p-6">
        <p className="text-slate-300">Квестот не е пронајден.</p>
        <button onClick={() => navigate('/dashboard')} className="text-indigo-400 hover:text-indigo-300">← Назад кон таблата</button>
      </div>
    );
  }

  const stageCount = quest.stages.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <SEO title={`Игра во живо — ${quest.title}`} description="Хостирај авантура во реално време" noIndex />
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Назад кон таблата
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{quest.title}</h1>
        <p className="text-slate-400 mb-6">Игра во живо · {stageCount} етапи</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}

        {!code ? (
          // ─── Create session ───
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md">
            <h2 className="text-lg font-bold mb-4">Започни нова сесија</h2>
            <div className="space-y-3 mb-6">
              <ModeOption active={mode === 'free'} onClick={() => setMode('free')} icon={<Users className="w-5 h-5" />}
                title="Слободно темпо" desc="Секој играч напредува со свое темпо." />
              <ModeOption active={mode === 'broadcast'} onClick={() => setMode('broadcast')} icon={<Radio className="w-5 h-5" />}
                title="Водено (broadcast)" desc="Ти ја контролираш етапата за сите играчи." />
            </div>
            <button onClick={handleCreate} disabled={creating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold inline-flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Создади сесија
            </button>
          </div>
        ) : (
          // ─── Active session dashboard ───
          <div className="grid md:grid-cols-2 gap-6">
            {/* Join panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Код за приклучување</p>
              <p className="text-5xl font-black tracking-[0.3em] text-emerald-400 mb-4 pl-[0.3em]">{code}</p>
              <div className="bg-white p-3 rounded-xl mb-4"><QRCodeSVG value={joinUrl} size={160} /></div>
              <button onClick={copyLink} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Копирано!' : 'Копирај линк'}
              </button>

              <div className="flex flex-wrap gap-2 justify-center mt-6 w-full">
                {session?.status === 'waiting' && (
                  <button onClick={() => setSessionStatus(code, 'active')}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold inline-flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Започни играта
                  </button>
                )}
                {session?.status === 'active' && (
                  <button onClick={() => setSessionStatus(code, 'finished')}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold inline-flex items-center justify-center gap-2">
                    <Square className="w-4 h-4" /> Заврши
                  </button>
                )}
                {session?.status === 'finished' && (
                  <span className="flex-1 py-2.5 bg-slate-800 rounded-lg font-bold text-slate-400 inline-flex items-center justify-center gap-2">
                    <Flag className="w-4 h-4" /> Сесијата е завршена
                  </span>
                )}
              </div>

              {/* Broadcast controls */}
              {session?.mode === 'broadcast' && session.status === 'active' && (
                <div className="mt-4 w-full flex items-center justify-between gap-2 bg-slate-800 rounded-xl p-2">
                  <button onClick={() => setBroadcastStage(code, session.currentStageIndex - 1)}
                    disabled={session.currentStageIndex <= 0}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="text-sm font-bold">Етапа {session.currentStageIndex + 1} / {stageCount}</span>
                  <button onClick={() => setBroadcastStage(code, session.currentStageIndex + 1)}
                    disabled={session.currentStageIndex >= stageCount - 1}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40"><ChevronRight className="w-5 h-5" /></button>
                </div>
              )}

              <button onClick={() => { deleteSession(code).catch(() => {}); navigate('/dashboard'); }}
                className="mt-4 text-xs text-slate-500 hover:text-rose-400">Затвори и избриши сесија</button>
            </div>

            {/* Live leaderboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold inline-flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Табела во живо</h2>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Users className="w-4 h-4" /> {stats.total} · ✓ {stats.finished}</span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">Сè уште нема играчи. Сподели го кодот {code}.</div>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map(p => (
                    <li key={p.uid} className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        p.rank === 1 ? 'bg-amber-400 text-slate-900' : p.rank === 2 ? 'bg-slate-300 text-slate-900' : p.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>{p.rank}</span>
                      <span className="flex-1 font-semibold truncate">{p.name}{p.finished && <Check className="inline w-4 h-4 text-emerald-400 ml-1" />}</span>
                      <span className="text-xs text-slate-400">Е{p.stageIndex + 1}</span>
                      <span className="font-black text-indigo-400 tabular-nums">{p.points}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeOption({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start ${
      active ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
    }`}>
      <span className={active ? 'text-indigo-400' : 'text-slate-400'}>{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-slate-400">{desc}</span>
      </span>
    </button>
  );
}
