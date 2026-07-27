import React, { useEffect, useState } from 'react';
import { Loader2, Swords, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import ProfileLink from '../Profile/ProfileLink';

const MatchmakingPanel: React.FC = () => {
  const navigate = useNavigate();
  const [inQueue, setInQueue] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [matchInfo, setMatchInfo] = useState<any>(null);

  const refresh = async () => {
    const [statusRes, tRes] = await Promise.all([
      api.get('/matchmaking/status', { params: { gameId: 'judgment' } }).catch(() => ({ data: {} })),
      api.get('/matchmaking/tournaments').catch(() => ({ data: [] })),
    ]);
    setInQueue(Boolean(statusRes.data?.inQueue));
    setQueueSize(statusRes.data?.queueSize || 0);
    setTournaments(tRes.data || []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useWebSocket({
    onMatchFound: (payload) => {
      setMatchInfo(payload);
      setInQueue(false);
      toast.success(`Match found vs @${payload.opponentUsername || 'opponent'}!`);
    },
  });

  const joinQueue = async () => {
    setBusy(true);
    try {
      const res = await api.post('/matchmaking/join', { gameId: 'judgment' });
      setInQueue(res.data.queued);
      setQueueSize(res.data.queueSize || 0);
      if (res.data.match) {
        toast.success('Match ready!');
        setMatchInfo({
          matchId: res.data.match.id,
          gameId: 'judgment',
        });
      } else {
        toast.success(`Queued · ~${res.data.estimatedWaitSeconds}s`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Queue failed');
    } finally {
      setBusy(false);
    }
  };

  const leaveQueue = async () => {
    setBusy(true);
    try {
      await api.post('/matchmaking/leave', { gameId: 'judgment' });
      setInQueue(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const createTournament = async () => {
    try {
      await api.post('/matchmaking/tournaments', {
        title: 'Puurga Arena Cup',
        gameId: 'judgment',
        maxPlayers: 8,
        prizeCredits: 100,
      });
      toast.success('Tournament created');
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Create failed');
    }
  };

  const joinTournament = async (id: string) => {
    try {
      await api.post(`/matchmaking/tournaments/${id}/join`);
      toast.success('Joined tournament');
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Join failed');
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-orange-600 dark:text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Matchmaking</h3>
      </div>

      {matchInfo && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/10 p-3 text-sm">
          <p className="font-medium text-foreground">Match ready</p>
          <p className="text-xs text-muted mt-1">
            vs{' '}
            <ProfileLink username={matchInfo.opponentUsername} className="hover:text-accent">
              @{matchInfo.opponentUsername || 'opponent'}
            </ProfileLink>
            {' · '}
            {matchInfo.gameId || 'judgment'}
          </p>
          <button
            type="button"
            className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-accent text-black font-semibold cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => navigate('/puurga-games?play=judgment')}
          >
            Enter arena
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!inQueue ? (
          <button
            type="button"
            disabled={busy}
            onClick={joinQueue}
            className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer transition-colors shadow-sm shadow-orange-600/20"
          >
            Find 1v1 (Judgment)
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={leaveQueue}
            className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-card-hover cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel queue ({queueSize} waiting)
          </button>
        )}
        {busy && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Trophy size={12} className="text-amber-600 dark:text-yellow-500" /> Tournaments
          </p>
          <button
            type="button"
            onClick={createTournament}
            className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-card-hover cursor-pointer transition-colors text-foreground"
          >
            Create
          </button>
        </div>
        {tournaments.length === 0 ? (
          <p className="text-xs text-muted">No open tournaments</p>
        ) : (
          <ul className="space-y-2">
            {tournaments.slice(0, 5).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 text-xs rounded-lg border border-border/60 px-2.5 py-2 hover:bg-card-hover/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-foreground font-medium truncate">{t.title}</p>
                  <p className="text-muted flex items-center gap-1">
                    <Users size={10} /> {t.status} · prize {t.prize_credits} pts
                  </p>
                </div>
                {t.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => joinTournament(t.id)}
                    className="shrink-0 px-2 py-1 rounded-md bg-accent text-black font-medium cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Join
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MatchmakingPanel;
