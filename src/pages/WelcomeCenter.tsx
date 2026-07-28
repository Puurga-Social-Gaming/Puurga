import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Compass, Coins, Gamepad2, Heart, Users, MessageSquare, Bell, Shield,
  Sparkles, Crown, UserCircle, Settings, ChevronDown, ExternalLink,
  Play, BookOpen, Zap, Award, Clock, Globe, Star, Flame,
  Trophy, ArrowRight,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import Avatar from '../components/Avatar';
import { getLevelTitle, getXPForNextLevel, getXPForCurrentLevel } from '../components/Progression/XPBar';

// ─── Glass Card ──────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl ${glow ? 'shadow-lg shadow-purple-500/5' : ''} ${className}`}>
      {glow && <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent opacity-50 pointer-events-none" />}
      {children}
    </div>
  );
}

// ─── Decorative Spiderweb SVG ────────────────────────────────────────────────
function Spiderweb({ className }: { className?: string }) {
  return (
    <svg className={`absolute pointer-events-none opacity-[0.03] ${className}`} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 0V200M0 100H200M30 30L170 170M170 30L30 170" stroke="white" strokeWidth="0.5" />
      <path d="M100 0C100 55.2 55.2 100 0 100" stroke="white" strokeWidth="0.3" />
      <path d="M100 0C100 55.2 144.8 100 200 100" stroke="white" strokeWidth="0.3" />
      <path d="M200 100C144.8 100 100 144.8 100 200" stroke="white" strokeWidth="0.3" />
      <path d="M0 100C55.2 100 100 144.8 100 200" stroke="white" strokeWidth="0.3" />
      <circle cx="100" cy="100" r="3" fill="white" />
    </svg>
  );
}

