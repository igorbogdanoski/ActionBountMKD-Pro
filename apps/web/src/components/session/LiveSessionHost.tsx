import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Trophy, Users, Radio, Play, Square, ChevronLeft, ChevronRight,
  Copy, Check, ArrowLeft, Loader2, Flag, MapPin,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useGameSession } from '../../hooks/useGameSession';
import { getQuestById } from '../../utils/storage';
import {
  createSession, setSessionStatus, setBroadcastStage, deleteSession,
  clearSosAlert,
} from '../../utils/sessionStorage';
import type { LeaderboardEntry, Quest, SessionMode, SessionSosAlert } from 'shared';
import { SEO } from '../SEO';

const MAP_FALLBACK_CENTER: [number, number] = [41.9981, 21.4254];
const MARKER_COLORS = ['#14b8a6', '#f97316', '#6366f1', '#ec4899', '#f59e0b', '#22c55e'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function playerMarkerIcon(player: LeaderboardEntry, index: number) {
  const initial = escapeHtml((player.name.trim().charAt(0) || '?').toUpperCase());
  const color = MARKER_COLORS[index % MARKER_COLORS.length];

  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
    html: `<div style="width:34px;height:34px;border-radius:9999px;background:${color};border:2px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px;box-shadow:0 8px 18px rgba(15,23,42,0.35);">${initial}</div>`,
  });
}

function formatLastSeen(ts?: string): string {
  if (!ts) return 'Без последна локација';
  const deltaMs = Date.now() - new Date(ts).getTime();
  const deltaSec = Math.max(0, Math.round(deltaMs / 1000));
  if (deltaSec < 60) return `Последно виден пред ${deltaSec}s`;
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `Последно виден пред ${deltaMin}m`;
  const deltaHours = Math.round(deltaMin / 60);
  return `Последно виден пред ${deltaHours}h`;
}

