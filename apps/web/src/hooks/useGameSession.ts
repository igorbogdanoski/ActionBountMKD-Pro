import { useEffect, useState } from 'react';
import { subscribeSession } from '../utils/sessionStorage';
import { computeLeaderboard, sessionStats } from '../lib/session';
import type { SessionStats } from '../lib/session';
import type { GameSession, LeaderboardEntry } from 'shared';

export interface UseGameSession {
  session: GameSession | null;
  leaderboard: LeaderboardEntry[];
  stats: SessionStats;
  loading: boolean;
  notFound: boolean;
}

const EMPTY_STATS: SessionStats = { total: 0, finished: 0, active: 0, topPoints: 0 };

/** Subscribe to a live session by join code and derive leaderboard + stats. */
export function useGameSession(code: string | undefined): UseGameSession {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(!!code);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) {
      setSession(null);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeSession(
      code,
      sess => {
        setSession(sess);
        setNotFound(sess === null);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setNotFound(true);
      },
    );
    return () => unsub();
  }, [code]);

  return {
    session,
    leaderboard: session ? computeLeaderboard(session.players) : [],
    stats: session ? sessionStats(session) : EMPTY_STATS,
    loading,
    notFound,
  };
}

