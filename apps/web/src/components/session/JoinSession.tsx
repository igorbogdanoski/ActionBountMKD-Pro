import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogIn, MapPin } from 'lucide-react';
import { MobilePlayer } from '../player/MobilePlayer';
import { joinSession, SessionError } from '../../utils/sessionStorage';
import { isValidJoinCode, normalizeJoinCode } from '../../lib/session';
import { SEO } from '../SEO';
import { Button } from '../ui/Button';

const PLAYER_ID_KEY = 'av_session_player_id';
const ERROR_ID = 'join-session-error';

function getPlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = (() => { try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); } })();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export function JoinSession() {
  const { code: codeParam } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [code, setCode] = useState(codeParam ? normalizeJoinCode(codeParam) : '');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'code' | 'name' | 'form' | null>(null);

  // Joined state — render the player
  const [joined, setJoined] = useState<{ questId: string; code: string; playerId: string; name: string } | null>(null);

  useEffect(() => {
    if (codeParam) setCode(normalizeJoinCode(codeParam));
  }, [codeParam]);

  const handleJoin = async () => {
    const c = normalizeJoinCode(code);
    if (!isValidJoinCode(c)) { setErrorField('code'); setError('Невалиден код. Кодот има 6 знаци.'); return; }
    if (!name.trim()) { setErrorField('name'); setError('Внеси го твоето име.'); return; }

    setJoining(true);
    setError(null);
    setErrorField(null);
    try {
      const playerId = getPlayerId();
      const session = await joinSession(c, playerId, name.trim());
      setJoined({ questId: session.questId, code: c, playerId, name: name.trim() });
    } catch (err) {
      setErrorField('form');
      if (err instanceof SessionError) {
        const map: Record<string, string> = {
          'not-found': 'Сесијата не постои. Провери го кодот.',
          'finished': 'Сесијата е завршена.',
          'full': 'Сесијата е полна.',
          'code-collision': 'Грешка. Обиди се повторно.',
        };
        setError(map[err.code] ?? 'Грешка при приклучување.');
      } else {
        setError('Грешка при приклучување. Провери ја интернет конекцијата.');
      }
    } finally {
      setJoining(false);
    }
  };

  if (joined) {
    return (
      <MobilePlayer
        questId={joined.questId}
        sessionCode={joined.code}
        sessionPlayerId={joined.playerId}
        sessionPlayerName={joined.name}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
      <SEO title="Приклучи се на игра" description="Внеси код за да се приклучиш на авантура во живо" noIndex />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-4 rotate-3">
            <MapPin className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Приклучи се на игра</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Внеси го кодот од твојот водач</p>
        </div>

        {error && <div id={ERROR_ID} role="alert" className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm text-center">{error}</div>}

        <label htmlFor="join-session-code" className="sr-only">Код за сесија</label>
        <input
          id="join-session-code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          placeholder="КОД"
          value={code}
          onChange={e => setCode(normalizeJoinCode(e.target.value).slice(0, 6))}
          aria-invalid={errorField === 'code' ? true : undefined}
          aria-describedby={errorField === 'code' ? ERROR_ID : undefined}
          className="w-full text-center text-3xl font-black tracking-[0.3em] pl-[0.3em] py-4 rounded-xl mb-4 outline-none border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:border-emerald-500 uppercase"
        />
        <label htmlFor="join-session-name" className="sr-only">Име на играч</label>
        <input
          id="join-session-name"
          type="text"
          placeholder="Твоето име..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
          aria-invalid={errorField === 'name' ? true : undefined}
          aria-describedby={errorField === 'name' ? ERROR_ID : undefined}
          className="w-full text-center text-lg py-4 rounded-xl mb-6 font-bold outline-none border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:border-emerald-500"
        />
        <Button
          type="button"
          onClick={handleJoin}
          loading={joining}
          variant="success"
          fullWidth
          leftIcon={<LogIn className="w-5 h-5" />}
          className="!py-4 uppercase tracking-wider !shadow-xl active:scale-95 transition-all disabled:opacity-50 [&>svg]:!w-5 [&>svg]:!h-5"
        >
          Приклучи се
        </Button>

        <Button
          type="button"
          onClick={() => navigate('/')}
          variant="ghost"
          fullWidth
          colorClassName="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          className="mt-4 min-h-11 !p-0 !font-normal"
        >
          ← Назад
        </Button>
      </div>
    </div>
  );
}
