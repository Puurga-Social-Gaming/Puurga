import { useState, useEffect } from 'react';
import { Trophy, Target, Star } from 'lucide-react';
import api from '../../lib/axios';
import XPBar from '../Progression/XPBar';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  unlocked: boolean;
}

interface Mission {
  id: string;
  mission_type: string;
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  completed: boolean;
  claimed: boolean;
}

interface ProgressionStats {
  total: number;
  unlocked: number;
  percentage: number;
  byCategory: Record<string, { total: number; unlocked: number }>;
}

interface MissionStats {
  todayCompleted: number;
  todayTotal: number;
  todayXPEarned: number;
  totalCompleted: number;
  totalXPEarned: number;
  streak: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social',
  gaming: 'Gaming',
  progression: 'Progression',
  streak: 'Streaks',
  special: 'Special',
};

const CATEGORY_COLORS: Record<string, string> = {
  social: 'text-pink-400 bg-pink-400/10',
  gaming: 'text-blue-400 bg-blue-400/10',
  progression: 'text-purple-400 bg-purple-400/10',
  streak: 'text-orange-400 bg-orange-400/10',
  special: 'text-yellow-400 bg-yellow-400/10',
};

export default function ProgressionSection() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progressionStats, setProgressionStats] = useState<ProgressionStats | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionStats, setMissionStats] = useState<MissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadProgressionData();
  }, []);

  const loadProgressionData = async () => {
    try {
      const [achRes, statsRes, missionsRes, missionStatsRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/achievements/progress'),
        api.get('/achievements/missions'),
        api.get('/achievements/missions/stats'),
      ]);

      setAchievements(achRes.data?.achievements || []);
      setProgressionStats(statsRes.data || null);
      setMissions(missionsRes.data?.missions || []);
      setMissionStats(missionStatsRes.data || null);
    } catch (error) {
      console.error('Failed to load progression data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimMission = async (missionId: string) => {
    setClaimingId(missionId);
    try {
      const res = await api.post(`/achievements/missions/claim/${missionId}`);
      if (res.data?.success) {
        setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
        loadProgressionData();
      }
    } catch (error) {
      console.error('Failed to claim mission:', error);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-1 pb-3 border-b border-border/60">
          <span className="text-accent shrink-0"><Trophy className="w-5 h-5" /></span>
          <h2 className="text-base font-semibold text-foreground">Progression</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-1 pb-3 border-b border-border/60">
        <span className="text-accent shrink-0"><Trophy className="w-5 h-5" /></span>
        <h2 className="text-base font-semibold text-foreground">Progression</h2>
      </div>

      <div className="pt-1 space-y-6">
        {/* XP Progress Bar */}
        <XPBar />

        {/* Progression Stats */}
        {progressionStats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <p className="text-2xl font-bold text-purple-400">{progressionStats.unlocked}</p>
              <p className="text-[10px] text-foreground/60 mt-1">Achievements</p>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-2xl font-bold text-orange-400">{missionStats?.streak || 0}</p>
              <p className="text-[10px] text-foreground/60 mt-1">Day Streak</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-2xl font-bold text-green-400">{missionStats?.todayCompleted || 0}/{missionStats?.todayTotal || 0}</p>
              <p className="text-[10px] text-foreground/60 mt-1">Missions Today</p>
            </div>
          </div>
        )}

        {/* Daily Missions */}
        {missions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-foreground">Daily Missions</h3>
            </div>
            <div className="space-y-2">
              {missions.map(mission => (
                <div key={mission.id} className="flex items-center gap-3 p-3 bg-background-secondary rounded-xl border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{mission.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${mission.completed ? 'bg-green-500' : 'bg-accent'}`}
                          style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-foreground/60 shrink-0">
                        {mission.progress}/{mission.target}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {mission.completed && !mission.claimed ? (
                      <button
                        onClick={() => claimMission(mission.id)}
                        disabled={claimingId === mission.id}
                        className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        {claimingId === mission.id ? '...' : `+${mission.xp_reward} XP`}
                      </button>
                    ) : mission.claimed ? (
                      <span className="text-[10px] text-green-400 font-medium">Claimed</span>
                    ) : (
                      <span className="text-[10px] text-foreground/40">+{mission.xp_reward} XP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-foreground">Achievements</h3>
              <span className="text-[10px] text-foreground/60 ml-auto">
                {progressionStats?.unlocked || 0}/{progressionStats?.total || 0}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(progressionStats?.byCategory || {}).map(([category, stats]) => (
                <div key={category} className="p-3 bg-background-secondary rounded-xl border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] || 'text-gray-400 bg-gray-400/10'}`}>
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <span className="text-[10px] text-foreground/60">{stats.unlocked}/{stats.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {achievements
                      .filter(a => a.category === category)
                      .map(a => (
                        <div
                          key={a.id}
                          className={`group relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                            a.unlocked
                              ? 'bg-accent/10 border border-accent/30 text-foreground'
                              : 'bg-gray-800/50 border border-border/30 text-foreground/40'
                          }`}
                          title={`${a.name}: ${a.description}`}
                        >
                          <span className={a.unlocked ? '' : 'grayscale opacity-50'}>{a.icon}</span>
                          <span className="truncate max-w-[80px]">{a.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
