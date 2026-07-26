import React, { useCallback, useEffect, useState } from 'react';
import { Swords, Loader2, Trophy, History, Users, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../../context/UserContext';
import { websocketService } from '../../services/websocketService';
import {
  STAKE_PRESETS,
  createChallenge,
  listChallenges,
  acceptChallenge,
  declineChallenge,
  cancelChallenge,
  submitChallengeScore,
  getChallengeHistory,
  getChallengeLeaderboard,
  getChallengeFeed,
  getGamePresence,
  type GameChallenge,
  type GamePresenceUser,
} from '../../services/challengeService';
import { getAcceptedFriends } from '../../services/friendService';
import { PUURGA_GAMES_CATALOG } from '../../config/puurgaGamesCatalog';
import Avatar from '../Avatar';
import ProfileLink from '../Profile/ProfileLink';

type Tab = 'challenge' | 'inbox' | 'history' | 'ranks' | 'live';

const ChallengePanel: React.FC<{
  initialOpponentId?: string;
  initialGameId?: string;
  onConsumedFocus?: () => void;
}> = ({ initialOpponentId, initialGameId, onConsumedFocus }) => {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('challenge');
  const [friends, setFriends] = useState<any[]>([]);
  const [presence, setPresence] = useState<GamePresenceUser[]>([]);
  const [inbox, setInbox] = useState<GameChallenge[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [busy, setBusy] = useState(false);

  const [opponentId, setOpponentId] = useState(initialOpponentId || '');
  const [gameId, setGameId] = useState(initialGameId || PUURGA_GAMES_CATALOG[0]?.id || 'purga-rift');
  const [stake, setStake] = useState<number>(50);
  const [customStake, setCustomStake] = useState('');
  const [activePlay, setActivePlay] = useState<GameChallenge | null>(null);
  const [myScore, setMyScore] = useState('');

  useEffect(() => {
    if (initialOpponentId) {
      setOpponentId(initialOpponentId);
      setTab('challenge');
    }
    if (initialGameId) setGameId(initialGameId);
    if (initialOpponentId || initialGameId) onConsumedFocus?.();
  }, [initialOpponentId, initialGameId, onConsumedFocus]);

  const refreshInbox = useCallback(async () => {
    const [pending, playing] = await Promise.all([
      listChallenges('pending').catch(() => []),
      listChallenges('playing').catch(() => []),
    ]);
    setInbox([...(pending || []), ...(playing || [])]);
    const mine = (playing || []).find(
      (c) => c.challenger_id === user?.id || c.opponent_id === user?.id
    );
    if (mine) setActivePlay(mine);
  }, [user?.id]);

  const refreshPresence = useCallback(async () => {
    const list = await getGamePresence().catch(() => []);
    setPresence(list);
  }, []);

  useEffect(() => {
    void getAcceptedFriends().then(setFriends).catch(() => setFriends([]));
    void refreshInbox();
    void refreshPresence();
  }, [refreshInbox, refreshPresence]);

  useEffect(() => {
    if (tab === 'history') {
      void getChallengeHistory(range).then(setHistory).catch(() => setHistory([]));
    }
    if (tab === 'ranks') {
      void getChallengeLeaderboard().then(setRanks).catch(() => setRanks([]));
    }
    if (tab === 'live') {
      void getChallengeFeed().then(setFeed).catch(() => setFeed([]));
      void refreshPresence();
    }
  }, [tab, range, refreshPresence]);

  useEffect(() => {
    const unsubs = [
      websocketService.on('challenge_received', () => {
        toast.success('New challenge received!');
        void refreshInbox();
      }),
      websocketService.on('challenge_accepted', (payload: any) => {
        toast.success('Challenge accepted — fight!');
        setActivePlay(payload?.challenge || null);
        void refreshInbox();
      }),
      websocketService.on('challenge_declined', () => {
        toast('Challenge declined');
        void refreshInbox();
      }),
      websocketService.on('challenge_finished', (payload: any) => {
        const won = payload?.winnerId === user?.id;
        toast.success(won ? 'You won the challenge!' : payload?.draw ? 'Draw — stakes refunded' : 'Challenge finished');
        setActivePlay(null);
        void refreshInbox();
      }),
      websocketService.on('friend_started_game', () => void refreshPresence()),
      websocketService.on('friend_left_game', () => void refreshPresence()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [refreshInbox, refreshPresence, user?.id]);

  const effectiveStake = customStake ? Number(customStake) : stake;

  const handleSend = async () => {
    if (!opponentId || !gameId || !effectiveStake || effectiveStake < 1) {
      toast.error('Pick a friend, game and stake');
      return;
    }
    setBusy(true);
    try {
      const game = PUURGA_GAMES_CATALOG.find((g) => g.id === gameId);
      await createChallenge({
        opponentId,
        gameId,
        stake: effectiveStake,
        gameTitle: game?.title,
      });
      toast.success('Challenge sent');
      setTab('inbox');
      await refreshInbox();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send challenge');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (id: string) => {
    setBusy(true);
    try {
      const c = await acceptChallenge(id);
      setActivePlay(c);
      toast.success('Stakes locked — submit your score after playing');
      await refreshInbox();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Accept failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async (id: string) => {
    setBusy(true);
    try {
      await declineChallenge(id);
      await refreshInbox();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Decline failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(true);
    try {
      await cancelChallenge(id);
      await refreshInbox();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitScore = async () => {
    if (!activePlay) return;
    const score = Number(myScore);
    if (!Number.isFinite(score) || score < 0) {
      toast.error('Enter a valid score');
      return;
    }
    setBusy(true);
    try {
      const updated = await submitChallengeScore(activePlay.id, score);
      setActivePlay(updated);
      if (updated.status === 'finished') {
        toast.success('Match resolved');
        setActivePlay(null);
      } else {
        toast.success('Score submitted — waiting for opponent');
      }
      await refreshInbox();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'challenge', label: 'Challenge', icon: <Swords size={14} /> },
    { id: 'inbox', label: 'Inbox', icon: <Users size={14} /> },
    { id: 'history', label: 'History', icon: <History size={14} /> },
    { id: 'ranks', label: 'Ranks', icon: <Trophy size={14} /> },
    { id: 'live', label: 'Live', icon: <Flame size={14} /> },
  ];

  const presenceById = new Map(presence.map((p) => [p.id, p]));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={18} className="text-orange-600 dark:text-orange-400" />
        <h3 className="font-bold text-foreground">Player Challenges</h3>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-4 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-accent text-black border-accent'
                : 'bg-background text-muted border-border hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'challenge' && (
        <div className="space-y-3">
          <label className="block text-xs text-muted">
            Opponent
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a friend…</option>
              {friends.map((f) => {
                const playing = presenceById.get(f.id);
                return (
                  <option key={f.id} value={f.id}>
                    {f.name || f.full_name} {playing ? `🟢 Playing ${playing.gameTitle}` : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="block text-xs text-muted">
            Game
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
            >
              {PUURGA_GAMES_CATALOG.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs text-muted mb-1.5">Stake level</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: 'Small', value: 10 },
                { label: 'Medium', value: 50 },
                { label: 'High', value: 100 },
              ].map((lvl) => (
                <button
                  key={lvl.label}
                  type="button"
                  onClick={() => {
                    setStake(lvl.value);
                    setCustomStake('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    !customStake && stake === lvl.value
                      ? 'bg-accent text-black border-accent'
                      : 'border-border text-muted hover:text-foreground hover:bg-card-hover'
                  }`}
                >
                  {lvl.label} · {lvl.value}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mb-1.5">Or pick amount</p>
            <div className="flex flex-wrap gap-1.5">
              {STAKE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStake(s);
                    setCustomStake('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    !customStake && stake === s
                      ? 'bg-accent text-black border-accent'
                      : 'border-border text-muted hover:text-foreground hover:bg-card-hover'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              placeholder="Custom amount"
              value={customStake}
              onChange={(e) => setCustomStake(e.target.value)}
              className="mt-2 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleSend}
            className="w-full py-2.5 rounded-xl bg-accent text-black text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
            Send Challenge
          </button>
        </div>
      )}

      {tab === 'inbox' && (
        <div className="space-y-2">
          {activePlay && (
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 mb-2">
              <p className="text-sm font-semibold text-foreground">Active match</p>
              <p className="text-xs text-muted mt-0.5">
                {activePlay.game_title || activePlay.game_id} · {activePlay.stake} pts
              </p>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  min={0}
                  value={myScore}
                  onChange={(e) => setMyScore(e.target.value)}
                  placeholder="Your score"
                  className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSubmitScore}
                  className="px-3 py-1.5 rounded-lg bg-accent text-black text-xs font-medium disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {inbox.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No pending challenges</p>
          ) : (
            inbox.map((c) => {
              const incoming = c.opponent_id === user?.id && c.status === 'pending';
              const outgoing = c.challenger_id === user?.id && c.status === 'pending';
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-background"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.game_title || c.game_id}
                    </p>
                    <p className="text-xs text-muted">
                      Stake {c.stake} · {c.status}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {incoming && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAccept(c.id)}
                          className="px-2 py-1 text-xs rounded-lg bg-accent text-black cursor-pointer hover:opacity-90"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDecline(c.id)}
                          className="px-2 py-1 text-xs rounded-lg border border-border text-muted"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {outgoing && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleCancel(c.id)}
                        className="px-2 py-1 text-xs rounded-lg border border-border text-muted"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="flex gap-1 mb-3">
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2 py-1 text-[10px] rounded-full border cursor-pointer transition-colors ${
                  range === r ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:text-foreground hover:bg-card-hover'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No matches yet</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex justify-between gap-2 p-2.5 rounded-lg border border-border text-xs"
                >
                  <div>
                    <p className="font-medium text-foreground">{h.game_title || h.game_id}</p>
                    <p className="text-muted">
                      {h.result?.toUpperCase()} · stake {h.stake}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${
                      (h.points_delta || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {(h.points_delta || 0) > 0 ? '+' : ''}
                    {h.points_delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'ranks' && (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {ranks.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No rankings yet — win a challenge</p>
          ) : (
            ranks.map((r, i) => (
              <li
                key={r.userId}
                className="flex items-center gap-3 p-2 rounded-lg border border-border"
              >
                <span className="text-xs font-bold text-muted w-5">#{i + 1}</span>
                <ProfileLink username={r.username} className="rounded-full shrink-0">
                  <Avatar src={r.avatar || undefined} alt={r.name} size="sm" userId={r.userId} />
                </ProfileLink>
                <div className="min-w-0 flex-1">
                  <ProfileLink username={r.username} className="text-sm font-medium truncate hover:text-accent block">
                    {r.name}
                  </ProfileLink>
                  <p className="text-[10px] text-muted">
                    {r.wins}W / {r.losses}L · {r.challengesCompleted || r.wins + r.losses} played ·{' '}
                    {r.winRate}%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[10px] font-bold text-amber-500">{r.rank || '—'}</span>
                  <span className="block text-[10px] text-muted">ELO {r.elo ?? 1000}</span>
                  <span className="text-xs text-accent font-semibold">+{r.totalPointsWon}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      {tab === 'live' && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Friends playing now</p>
            {presence.length === 0 ? (
              <p className="text-sm text-muted">No friends in-game</p>
            ) : (
              <ul className="space-y-2">
                {presence.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <ProfileLink username={p.username} className="font-medium text-foreground flex-1 min-w-0 truncate hover:text-accent">
                      {p.name}
                    </ProfileLink>
                    <span className="text-muted text-xs truncate">Playing {p.gameTitle}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOpponentId(p.id);
                        setGameId(p.gameId);
                        setTab('challenge');
                      }}
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-black cursor-pointer hover:opacity-90"
                    >
                      Challenge
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Recent results</p>
            {feed.length === 0 ? (
              <p className="text-sm text-muted">No challenge results yet</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {feed.map((f) => (
                  <li key={f.id} className="text-xs border border-border rounded-lg p-2">
                    <span className="text-foreground font-medium">{f.winnerName}</span>
                    <span className="text-muted"> defeated </span>
                    <span className="text-foreground font-medium">{f.loserName}</span>
                    <span className="text-accent"> +{f.pointsWon}</span>
                    <span className="text-muted"> · {f.gameTitle}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengePanel;
