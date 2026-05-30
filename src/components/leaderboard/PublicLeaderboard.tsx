import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Medal, Clock, User, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { getQuestById, getPublicQuestResults } from '../../utils/storage';
import type { Quest, QuestResult } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('mk-MK', { day: 'numeric', month: 'short' });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center">
      {rank}
    </span>
  );
}

export function PublicLeaderboard() {
  const { questId } = useParams<{ questId: string }>();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [results, setResults] = useState<QuestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!questId) return;
    Promise.all([
      getQuestById(questId),
      getPublicQuestResults(questId, 20),
    ])
      .then(([q, r]) => {
        if (!q || !q.publicLeaderboard) { setNotFound(true); return; }
        setQuest(q);
        setResults(r);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [questId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <Lock className="w-12 h-12 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-300">Табелата не е достапна</h1>
        <p className="text-slate-500 text-sm max-w-xs">
          Јавната табела за оваа авантура не е активирана или квестот не постои.
        </p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад кон почетна
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-indigo-900/40 to-slate-950 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> АВАНТУРА
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">{quest?.title}</h1>
              <p className="text-slate-400 text-sm mt-1">Јавна табела со резултати · Топ 20</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <User className="w-10 h-10 text-slate-700" />
            <p className="text-slate-500">Сè уште нема играчи. Биди прв!</p>
            <Link
              to={`/play/${questId}`}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Играј сега
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              return (
                <div
                  key={result.id}
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all ${
                    rank === 1
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : rank === 2
                        ? 'bg-slate-400/5 border border-slate-400/10'
                        : rank === 3
                          ? 'bg-orange-700/5 border border-orange-700/10'
                          : 'bg-slate-800/50 border border-slate-700/50'
                  }`}
                >
                  <div className="w-8 flex items-center justify-center shrink-0">
                    <RankBadge rank={rank} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isTop3 ? 'text-white' : 'text-slate-200'}`}>
                      {result.playerName || 'Анонимен'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(result.completedAt)}
                    </p>
                  </div>

                  <div className={`text-right shrink-0 ${
                    rank === 1 ? 'text-amber-400' : rank <= 3 ? 'text-slate-300' : 'text-slate-400'
                  }`}>
                    <p className={`font-bold text-lg ${rank === 1 ? 'text-2xl' : ''}`}>
                      {result.points}
                    </p>
                    <p className="text-xs text-slate-500">поени</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <Link
            to={`/play/${questId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
          >
            <Medal className="w-5 h-5" />
            Влез на листата — играј сега
          </Link>
          <p className="text-xs text-slate-600 mt-4">
            Создадено со <span className="text-indigo-400">АВАНТУРА</span>
          </p>
        </div>
      </div>
    </div>
  );
}