function LiveMapViewport({
  players,
  fallbackCenter,
  focusedAlert,
}: {
  players: Array<LeaderboardEntry & { lastLat: number; lastLng: number }>;
  fallbackCenter: [number, number];
  focusedAlert: SessionSosAlert | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusedAlert) {
      map.setView([focusedAlert.lat, focusedAlert.lng], 17);
      return;
    }

    if (players.length === 0) {
      map.setView(fallbackCenter, 12);
      return;
    }

    if (players.length === 1) {
      map.setView([players[0].lastLat, players[0].lastLng], 15);
      return;
    }

    const bounds = L.latLngBounds(players.map(player => [player.lastLat, player.lastLng] as [number, number]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, players, fallbackCenter, focusedAlert]);

  return null;
}

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
  const [focusedAlertPlayerId, setFocusedAlertPlayerId] = useState<string | null>(null);

  const { session, leaderboard, stats } = useGameSession(code ?? undefined);

  useEffect(() => {
    if (!questId) return;
    getQuestById(questId)
      .then(q => setQuest(q))
      .catch(() => setQuest(null))
      .finally(() => setLoadingQuest(false));
  }, [questId]);

  const joinUrl = code ? `${window.location.origin}/join/${code}` : '';
  const trackedPlayers = leaderboard.filter(
    (player): player is LeaderboardEntry & { lastLat: number; lastLng: number } =>
      typeof player.lastLat === 'number' && typeof player.lastLng === 'number',
  );
  const mapCenter: [number, number] = trackedPlayers.length > 0
    ? [trackedPlayers[0].lastLat, trackedPlayers[0].lastLng]
    : quest?.startCoordinates
      ? [quest.startCoordinates.latitude, quest.startCoordinates.longitude]
      : MAP_FALLBACK_CENTER;
  const sosAlerts = (session?.sosAlerts ?? []).slice().sort((a, b) => b.ts.localeCompare(a.ts));
  const focusedAlert = sosAlerts.find(alert => alert.playerId === focusedAlertPlayerId) ?? sosAlerts[0] ?? null;
  const focusedAlertPlayer = focusedAlert
    ? leaderboard.find(player => player.uid === focusedAlert.playerId) ?? session?.players.find(player => player.uid === focusedAlert.playerId)
    : null;

  useEffect(() => {
    if (!focusedAlertPlayerId && sosAlerts.length > 0) {
      setFocusedAlertPlayerId(sosAlerts[0].playerId);
      return;
    }
    if (focusedAlertPlayerId && !sosAlerts.some(alert => alert.playerId === focusedAlertPlayerId)) {
      setFocusedAlertPlayerId(sosAlerts[0]?.playerId ?? null);
    }
  }, [focusedAlertPlayerId, sosAlerts]);

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
          <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
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

            <div className="space-y-6">
              {focusedAlert && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-rose-300 mb-2">Итен повик</p>
                      <h2 className="text-lg font-bold text-white">
                        {focusedAlertPlayer?.name ?? 'Непознат тим'} испрати SOS
                      </h2>
                      <p className="text-sm text-rose-100/80 mt-1">
                        Етапа {((focusedAlertPlayer?.stageIndex ?? 0) + 1)} · {focusedAlertPlayer?.points ?? 0} поени
                      </p>
                      <p className="text-xs text-rose-200/70 mt-2">{formatLastSeen(focusedAlert.ts)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFocusedAlertPlayerId(focusedAlert.playerId)}
                        className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-400"
                      >
                        Приближи на мапа
                      </button>
                      <button
                        type="button"
                        onClick={() => clearSosAlert(code, focusedAlert.playerId).catch(() => {})}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-100 font-semibold hover:bg-slate-700"
                      >
                        Означи како решено
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold inline-flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-400" /> Жива мапа</h2>
                    <p className="text-xs text-slate-400 mt-1">Позициите се гледаат само додека сесијата е активна.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-800 rounded-full px-3 py-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> {trackedPlayers.length} активни позиции
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-[360px] relative">
                  <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LiveMapViewport players={trackedPlayers} fallbackCenter={mapCenter} focusedAlert={focusedAlert} />
                    {trackedPlayers.map((player, index) => (
                      <Marker
                        key={player.uid}
                        position={[player.lastLat, player.lastLng]}
                        icon={playerMarkerIcon(player, index)}
                      >
                        <Popup>
                          <div className="min-w-[120px]">
                            <div className="font-semibold">{player.name}</div>
                            <div className="text-xs text-slate-500">Етапа {player.stageIndex + 1} · {player.points} поени</div>
                            <div className="text-xs text-slate-500 mt-1">{formatLastSeen(player.lastSeenAt)}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {sosAlerts.map(alert => (
                      <Marker
                        key={`sos-${alert.playerId}`}
                        position={[alert.lat, alert.lng]}
                        icon={L.divIcon({
                          className: '',
                          iconSize: [42, 42],
                          iconAnchor: [21, 21],
                          html: '<div style="width:42px;height:42px;border-radius:9999px;background:#ef4444;border:3px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:800;box-shadow:0 10px 22px rgba(239,68,68,0.35);">!</div>',
                        })}
                      >
                        <Popup>
                          <div className="min-w-[130px]">
                            <div className="font-semibold text-rose-600">SOS аларм</div>
                            <div className="text-sm">{leaderboard.find(player => player.uid === alert.playerId)?.name ?? 'Непознат тим'}</div>
                            <div className="text-xs text-slate-500 mt-1">{formatLastSeen(alert.ts)}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>

                  {trackedPlayers.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-950/55">
                      <div className="text-center px-6">
                        <p className="text-sm font-semibold text-slate-200 mb-1">Сè уште нема GPS позиции</p>
                        <p className="text-xs text-slate-400">
                          {session?.status === 'active'
                            ? 'Играчите ќе се појават штом нивниот уред испрати прва локација.'
                            : 'Стартувај ја сесијата за да почне споделување на локации.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