// ─── Floating Particles ──────────────────────────────────────────────────────
function Particles() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 30],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Earn Card ───────────────────────────────────────────────────────────────
function EarnCard({ icon, title, description, highlights }: { icon: React.ReactNode; title: string; description: string; highlights: string[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <GlassCard>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5" aria-expanded={expanded}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-white/60 text-xs mt-1">{description}</p>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={18} className="text-white/40 mt-1" />
          </motion.div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                    <div className="w-1 h-1 rounded-full bg-purple-400/60 shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </GlassCard>
  );
}

// ─── Game Card ───────────────────────────────────────────────────────────────
function GameCard({ title, description, reward, time, icon, color }: { title: string; description: string; reward: string; time: string; icon: React.ReactNode; color: string }) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <Clock size={10} />
            {time}
          </div>
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/50 mt-1 line-clamp-2">{description}</p>
        <div className="flex items-center gap-1 mt-2">
          <Coins size={12} className="text-yellow-400" />
          <span className="text-[10px] text-yellow-400 font-medium">{reward}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => navigate('/puurga-games')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-medium text-purple-300 transition-all"
          >
            <Play size={12} />
            Play
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/50 transition-all"
          >
            <BookOpen size={12} />
          </button>
        </div>
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-white/5 text-xs text-white/50 leading-relaxed space-y-1">
                <p>Challenge friends. Compete on leaderboards. Earn achievements.</p>
                <p className="text-purple-300/60 text-[10px]">Credits + XP awarded per game.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

// ─── Quick Action ────────────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-purple-500/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
        {icon}
      </div>
      <span className="text-[10px] text-white/60 font-medium text-center leading-tight">{label}</span>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WelcomeCenter() {
  const { user } = useUser();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const credits = user?.credits ?? 0;
  const level = user?.level ?? 1;
  const title = getLevelTitle(level);
  const nextXP = getXPForNextLevel(level);
  const currentXP = getXPForCurrentLevel(level);
  const xp = user?.xp ?? 0;
  const progress = nextXP > currentXP ? ((xp - currentXP) / (nextXP - currentXP)) * 100 : 100;

  const [showCreditsInfo, setShowCreditsInfo] = useState(false);
  const [fogVisible, setFogVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setFogVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // ── Render ──
  return (
    <div className="relative min-h-screen pb-12">
      {/* Decorative background */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent pointer-events-none" />
      <Spiderweb className="top-0 left-0 w-48 h-48" />
      <Spiderweb className="top-0 right-0 w-48 h-48 scale-x-[-1]" />
      <Spiderweb className="bottom-0 left-0 w-48 h-48 scale-y-[-1]" />
      <Spiderweb className="bottom-0 right-0 w-48 h-48 scale-[-1]" />
      <Particles />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/10 via-transparent to-transparent pointer-events-none" />

      {/* Animated fog overlay */}
      <AnimatePresence>
        {fogVisible && !reduced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4 }}
            className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)] pointer-events-none z-50"
          />
        )}
      </AnimatePresence>

      <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-8">
        {/* ─── Header ───────────────────────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-medium">
              <Compass size={12} />
              Welcome Center
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome to Puurga
            </h1>
            <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
              Your adventure begins here. Build friendships, earn rewards, conquer games,
              and become part of one of the most unique social experiences ever created.
            </p>
          </div>
        </motion.div>

        {/* ─── Hero Section ─────────────────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <GlassCard glow>
            <div className="p-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-purple-500/30">
                    <Avatar
                      src={user?.avatar || undefined}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 border-2 border-[#0a0a0a] flex items-center justify-center">
                    <Award size={10} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">
                    Welcome back{user?.name ? ` ${user.name.split(' ')[0]}` : ''}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <Crown size={12} className="text-purple-400" />
                      <span className="text-xs text-purple-300 font-medium">{title}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1.5">
                      <Coins size={12} className="text-yellow-400" />
                      <span className="text-xs text-white/60">{credits} Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/40">Level {level} Progress</span>
                  <span className="text-[10px] text-white/40">{xp} / {nextXP} XP</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                  />
                </div>
              </div>

              {/* Credit CTA */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {credits === 0 ? 'Your first reward is waiting.' : 'Ready to earn even more?'}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {credits === 0
                        ? 'Complete activities to start earning Puurga Credits.'
                        : 'Keep going — more rewards are within reach.'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/puurga-dashboard')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl text-xs font-medium text-white transition-all"
                  >
                    <Coins size={12} />
                    Earn Credits
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 1: What are Credits? ────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Coins size={16} className="text-yellow-400" />
                <h2 className="text-base font-semibold text-white">What are Puurga Credits?</h2>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-3">
                Puurga Credits are the heartbeat of the Puurga universe. Every action you take
                can earn you credits, and credits unlock the platform's most valuable features.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1.5">Earn By</p>
                  <div className="space-y-1">
                    {['Playing games', 'Completing achievements', 'Staying active', 'Helping friends', 'Community participation', 'Seasonal events'].map(item => (
                      <div key={item} className="flex items-center gap-1.5 text-[11px] text-white/60">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/60 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1.5">Spend On</p>
                  <div className="space-y-1">
                    {['Ghost Redemptions', 'Premium features', 'Future cosmetics', 'Special events', 'Unlockables', 'Exclusive content'].map(item => (
                      <div key={item} className="flex items-center gap-1.5 text-[11px] text-white/60">
                        <div className="w-1 h-1 rounded-full bg-purple-400/60 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCreditsInfo(!showCreditsInfo)}
                className="flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ExternalLink size={10} />
                {showCreditsInfo ? 'Show less' : 'Learn more about credits'}
              </button>
              <AnimatePresence>
                {showCreditsInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-white/5 text-xs text-white/50 leading-relaxed space-y-3">
                      <p>Credits are non-transferable and reset only under extreme circumstances. Your credit balance reflects your contribution to the Puurga ecosystem.</p>
                      <p>Higher credit balances unlock access to exclusive features, priority matchmaking, and special recognition across the platform.</p>
                      <p className="text-purple-300/60">The more you engage, the more valuable your presence becomes.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 2: Earn More Credits ────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <GlassCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-yellow-400" />
                <h2 className="text-base font-semibold text-white">Every Action Can Become a Reward</h2>
              </div>
              <p className="text-xs text-white/50 mb-4">
                Engagement isn't just visibility — it's currency. Everything you do on Puurga
                builds toward something greater.
              </p>
              <div className="space-y-3">
                <EarnCard
                  icon={<Gamepad2 size={20} className="text-blue-400" />}
                  title="Play Games"
                  description="Win matches. Complete missions. Challenge friends."
                  highlights={['Earn credits per game played', 'Bonus credits for wins and high scores', 'Complete game-specific achievements', 'Challenge friends for additional rewards']}
                />
                <EarnCard
                  icon={<Heart size={20} className="text-pink-400" />}
                  title="Stay Active"
                  description="Post, comment, react, and support the community."
                  highlights={['Credits for creating posts and comments', 'Bonus for receiving engagement', 'Daily login streaks multiply rewards', 'Higher activity = higher visibility']}
                />
                <EarnCard
                  icon={<Users size={20} className="text-green-400" />}
                  title="Build Friendships"
                  description="Grow your network, help others, unlock social achievements."
                  highlights={['Credits for adding friends', 'Bonus when friends engage with your content', 'Group participation rewards', 'Social achievements grant XP bonuses']}
                />
                <EarnCard
                  icon={<Trophy size={20} className="text-orange-400" />}
                  title="Complete Challenges"
                  description="Daily, weekly, monthly, and seasonal challenges keep things fresh."
                  highlights={['Daily missions refresh every 24 hours', 'Weekly goals for bigger rewards', 'Monthly leaderboard competitions', 'Seasonal events with exclusive prizes']}
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 3: Featured Games ───────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <GlassCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 size={16} className="text-purple-400" />
                <h2 className="text-base font-semibold text-white">Featured Games</h2>
              </div>
              <p className="text-xs text-white/50 mb-4">
                Challenge your friends. Compete on leaderboards. Earn credits and unlock achievements.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GameCard
                  title="Cyber Runner"
                  description="Endless runner through a neon-drenched cyberpunk city."
                  reward="Up to 25 credits per win"
                  time="~3 min"
                  color="bg-cyan-500/10 border border-cyan-500/20"
                  icon={<Gamepad2 size={18} className="text-cyan-400" />}
                />
                <GameCard
                  title="Sword of Judgment"
                  description="Battle through hordes in this action-packed arena fighter."
                  reward="Up to 25 credits per win"
                  time="~5 min"
                  color="bg-red-500/10 border border-red-500/20"
                  icon={<Gamepad2 size={18} className="text-red-400" />}
                />
                <GameCard
                  title="Purga Rift"
                  description="Strategic puzzle game set in a collapsing dimension."
                  reward="Up to 20 credits per win"
                  time="~4 min"
                  color="bg-violet-500/10 border border-violet-500/20"
                  icon={<Gamepad2 size={18} className="text-violet-400" />}
                />
                <GameCard
                  title="Redemption"
                  description="The ultimate ghost survival challenge. Redeem yourself."
                  reward="Up to 30 credits per win"
                  time="~6 min"
                  color="bg-amber-500/10 border border-amber-500/20"
                  icon={<Gamepad2 size={18} className="text-amber-400" />}
                />
              </div>
              <button
                onClick={() => navigate('/puurga-games')}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white/80 transition-all"
              >
                <Gamepad2 size={12} />
                View all games
                <ArrowRight size={12} />
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 4: Stay Active ──────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <GlassCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <ActivityIcon />
                <h2 className="text-base font-semibold text-white">Stay Active</h2>
              </div>
              <p className="text-xs text-white/50 mb-3">
                Every interaction helps your profile grow. Staying active increases your visibility,
                earns you credits, and unlocks future rewards.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Posting', 'Commenting', 'Reacting', 'Sharing', 'Daily streaks', 'Helping others', 'Purging', 'Events'].map(item => (
                  <div key={item} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-white/60">
                    <div className="w-1 h-1 rounded-full bg-purple-400/60 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Sections 5-9: Compact Info ──────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {/* Friends */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-green-400" />
                <h3 className="text-sm font-semibold text-white">Friends</h3>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Friends aren't just followers — they're teammates. Challenge them, chat, join groups,
                and grow together. Help redeem ghosted friends and celebrate victories.
              </p>
              <button onClick={() => navigate('/profile')} className="mt-2 text-[10px] text-green-400 hover:text-green-300 transition-colors">View friends →</button>
            </div>
          </GlassCard>

          {/* Conversations */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={14} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Conversations</h3>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Stay connected with private messaging, real-time chat, typing indicators, and media sharing.
                Never miss important conversations.
              </p>
              <button onClick={() => navigate('/messages')} className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Open messages →</button>
            </div>
          </GlassCard>

          {/* Notifications */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={14} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Friend requests, game invites, achievement unlocks, comments, replies, credit rewards — stay informed.
              </p>
              <button onClick={() => navigate('/notifications')} className="mt-2 text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors">Check notifications →</button>
            </div>
          </GlassCard>

          {/* Groups */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Groups</h3>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Join communities, create your own, meet people with similar interests, organize events, and compete together.
              </p>
              <button onClick={() => navigate('/groups')} className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">Explore groups →</button>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 9: Premium ──────────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <GlassCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-amber-400" />
                <h2 className="text-base font-semibold text-white">Premium</h2>
              </div>
              <p className="text-xs text-white/50 mb-3">
                Unlock the full Puurga experience with priority features, exclusive cosmetics,
                early access to new content, and a Premium badge that sets you apart.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Priority features', 'Exclusive cosmetics', 'Early access', 'Special rewards', 'Premium badge', 'Exclusive events'].map(item => (
                  <div key={item} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/80">
                    <Star size={10} className="text-amber-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Section 10: Daily Reminder ──────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <GlassCard glow>
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-3">
                <Flame size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Don't Disappear...</h2>
              <p className="text-xs text-white/50 max-w-md mx-auto mt-1 leading-relaxed">
                Come back often to keep your streak alive, discover new adventures, collect rewards,
                and stay connected with your friends.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4 text-[10px] text-white/40">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400/60" />
                  After 24h — We'll miss you
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
                  After 7d — We might knock...
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400/60" />
                  After 30d — Where have you gone?
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Quick Actions ───────────────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <GlassCard>
            <div className="p-5">
              <h2 className="text-base font-semibold text-white mb-3">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-2">
                <QuickAction icon={<UserCircle size={18} className="text-purple-400" />} label="Edit Profile" onClick={() => navigate('/profile')} />
                <QuickAction icon={<Gamepad2 size={18} className="text-blue-400" />} label="Play Games" onClick={() => navigate('/puurga-games')} />
                <QuickAction icon={<Settings size={18} className="text-gray-400" />} label="Settings" onClick={() => navigate('/settings')} />
                <QuickAction icon={<Users size={18} className="text-green-400" />} label="Groups" onClick={() => navigate('/groups')} />
                <QuickAction icon={<Users size={18} className="text-indigo-400" />} label="Friends" onClick={() => navigate('/profile')} />
                <QuickAction icon={<MessageSquare size={18} className="text-cyan-400" />} label="Messages" onClick={() => navigate('/messages')} />
                <QuickAction icon={<Bell size={18} className="text-yellow-400" />} label="Alerts" onClick={() => navigate('/notifications')} />
                <QuickAction icon={<Compass size={18} className="text-pink-400" />} label="Dashboard" onClick={() => navigate('/puurga-dashboard')} />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Veypai AI Assistant ─────────────────────────────── */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <GlassCard glow>
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Meet Veypai</h2>
              <p className="text-[10px] text-purple-400 font-medium uppercase tracking-widest mt-1">Your Intelligent Guide</p>
              <p className="text-xs text-white/50 max-w-md mx-auto mt-3 leading-relaxed">
                Ask anything. Need help? Want game advice? Curious about Credits? Looking for groups?
                Veypai is always ready to guide you through the Puurga universe.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {['Need help?', 'Game advice', 'About Credits', 'Find groups', 'Account help', 'Plan your next move'].map(item => (
                  <span key={item} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/50">
                    {item}
                  </span>
                ))}
              </div>
              <button className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all">
                <Sparkles size={16} />
                Talk to Veypai
              </button>
              <p className="text-[9px] text-white/30 mt-3">
                Powered by Puurga AI — Future integration with the Navigation Agent
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
