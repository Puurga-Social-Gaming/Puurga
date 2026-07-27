// @ts-nocheck
// Pasted game module — types checked at IntegratedGameShell boundary only.
import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Sword, Zap, Heart, Sparkles, Coins, Trophy, User, ShoppingBag, 
  Compass, Skull, RefreshCw, Flame, Award, Play, AlertTriangle, ArrowRight,
  Info, Volume2, VolumeX, Crosshair, ZapOff, CheckCircle2, ChevronRight, Target
} from 'lucide-react';
import { useCredits } from '../../hooks/useCredits';

const ZONES_CONFIG = {
  1: { name: 'Boot Sector (Phase 1)', theme: '#06b6d4', bg: ['#020813', '#051833'], enemyProb: 0.15 },
  2: { name: 'Broken Network (Phase 2)', theme: '#a855f7', bg: ['#0b0413', '#240a3a'], enemyProb: 0.35 },
  3: { name: 'Data Wasteland (Phase 3)', theme: '#f97316', bg: ['#120803', '#2e1204'], enemyProb: 0.50 },
  4: { name: 'Ghost Realm (Phase 4)', theme: '#22c55e', bg: ['#020c02', '#092b09'], enemyProb: 0.65 },
  5: { name: 'Core Nexus (Phase 5)', theme: '#ef4444', bg: ['#170202', '#3e0606'], enemyProb: 0.85 }
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  playSlash() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playHit() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }

  playCoin() {
    if (this.muted) return;
    this.init();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime); 
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.07); 
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.25);
      osc2.start(this.ctx.currentTime + 0.07);
      osc2.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  playGhost() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.6);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  playPhaseUp() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {}
  }
}

const sfx = new SoundEngine();

/** Mobile-friendly camera + floor layout from canvas size */
function syncRunnerLayout(state, canvasW, canvasH) {
  state.viewW = canvasW;
  state.viewH = canvasH;
  state.floorY = Math.floor(canvasH * 0.74);
  state.pitY = canvasH + 80;
  state.playerScreenX = Math.max(56, Math.min(160, canvasW * 0.16));
  state.spawnAhead = Math.max(380, canvasW * 1.35);
  state.worldScale = Math.max(0.55, Math.min(1.15, canvasH / 640));
  return state;
}

export default function App() {
  const { balance, addCredits, spendCredits, mergeLocalCredits } = useCredits();
  const [screen, setScreen] = useState('menu'); 
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('purga_credits');
    return saved ? parseInt(saved) : 1200;
  });
  const [purgaPoints, setPurgaPoints] = useState(() => {
    const saved = localStorage.getItem('purga_points');
    return saved ? parseInt(saved) : 450;
  });
  const [isMuted, setIsMuted] = useState(false);

  // One-time migration: merge localStorage credits into unified economy
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    if (migrated) return;
    const localCredits = parseInt(localStorage.getItem('purga_credits') || '0');
    const localPoints = parseInt(localStorage.getItem('purga_points') || '0');
    const totalLocal = localCredits + localPoints;
    if (totalLocal > 0) {
      mergeLocalCredits(totalLocal, 'cyber_runner').then(() => {
        localStorage.removeItem('purga_credits');
        localStorage.removeItem('purga_points');
        setMigrated(true);
      });
    } else {
      setMigrated(true);
    }
  }, [migrated, mergeLocalCredits]);

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('purga_stats');
    return saved ? JSON.parse(saved) : { speed: 1, strength: 1, health: 1, luck: 1 };
  });

  const [gear, setGear] = useState(() => {
    const saved = localStorage.getItem('purga_gear');
    return saved ? JSON.parse(saved) : { boots: 'None', gloves: 'None', armor: 'None', artifact: 'None' };
  });

  const [ownedSkins, setOwnedSkins] = useState(() => {
    const saved = localStorage.getItem('purga_owned_skins');
    return saved ? JSON.parse(saved) : ['Default'];
  });
  const [equippedSkin, setEquippedSkin] = useState(() => {
    return localStorage.getItem('purga_equipped_skin') || 'Default';
  });
  const [ownedTrails, setOwnedTrails] = useState(() => {
    const saved = localStorage.getItem('purga_owned_trails');
    return saved ? JSON.parse(saved) : ['Orange Neon'];
  });
  const [equippedTrail, setEquippedTrail] = useState(() => {
    return localStorage.getItem('purga_equipped_trail') || 'Orange Neon';
  });

  const [runSummary, setRunSummary] = useState({
    distance: 0,
    creditsCollected: 0,
    enemiesKilled: 0,
    maxCombo: 0,
    ascendedFloor: 1,
    rewardsClaimed: false,
    reason: 'Fell in Pit'
  });

  const [dailyChallenges, setDailyChallenges] = useState(() => {
    const saved = localStorage.getItem('purga_daily_challenges');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Slice down 10 system crawlers', target: 10, current: 0, reward: 250, claimed: false },
      { id: 2, text: 'Ascend beyond 1,500 meters', target: 1500, current: 0, reward: 350, claimed: false },
      { id: 3, text: 'Unleash Ghost Invincibility Mode', target: 1, current: 0, reward: 200, claimed: false }
    ];
  });

  const saveUserData = (updatedCredits = credits, updatedPoints = purgaPoints, updatedStats = stats, updatedGear = gear, updatedSkins = ownedSkins, activeSkin = equippedSkin, updatedTrails = ownedTrails, activeTrail = equippedTrail) => {
    // Credits now managed by unified economy — don't write to localStorage
    // localStorage.setItem('purga_credits', updatedCredits);
    // localStorage.setItem('purga_points', updatedPoints);
    localStorage.setItem('purga_stats', JSON.stringify(updatedStats));
    localStorage.setItem('purga_gear', JSON.stringify(updatedGear));
    localStorage.setItem('purga_owned_skins', JSON.stringify(updatedSkins));
    localStorage.setItem('purga_equipped_skin', activeSkin);
    localStorage.setItem('purga_owned_trails', JSON.stringify(updatedTrails));
    localStorage.setItem('purga_equipped_trail', activeTrail);
  };

  const handleMuteToggle = () => {
    sfx.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    localStorage.setItem('purga_daily_challenges', JSON.stringify(dailyChallenges));
  }, [dailyChallenges]);

  const isPlaying = screen === 'playing';

  return (
    <div className="h-full min-h-0 bg-neutral-950 text-white flex flex-col font-sans selection:bg-orange-500 selection:text-black overflow-hidden pt-14">
      {/* Top Header Bar — hidden during run so the arena uses full viewport */}
      {!isPlaying && (
      <header className="shrink-0 border-b border-orange-500/10 bg-neutral-900/60 backdrop-blur-md z-50 px-3 sm:px-3 sm:px-4 py-1.5 sm:py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setScreen('menu')}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gradient-to-tr from-orange-600 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 text-black" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-400 to-orange-500">
              Purga <span className="text-sm font-light text-orange-500">Shadow Runner v2</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Tactical Stickman Slicing Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-neutral-900 px-2 sm:px-2.5 sm:px-3 py-0.5 sm:py-1 sm:py-1.5 rounded border border-orange-500/20">
              <Coins className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-mono font-bold text-orange-300">{credits}</span>
              <span className="text-[10px] text-neutral-400 ml-1">Credits</span>
            </div>
            <div className="flex items-center space-x-1 bg-neutral-900 px-2 sm:px-2.5 sm:px-3 py-0.5 sm:py-1 sm:py-1.5 rounded border border-neutral-700">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-mono font-bold text-cyan-300">{purgaPoints}</span>
              <span className="text-[10px] text-neutral-400 ml-1">Points</span>
            </div>
          </div>

          <button 
            onClick={handleMuteToggle} 
            className="p-1.5 sm:p-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </header>
      )}

      {/* Primary Dynamic Container */}
      <main className={`flex-1 min-h-0 flex flex-col relative ${isPlaying ? 'overflow-hidden' : 'integrated-game-scroll'}`}>
        {screen === 'menu' && (
          <MainMenu 
            setScreen={setScreen} 
            stats={stats} 
            credits={credits} 
            purgaPoints={purgaPoints}
            equippedSkin={equippedSkin}
          />
        )}

        {screen === 'playing' && (
          <GameArena 
            setScreen={setScreen} 
            stats={stats} 
            gear={gear}
            equippedSkin={equippedSkin}
            equippedTrail={equippedTrail}
            setCredits={setCredits}
            setPurgaPoints={setPurgaPoints}
            setRunSummary={setRunSummary}
            credits={credits}
            purgaPoints={purgaPoints}
            saveUserData={saveUserData}
            dailyChallenges={dailyChallenges}
            setDailyChallenges={setDailyChallenges}
          />
        )}

        {screen === 'upgrades' && (
          <UpgradesScreen 
            setScreen={setScreen} 
            stats={stats} 
            setStats={setStats}
            gear={gear}
            setGear={setGear}
            credits={credits}
            setCredits={setCredits}
            saveUserData={saveUserData}
          />
        )}

        {screen === 'cosmetics' && (
          <CosmeticsScreen 
            setScreen={setScreen} 
            credits={credits}
            setCredits={setCredits}
            ownedSkins={ownedSkins}
            setOwnedSkins={setOwnedSkins}
            equippedSkin={equippedSkin}
            setEquippedSkin={setEquippedSkin}
            ownedTrails={ownedTrails}
            setOwnedTrails={setOwnedTrails}
            equippedTrail={equippedTrail}
            setEquippedTrail={setEquippedTrail}
            saveUserData={saveUserData}
          />
        )}

        {screen === 'challenges' && (
          <ChallengesScreen 
            setScreen={setScreen} 
            dailyChallenges={dailyChallenges}
            setDailyChallenges={setDailyChallenges}
            setCredits={setCredits}
            saveUserData={saveUserData}
          />
        )}

        {screen === 'gameover' && (
          <GameOverScreen 
            setScreen={setScreen} 
            runSummary={runSummary}
            credits={credits}
            setCredits={setCredits}
            purgaPoints={purgaPoints}
            setPurgaPoints={setPurgaPoints}
            saveUserData={saveUserData}
          />
        )}
      </main>

    </div>
  );
}

function MainMenu({ setScreen, stats, credits, purgaPoints, equippedSkin }) {
  return (
    <div className="flex-grow max-w-6xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 flex flex-col justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>Gradual Phase Progression Enabled</span>
          </div>

          <h2 className="text-3xl sm:text-6xl font-black tracking-tight leading-none uppercase">
            RUN. COMBAT. <br/>
            <span className="text-orange-500 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300">
              SURVIVE & ASCEND.
            </span>
          </h2>

          <p className="text-neutral-400 text-base max-w-lg leading-relaxed">
            Take command of an agile vector stickman runner. Start in the calm Boot Sector and survive progressive, faster overclocking network phases. Execute double jumps, slides, and neon slashes to secure your run!
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={() => { sfx.playJump(); setScreen('playing'); }}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-extrabold text-base sm:text-lg uppercase tracking-wider rounded-lg shadow-xl shadow-orange-500/25 transform active:scale-95 transition-all flex items-center space-x-3 animate-pulse"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black stroke-black" />
              <span>LAUNCH RUN</span>
            </button>

            <button 
              onClick={() => { sfx.playCoin(); setScreen('upgrades'); }}
              className="px-5 sm:px-6 py-3 sm:py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-orange-500/30 text-white font-bold rounded-lg transition-all flex items-center space-x-2"
            >
              <Shield className="w-5 h-5 text-orange-500" />
              <span>Cyber Tech Labs</span>
            </button>
          </div>

          <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 flex items-center space-x-3 text-xs text-neutral-400 max-w-md">
            <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p><strong>Controls Schema:</strong> [Space/Up Arrow] - Jump, [S/Down Arrow] - Slide Under High Lasers, [J] - Strike/Neon Sword. Perfectly tuned dynamic virtual gamepad included below!</p>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 p-4 sm:p-5 rounded-xl border border-neutral-800 hover:border-orange-500/20 transition-all col-span-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 font-bold">
                <User className="w-4 h-4 text-orange-500" /> Cyber-Runner Diagnostics
              </span>
              <span className="text-[10px] text-orange-500 font-mono">ACTIVE: {equippedSkin}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-neutral-900/80 p-2 sm:p-2.5 rounded border border-neutral-800">
                <p className="text-xs text-neutral-500">Agility Speed</p>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1 text-orange-300">
                  <Zap className="w-3.5 h-3.5" /> Lvl {stats.speed}
                </div>
              </div>
              <div className="bg-neutral-900/80 p-2 sm:p-2.5 rounded border border-neutral-800">
                <p className="text-xs text-neutral-500">Blade Strength</p>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1 text-orange-300">
                  <Sword className="w-3.5 h-3.5" /> Lvl {stats.strength}
                </div>
              </div>
              <div className="bg-neutral-900/80 p-2 sm:p-2.5 rounded border border-neutral-800">
                <p className="text-xs text-neutral-500">Integrity Shield</p>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1 text-orange-300">
                  <Heart className="w-3.5 h-3.5" /> Lvl {stats.health}
                </div>
              </div>
              <div className="bg-neutral-900/80 p-2 sm:p-2.5 rounded border border-neutral-800">
                <p className="text-xs text-neutral-500">Solder Luck</p>
                <div className="flex items-center gap-1.5 font-mono font-bold mt-1 text-orange-300">
                  <Sparkles className="w-3.5 h-3.5" /> Lvl {stats.luck}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { sfx.playCoin(); setScreen('cosmetics'); }}
            className="group bg-neutral-900 hover:bg-neutral-800/80 p-4 rounded-xl border border-neutral-800 hover:border-orange-500/30 text-left transition-all"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <h4 className="font-bold text-sm">Cosmetic Store</h4>
            <p className="text-xs text-neutral-400 mt-1">Unlock rare neon skins and custom sword swings.</p>
          </button>

          <button 
            onClick={() => { sfx.playCoin(); setScreen('challenges'); }}
            className="group bg-neutral-900 hover:bg-neutral-800/80 p-4 rounded-xl border border-neutral-800 hover:border-orange-500/30 text-left transition-all"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5 text-orange-500" />
            </div>
            <h4 className="font-bold text-sm">Challenges</h4>
            <p className="text-xs text-neutral-400 mt-1">Check system milestones for credit bonuses.</p>
          </button>



        </div>
      </div>
    </div>
  );
}

function GameArena({ 
  setScreen, stats, gear, equippedSkin, equippedTrail, 
  setCredits, setPurgaPoints, setRunSummary, credits, purgaPoints, saveUserData,
  dailyChallenges, setDailyChallenges
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // HUD state connections
  const [hudHp, setHudHp] = useState(100);
  const [hudMaxHp, setHudMaxHp] = useState(100);
  const [hudCredits, setHudCredits] = useState(0);
  const [hudDistance, setHudDistance] = useState(0);
  const [hudCombo, setHudCombo] = useState(1);
  const [hudGhostPercent, setHudGhostPercent] = useState(100);
  const [hudAlert, setHudAlert] = useState(null);
  const [showExitChoice, setShowExitChoice] = useState(false);

  // Phase tracker display states
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseBumperText, setPhaseBumperText] = useState(null);

  // References to bypass React render latencies inside the high-performance 60fps canvas loop
  const gameStateRef = useRef({
    running: true,
    player: null,
    enemies: [],
    projectiles: [],
    particles: [],
    platforms: [],
    lasers: [],
    coins: [],
    gates: [],
    hazards: [], 
    cameraX: 0,
    distanceRun: 0,
    creditsCollected: 0,
    enemiesKilled: 0,
    maxCombo: 1,
    comboMultiplier: 1,
    comboTimer: 0,
    zone: 1,
    phase: 1,
    keys: {},
    screenShake: 0,
    slowMoFactor: 1,
    timeSinceLastGhostUse: 30,
    ghostActive: false,
    ghostDurationRemaining: 0,
    glitchWallX: -1500, // Starts significantly further back so Phase 1 is stress-free
    glitchSpeed: 1.5,   // Slow baseline speed for Phase 1
    baseAgilitySpeed: 4.8, // Baseline running physics
    viewW: 800,
    viewH: 600,
    floorY: 440,
    pitY: 680,
    playerScreenX: 120,
    spawnAhead: 1000,
    worldScale: 1,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = e.code;
      gameStateRef.current.keys[code] = true;
      if (['ArrowUp', 'ArrowDown', 'Space', 'KeyS', 'KeyW'].includes(code)) {
        e.preventDefault();
      }
      if (code === 'KeyJ') {
        triggerPlayerAttack();
      }
    };

    const handleKeyUp = (e) => {
      gameStateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [equippedTrail]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const playArea = containerRef.current?.querySelector('[data-runner-playfield]');
      const rect = (playArea || containerRef.current).getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      syncRunnerLayout(gameStateRef.current, rect.width, rect.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Dynamic stats computations
    const initialAgility = 4.8 + stats.speed * 0.35; // Calibrated starting speed
    const dmgStrength = 25 + stats.strength * 8;
    const maxIntegrity = 100 + stats.health * 15;
    const luckBonus = stats.luck * 0.15;

    setHudMaxHp(maxIntegrity);
    setHudHp(maxIntegrity);

    const layout = gameStateRef.current;
    const floorY = layout.floorY;
    const platH = layout.viewH - floorY;
    const pH = Math.round(70 * layout.worldScale);
    const pW = Math.round(40 * layout.worldScale);

    // Stickman realistic structural setup
    gameStateRef.current.player = {
      x: 200,
      y: floorY - pH,
      vx: 0,
      vy: 0,
      width: pW,
      height: pH,
      speed: initialAgility,
      strength: dmgStrength,
      maxHp: maxIntegrity,
      hp: maxIntegrity,
      luck: luckBonus,
      isGrounded: false,
      state: 'run', 
      animFrame: 0,
      doubleJumpsLeft: 1,
      slashTimer: 0,
      invincibilityTimer: 0,
      scarfPoints: Array.from({ length: 8 }, () => ({ x: 200, y: 150 }))
    };

    // Safe, large starter platforms to begin with (Zero hazards initially)
    gameStateRef.current.platforms = [
      { x: 0, y: floorY, width: 1200, height: platH },
      { x: 1300, y: floorY - 20, width: 1000, height: platH + 20 }
    ];

    // Gentle introduction enemies
    gameStateRef.current.enemies = [
      { x: 700, y: floorY - 60, width: 35, height: 60, hp: 40, maxHp: 40, type: 'crawler', speed: -1.0, animFrame: 0, color: '#06b6d4' },
      { x: 1600, y: floorY - 75, width: 35, height: 60, hp: 45, maxHp: 45, type: 'crawler', speed: -1.2, animFrame: 0, color: '#06b6d4' }
    ];

    gameStateRef.current.coins = [
      { x: 500, y: floorY - 80, collected: false, value: 10 },
      { x: 900, y: floorY - 100, collected: false, value: 10 },
      { x: 1400, y: floorY - 120, collected: false, value: 15 }
    ];

    gameStateRef.current.lasers = [];
    gameStateRef.current.hazards = [];
    gameStateRef.current.gates = [];

    let lastTime = performance.now();
    let animId;

    const gameLoop = (time) => {
      let dt = (time - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; 
      lastTime = time;

      if (gameStateRef.current.running) {
        updateGame(dt);
        renderGame(ctx, canvas);
      }
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [stats]);

  const updateGame = (dt) => {
    const state = gameStateRef.current;
    const player = state.player;
    if (!player) return;

    const actualDt = dt * state.slowMoFactor;

    // Scroll Camera — player sits ~16% from left on mobile for much more lookahead
    const leadX = state.playerScreenX || Math.max(56, state.viewW * 0.16);
    state.cameraX += (player.x - state.cameraX - leadX) * 0.1;
    state.distanceRun = Math.floor(player.x / 10);
    setHudDistance(state.distanceRun);

    // Dynamic Phase Progression Calculations
    let detectedPhase = 1;
    if (state.distanceRun >= 2800) {
      detectedPhase = 5;
    } else if (state.distanceRun >= 1800) {
      detectedPhase = 4;
    } else if (state.distanceRun >= 1000) {
      detectedPhase = 3;
    } else if (state.distanceRun >= 400) {
      detectedPhase = 2;
    }

    // Trigger Phase change effects & alerts
    if (detectedPhase !== state.phase) {
      state.phase = detectedPhase;
      state.zone = detectedPhase; // Maps visual colors to current phase
      setCurrentPhase(detectedPhase);
      sfx.playPhaseUp();

      // Spawn bright visual banner trigger
      setPhaseBumperText(`PHASE ${detectedPhase} ACTIVATED: SPEED & HAZARDS INCREASED!`);
      setTimeout(() => {
        setPhaseBumperText(null);
      }, 3000);
    }

    // Phase Parameter Scaling (Gradually ramping difficulty)
    let runSpeedMultiplier = 1.0;
    let glitchChaserBaseSpeed = 1.2;

    switch (state.phase) {
      case 1:
        runSpeedMultiplier = 1.0; 
        glitchChaserBaseSpeed = 1.4;
        break;
      case 2:
        runSpeedMultiplier = 1.12; 
        glitchChaserBaseSpeed = 2.4;
        break;
      case 3:
        runSpeedMultiplier = 1.25; 
        glitchChaserBaseSpeed = 3.6;
        break;
      case 4:
        runSpeedMultiplier = 1.40; 
        glitchChaserBaseSpeed = 4.8;
        break;
      case 5:
        // Infinite scaling difficulty past phase 4
        const excess = (state.distanceRun - 2800) / 1000;
        runSpeedMultiplier = 1.50 + (excess * 0.1); 
        glitchChaserBaseSpeed = 6.0 + (excess * 0.8);
        break;
    }

    // Apply scaling speeds
    const currentFrameSpeed = (4.8 + stats.speed * 0.35) * runSpeedMultiplier;
    player.speed = currentFrameSpeed;

    // Handle pursuing Glitch Wall
    state.glitchSpeed = glitchChaserBaseSpeed;
    state.glitchWallX += state.glitchSpeed * 60 * actualDt;

    // Damage if caught inside Glitch wall
    if (player.x < state.glitchWallX) {
      player.hp -= 200 * actualDt; 
      setHudHp(Math.max(0, player.hp));
      state.screenShake = 15;
      if (player.hp <= 0) {
        endRun('Consumed by Glitch Firewall');
        return;
      }
    }

    // Warning alert systems
    if (player.x - state.glitchWallX < 320) {
      setHudAlert("WARNING: FIREWALL REACHING COMPROMISING THRESHOLD!");
    } else {
      setHudAlert(null);
    }

    // Combo timers
    if (state.comboTimer > 0) {
      state.comboTimer -= actualDt;
      if (state.comboTimer <= 0) {
        state.comboMultiplier = 1;
        setHudCombo(1);
      }
    }

    // Ghost cooldown recharge
    if (state.timeSinceLastGhostUse < 30) {
      state.timeSinceLastGhostUse += actualDt;
      setHudGhostPercent(Math.min(100, (state.timeSinceLastGhostUse / 30) * 100));
    }

    // Ghost duration countdown
    if (state.ghostActive) {
      state.ghostDurationRemaining -= actualDt;
      if (state.ghostDurationRemaining <= 0) {
        state.ghostActive = false;
      }
    }

    // Movement & mechanics input processing
    let targetVx = player.speed;

    if (state.keys['ArrowRight'] || state.keys['KeyD']) {
      targetVx += player.speed * 0.35;
    }
    if (state.keys['ArrowLeft'] || state.keys['KeyA']) {
      targetVx -= player.speed * 0.5;
    }

    // Jump
    if ((state.keys['ArrowUp'] || state.keys['Space']) && player.isGrounded) {
      player.vy = -16.0;
      player.isGrounded = false;
      player.state = 'jump';
      sfx.playJump();
      state.keys['ArrowUp'] = false;
      state.keys['Space'] = false;
    } 
    // Double Jump
    else if ((state.keys['ArrowUp'] || state.keys['Space']) && player.doubleJumpsLeft > 0) {
      player.vy = -13.5;
      player.doubleJumpsLeft = 0;
      sfx.playJump();
      state.keys['ArrowUp'] = false;
      state.keys['Space'] = false;

      // Double jump dust particles
      for (let i = 0; i < 6; i++) {
        state.particles.push({
          x: player.x,
          y: player.y + player.height,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 4 + 2,
          color: '#06b6d4',
          life: 0.4
        });
      }
    }

    // Slides
    const standH = Math.round(70 * (state.worldScale || 1));
    const slideH = Math.round(36 * (state.worldScale || 1));
    if (state.keys['ArrowDown'] || state.keys['KeyS']) {
      player.state = 'slide';
      player.height = slideH; 
    } else {
      player.height = standH; 
    }

    if (player.slashTimer > 0) {
      player.slashTimer -= actualDt;
      player.state = 'slash';
    } else if (player.state === 'slash') {
      player.state = player.isGrounded ? 'run' : 'jump';
    }

    if (player.invincibilityTimer > 0) {
      player.invincibilityTimer -= actualDt;
    }

    player.vx = targetVx;
    player.vy += 32 * actualDt; // Dynamic Gravity

    // Calculate Coordinates
    player.x += player.vx * 60 * actualDt;
    player.y += player.vy * 60 * actualDt;

    player.animFrame += actualDt * 12;

    // Scarf physics trace mapping
    let scarfAttachX = player.x - 2;
    let scarfAttachY = player.y + (player.state === 'slide' ? 12 : 18);
    player.scarfPoints[0] = { x: scarfAttachX, y: scarfAttachY };
    for (let i = 1; i < player.scarfPoints.length; i++) {
      let p = player.scarfPoints[i];
      let targetX = player.scarfPoints[i - 1].x - 8 - (player.vx * 0.4);
      let targetY = player.scarfPoints[i - 1].y + (Math.sin(player.animFrame + i) * 1.5);
      p.x += (targetX - p.x) * 0.35;
      p.y += (targetY - p.y) * 0.35;
    }

    if (player.y > (state.pitY || state.viewH + 80)) {
      endRun('Fell in Bottomless Pit');
      return;
    }

    player.isGrounded = false;

    // Collisions check with Platform edges
    state.platforms.forEach(p => {
      if (player.x + player.width > p.x && player.x < p.x + p.width) {
        if (player.y + player.height >= p.y && player.y + player.height - player.vy <= p.y + 18) {
          player.y = p.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
          player.doubleJumpsLeft = 1;
        }
      }
    });

    const viewportLimit = state.cameraX + (state.spawnAhead || state.viewW * 1.35);
    const lastPlat = state.platforms[state.platforms.length - 1];
    const floorY = state.floorY || state.viewH * 0.74;

    if (lastPlat && lastPlat.x + lastPlat.width < viewportLimit) {
      // Scale gap width and platform sizes dynamically based on Phase
      let gapWidth = Math.random() * 50 + 50; // Phase 1 baseline very easy
      let nextPlatWidth = Math.random() * 500 + 500; // Big and safe

      let spawnSpikesProb = 0.0;
      let spawnLasersProb = 0.0;
      let spawnEnemiesProb = 0.15;

      if (state.phase === 2) {
        gapWidth = Math.random() * 80 + 70;
        nextPlatWidth = Math.random() * 450 + 400;
        spawnSpikesProb = 0.18;
        spawnLasersProb = 0.12;
        spawnEnemiesProb = 0.35;
      } else if (state.phase === 3) {
        gapWidth = Math.random() * 110 + 90;
        nextPlatWidth = Math.random() * 400 + 350;
        spawnSpikesProb = 0.30;
        spawnLasersProb = 0.22;
        spawnEnemiesProb = 0.50;
      } else if (state.phase >= 4) {
        gapWidth = Math.random() * 140 + 110;
        nextPlatWidth = Math.random() * 320 + 300;
        spawnSpikesProb = 0.45;
        spawnLasersProb = 0.35;
        spawnEnemiesProb = 0.65;
      }

      const nextPlatY = Math.min(floorY + 40, Math.max(floorY - 140, lastPlat.y + (Math.random() - 0.5) * 90));
      const newPlat = {
        x: lastPlat.x + lastPlat.width + gapWidth,
        y: nextPlatY,
        width: nextPlatWidth,
        height: 200
      };

      state.platforms.push(newPlat);

      // Populate elements progressively
      const segmentsCount = Math.floor(nextPlatWidth / 140);
      for (let s = 1; s < segmentsCount; s++) {
        const itemX = newPlat.x + s * 140;

        // Collectable Puurga Credits
        if (Math.random() < 0.65) {
          state.coins.push({ x: itemX, y: nextPlatY - 45, collected: false, value: 10 });
        }

        // Hazards Spikes (Skip entirely during Phase 1 for friendly entry onboarding)
        if (state.phase > 1 && Math.random() < spawnSpikesProb) {
          state.hazards.push({ x: itemX + 30, y: nextPlatY - 15, width: 35, height: 15 });
        }

        // Hostiles (Gentler spawn counts early)
        if (Math.random() < spawnEnemiesProb) {
          const randType = Math.random();
          let eType = 'crawler';
          let eHp = 40;
          let color = '#06b6d4';
          let customHeight = 60;

          if (state.phase > 2 && randType > 0.8) {
            eType = 'titan';
            eHp = 100;
            color = '#ef4444';
            customHeight = 75;
          } else if (state.phase > 1 && randType > 0.45) {
            eType = 'hunter';
            eHp = 60;
            color = '#f59e0b';
            customHeight = 60;
          }

          state.enemies.push({
            x: itemX,
            y: nextPlatY - customHeight,
            width: eType === 'titan' ? 42 : 32,
            height: customHeight,
            hp: eHp,
            maxHp: eHp,
            type: eType,
            speed: eType === 'hunter' ? -2.0 : eType === 'crawler' ? -1.4 : -0.7,
            animFrame: 0,
            color: color
          });
        }

        // Overhead High Lasers (Slide prompts)
        if (state.phase > 1 && Math.random() < spawnLasersProb) {
          state.lasers.push({
            x: itemX + 50,
            y: nextPlatY - 120,
            width: 15,
            height: 90
          });
        }
      }

      // Safe Escape Portals
      if (Math.random() < 0.15 && state.distanceRun > 500) {
        state.gates.push({
          x: newPlat.x + nextPlatWidth - 70,
          y: nextPlatY - 80,
          width: 45,
          height: 80,
          active: true
        });
      }
    }

    // Spikes Collisions
    state.hazards.forEach(hazard => {
      if (checkAABB(player, hazard) && player.invincibilityTimer <= 0) {
        player.hp -= 20;
        player.invincibilityTimer = 0.6;
        setHudHp(Math.max(0, player.hp));
        sfx.playHit();
        state.screenShake = 12;

        if (player.hp <= 0) {
          endRun('Pierced by Floor Spikes');
        }
      }
    });

    // Enemies Combat & Slashing physics
    state.enemies.forEach(enemy => {
      enemy.animFrame += actualDt * 8;
      enemy.x += enemy.speed;

      if (player.state === 'slash' && checkAABB(player, enemy)) {
        enemy.hp -= player.strength;
        sfx.playHit();
        state.screenShake = 10;

        // Flying floating damage counters
        state.particles.push({
          x: enemy.x,
          y: enemy.y - 15,
          vx: (Math.random() - 0.5) * 4,
          vy: -5,
          isText: true,
          text: `-${player.strength}`,
          color: '#f97316',
          life: 0.5
        });

        if (enemy.hp <= 0) {
          state.enemiesKilled++;
          state.comboMultiplier++;
          state.comboTimer = 4.0;
          setHudCombo(state.comboMultiplier);
          if (state.comboMultiplier > state.maxCombo) {
            state.maxCombo = state.comboMultiplier;
          }

          state.slowMoFactor = 0.12;
          setTimeout(() => { state.slowMoFactor = 1.0; }, 180);

          for (let i = 0; i < 12; i++) {
            state.particles.push({
              x: enemy.x + 15,
              y: enemy.y + 25,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              size: Math.random() * 4 + 2,
              color: '#ef4444',
              life: 0.5
            });
          }
        }
      }

      if (checkAABB(player, enemy) && player.invincibilityTimer <= 0 && player.state !== 'slash') {
        const dmg = enemy.type === 'titan' ? 30 : 15;
        player.hp -= dmg;
        player.invincibilityTimer = 0.8;
        state.screenShake = 14;
        setHudHp(Math.max(0, player.hp));
        sfx.playHit();

        if (player.hp <= 0) {
          endRun('Defeated by ' + enemy.type.toUpperCase());
        }
      }
    });

    // Lasers Collisions
    state.lasers.forEach(laser => {
      if (checkAABB(player, laser)) {
        if (player.state === 'slide') {
          // Dodged safely!
        } else if (player.invincibilityTimer <= 0) {
          player.hp -= 25;
          player.invincibilityTimer = 0.8;
          setHudHp(Math.max(0, player.hp));
          sfx.playHit();
          state.screenShake = 15;

          if (player.hp <= 0) {
            endRun('Decapitated by High-Voltage Laser');
          }
        }
      }
    });

    // Coins Collections
    state.coins.forEach(coin => {
      if (!coin.collected && checkAABB(player, coin)) {
        coin.collected = true;
        const payout = Math.floor(coin.value * (1 + player.luck));
        state.creditsCollected += payout;
        setHudCredits(state.creditsCollected);
        sfx.playCoin();

        for (let i = 0; i < 5; i++) {
          state.particles.push({
            x: coin.x,
            y: coin.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 1,
            color: '#f59e0b',
            life: 0.35
          });
        }
      }
    });

    // Escape gate checking
    state.gates.forEach(gate => {
      if (gate.active && checkAABB(player, gate)) {
        gate.active = false;
        state.running = false;
        setShowExitChoice(true);
      }
    });

    // Visual particles updating
    state.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= actualDt;
      if (p.life <= 0) {
        state.particles.splice(idx, 1);
      }
    });

    // Clean up past frames
    state.platforms = state.platforms.filter(p => p.x + p.width > state.cameraX - 250);
    state.enemies = state.enemies.filter(e => e.x + e.width > state.cameraX - 100 && e.hp > 0);
    state.lasers = state.lasers.filter(l => l.x + l.width > state.cameraX - 100);
    state.coins = state.coins.filter(c => !c.collected && c.x + 30 > state.cameraX - 100);
    state.hazards = state.hazards.filter(h => h.x + h.width > state.cameraX - 100);
  };

  const triggerPlayerAttack = () => {
    const state = gameStateRef.current;
    const player = state.player;
    if (!player || player.slashTimer > 0) return;

    player.slashTimer = 0.22; 
    sfx.playSlash();

    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: player.x + player.width + Math.random() * 55,
        y: player.y + player.height / 2 + (Math.random() - 0.5) * 35,
        vx: Math.random() * 4 + 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 4 + 1.5,
        color: equippedTrail === 'Ghost Ice' ? '#22d3ee' : '#f97316',
        life: 0.3
      });
    }
  };

  const triggerGhostInvincibility = () => {
    const state = gameStateRef.current;
    if (state.timeSinceLastGhostUse < 30 || state.ghostActive) return;

    sfx.playGhost();
    state.ghostActive = true;
    state.ghostDurationRemaining = 10;
    state.player.invincibilityTimer = 10;
    state.timeSinceLastGhostUse = 0;
    setHudGhostPercent(0);

    const updated = [...dailyChallenges];
    updated[2].current = Math.min(updated[2].target, updated[2].current + 1);
    setDailyChallenges(updated);
  };

  const endRun = (reason = 'Fell in Pit') => {
    const state = gameStateRef.current;
    state.running = false;

    const updated = [...dailyChallenges];
    if (state.enemiesKilled > 0) updated[0].current = Math.min(updated[0].target, updated[0].current + state.enemiesKilled);
    if (state.distanceRun > 0) updated[1].current = Math.max(updated[1].current, state.distanceRun);
    setDailyChallenges(updated);

    setRunSummary({
      distance: state.distanceRun,
      creditsCollected: state.creditsCollected,
      enemiesKilled: state.enemiesKilled,
      maxCombo: state.maxCombo,
      ascendedFloor: Math.max(1, Math.floor(state.distanceRun / 350)),
      rewardsClaimed: false,
      reason: reason
    });

    setScreen('gameover');
  };

  const handleGateChoice = (exitNow) => {
    setShowExitChoice(false);
    if (exitNow) {
      endRun('Safely Decamped through Gate');
    } else {
      gameStateRef.current.running = true;
    }
  };

  const renderGame = (ctx, canvas) => {
    const state = gameStateRef.current;
    const player = state.player;
    if (!player) return;

    const activeZoneData = ZONES_CONFIG[state.zone] || ZONES_CONFIG[1];
    const themeColor = activeZoneData.theme;

    ctx.save();
    
    if (state.screenShake > 0) {
      const sx = (Math.random() - 0.5) * state.screenShake;
      const sy = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(sx, sy);
      state.screenShake--;
    }

    // Dynamic grid pattern background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, activeZoneData.bg[0]);
    gradient.addColorStop(1, activeZoneData.bg[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = `${themeColor}12`;
    ctx.lineWidth = 1;
    const gridInterval = 45;
    const shiftX = -(state.cameraX % gridInterval);
    for (let x = shiftX; x < canvas.width; x += gridInterval) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    ctx.translate(-state.cameraX, 0);

    // Render floor spikes
    ctx.fillStyle = '#ef4444';
    state.hazards.forEach(h => {
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + h.height);
      ctx.lineTo(h.x + h.width / 2, h.y);
      ctx.lineTo(h.x + h.width, h.y + h.height);
      ctx.closePath();
      ctx.fill();
    });

    // Render high-voltage lasers
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    state.lasers.forEach(laser => {
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x, laser.y + laser.height);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(laser.x - 5, laser.y, 10, laser.height);
    });

    // Render Platforms
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 4;
    state.platforms.forEach(p => {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.width, p.y);
      ctx.stroke();
    });

    // Render Coins
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    state.coins.forEach(c => {
      if (c.collected) return;
      ctx.beginPath();
      ctx.arc(c.x + 8, c.y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Render Escape Portals
    state.gates.forEach(gate => {
      if (!gate.active) return;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
    });

    // Render Particles
    state.particles.forEach(p => {
      if (p.isText) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });

    // Render physical enemies marching loop
    state.enemies.forEach(enemy => {
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 3.5;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const scale = enemy.height / 60;

      // Enemy Head
      ctx.beginPath();
      ctx.arc(ex, ey - 20 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(ex, ey - 13 * scale);
      ctx.lineTo(ex, ey + 10 * scale);
      ctx.stroke();

      // Moving limbs
      const swing = Math.sin(enemy.animFrame);
      ctx.beginPath();
      ctx.moveTo(ex, ey + 10 * scale);
      ctx.lineTo(ex + swing * 12 * scale, ey + 25 * scale); 
      ctx.lineTo(ex + swing * 14 * scale + 2, ey + 30 * scale); 
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ex, ey + 10 * scale);
      ctx.lineTo(ex - swing * 12 * scale, ey + 25 * scale); 
      ctx.lineTo(ex - swing * 14 * scale - 2, ey + 30 * scale); 
      ctx.stroke();
    });

    // Render Multi-joint Stickman skeleton joints
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const pH = player.height;

    // Glowing Trails 
    ctx.strokeStyle = equippedTrail === 'Ghost Ice' ? '#22d3ee' : '#f97316';
    ctx.lineWidth = 3.5;
    ctx.shadowBlur = state.ghostActive ? 22 : 6;
    ctx.shadowColor = equippedTrail === 'Ghost Ice' ? '#22d3ee' : '#f97316';

    // Wind-reactive scarf ribbon
    ctx.beginPath();
    ctx.moveTo(player.scarfPoints[0].x, player.scarfPoints[0].y);
    for (let i = 1; i < player.scarfPoints.length; i++) {
      ctx.lineTo(player.scarfPoints[i].x, player.scarfPoints[i].y);
    }
    ctx.stroke();

    // Body Skeleton Configuration
    ctx.strokeStyle = player.invincibilityTimer > 0 ? '#f43f5e' : '#ffffff';
    ctx.lineWidth = 4;

    // Head
    ctx.beginPath();
    ctx.arc(px, py - pH / 3, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Spine
    ctx.beginPath();
    ctx.moveTo(px, py - pH / 4);
    ctx.lineTo(px, py + pH / 8);
    ctx.stroke();

    const cycle = player.animFrame * 1.3;

    if (player.state === 'run') {
      // Running legs
      ctx.beginPath();
      ctx.moveTo(px, py + pH / 8);
      const kneeX1 = px + Math.sin(cycle) * 16;
      const kneeY1 = py + pH / 3;
      ctx.lineTo(kneeX1, kneeY1);
      ctx.lineTo(kneeX1 + Math.cos(cycle) * 8, py + pH / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, py + pH / 8);
      const kneeX2 = px - Math.sin(cycle) * 16;
      const kneeY2 = py + pH / 3;
      ctx.lineTo(kneeX2, kneeY2);
      ctx.lineTo(kneeX2 - Math.cos(cycle) * 8, py + pH / 2);
      ctx.stroke();

      // Arms swing holding glowing sword
      ctx.beginPath();
      ctx.moveTo(px, py - pH / 6);
      ctx.lineTo(px + 14, py);
      ctx.stroke();

      ctx.strokeStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(px + 14, py);
      ctx.lineTo(px + 36, py - 12);
      ctx.stroke();
    } 
    else if (player.state === 'slide') {
      ctx.beginPath();
      ctx.moveTo(px, py + pH / 8);
      ctx.lineTo(px - 16, py + pH / 4);
      ctx.lineTo(px - 26, py + pH / 4);
      ctx.stroke();
    } 
    else if (player.state === 'slash') {
      ctx.beginPath();
      ctx.moveTo(px, py - pH / 4);
      ctx.lineTo(px + 32, py + 12);
      ctx.stroke();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(px + 10, py, 48, -Math.PI / 4, Math.PI / 3);
      ctx.stroke();
    }
    else {
      ctx.beginPath();
      ctx.moveTo(px, py + pH / 8);
      ctx.lineTo(px - 12, py + pH / 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py + pH / 8);
      ctx.lineTo(px + 12, py + pH / 3);
      ctx.stroke();
    }

    // Draw pursuer firewall threat
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(state.glitchWallX - 250, 0, 250, canvas.height);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(state.glitchWallX, 0);
    ctx.lineTo(state.glitchWallX, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.height; i += 25) {
      const spikeOffset = Math.sin(state.player.animFrame + i) * 65;
      ctx.beginPath();
      ctx.moveTo(state.glitchWallX, i);
      ctx.lineTo(state.glitchWallX + spikeOffset, i);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  };

  const checkAABB = (r1, r2) => {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="h-full min-h-0 w-full bg-neutral-900 select-none overflow-hidden flex flex-col"
      style={{ touchAction: 'none' }}
    >
      <div data-runner-playfield className="relative flex-1 min-h-0 w-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* Dynamic Banner Notification on Phase Elevation */}
      {phaseBumperText && (
        <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-600 to-red-600 text-black border border-orange-400 px-4 sm:px-8 py-2 sm:py-4 rounded-xl font-extrabold tracking-widest text-center uppercase shadow-2xl z-40 animate-pulse text-[10px] sm:text-sm max-w-[92%]">
          {phaseBumperText}
        </div>
      )}

      {/* Danger alerts */}
      {hudAlert && (
        <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 sm:px-6 py-1.5 sm:py-2.5 rounded font-black tracking-widest text-center uppercase animate-pulse z-30 text-[10px] sm:text-xs shadow-lg max-w-[94%]">
          {hudAlert}
        </div>
      )}

      {/* HUD left container */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 space-y-0.5 pointer-events-none max-w-[44%]">
        <div className="bg-neutral-950/90 p-1 sm:p-2 rounded-lg border border-neutral-800 w-full max-w-[9rem] sm:max-w-[14rem] shadow-xl">
          <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono mb-0.5 uppercase font-bold">
            <span>INTEGRITY</span>
            <span>{hudHp}/{hudMaxHp}</span>
          </div>
          <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
            <div 
              className="bg-gradient-to-r from-red-600 via-orange-500 to-green-500 h-full transition-all duration-100" 
              style={{ width: `${Math.max(0, (hudHp / hudMaxHp) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Dynamic Phase Display Indicator on HUD */}
        <div className="inline-flex items-center space-x-1 bg-neutral-950/90 px-1.5 py-0.5 rounded-lg border border-orange-500/30 text-orange-400 font-black text-[10px] uppercase tracking-wider">
          <Target className="w-3 h-3" />
          <span>PHASE {currentPhase}/5</span>
        </div>

        {hudCombo > 1 && (
          <div className="flex items-center space-x-1 bg-orange-500 text-black px-1.5 py-0.5 rounded-lg font-black text-[11px] uppercase tracking-wider animate-bounce shadow-md">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>x{hudCombo}</span>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 space-y-0.5 text-right pointer-events-none">
        <div className="bg-neutral-950/80 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-neutral-800 shadow-xl">
          <p className="text-[8px] sm:text-[9px] text-neutral-500 uppercase font-mono font-bold">DIST</p>
          <p className="text-sm sm:text-base font-black font-mono text-white">{hudDistance}m</p>
        </div>

        <div className="bg-neutral-950/80 px-1.5 sm:px-3 py-0.5 rounded-lg border border-neutral-800 shadow-xl">
          <p className="text-[8px] sm:text-[9px] text-neutral-500 uppercase font-mono font-bold">CRED</p>
          <p className="text-xs sm:text-sm font-black font-mono text-orange-400 flex items-center justify-end gap-1">
            <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" /> {hudCredits}
          </p>
        </div>
      </div>
      </div>

      {/* Gateway Escaping prompts */}
      {showExitChoice && (
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-orange-500 p-6 sm:p-8 rounded-xl max-w-sm sm:max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/10 border border-orange-500 text-orange-500 rounded-full flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-wider uppercase text-white">GATEWAY DETECTED</h3>
              <p className="text-neutral-400 text-sm">
                You have reached an escape gateway. Do you wish to retreat safely and claim all collected credits or take risks to dive deeper into progressive phases?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleGateChoice(true)}
                className="w-full py-2.5 sm:py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold rounded-lg"
              >
                DECAMP & SECURE
              </button>
              <button 
                onClick={() => handleGateChoice(false)}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-extrabold rounded-lg shadow-lg"
              >
                GO DEEPER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Gamepad Controls overlays */}
      <div className="shrink-0 z-30 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] bg-neutral-950/95 border-t border-neutral-800 w-full grid grid-cols-12 gap-0.5 items-center touch-none">
        
        {/* Directional control panel */}
        <div className="col-span-4 flex items-center justify-start gap-1 sm:gap-2">
          <button 
            onTouchStart={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowLeft'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowLeft'] = false; }}
            onTouchCancel={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowLeft'] = false; }}
            onMouseDown={() => { gameStateRef.current.keys['ArrowLeft'] = true; }}
            onMouseUp={() => { gameStateRef.current.keys['ArrowLeft'] = false; }}
            className="w-9 h-9 sm:w-12 sm:h-12 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-xl flex items-center justify-center active:bg-orange-500 active:text-black transition-all shadow-md select-none touch-none"
          >
            ←
          </button>
          
          <button 
            onTouchStart={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowRight'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowRight'] = false; }}
            onTouchCancel={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowRight'] = false; }}
            onMouseDown={() => { gameStateRef.current.keys['ArrowRight'] = true; }}
            onMouseUp={() => { gameStateRef.current.keys['ArrowRight'] = false; }}
            className="w-9 h-9 sm:w-12 sm:h-12 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-xl flex items-center justify-center active:bg-orange-500 active:text-black transition-all shadow-md select-none touch-none"
          >
            →
          </button>
        </div>

        {/* Ghost Mode Activation overlay */}
        <div className="col-span-4 flex flex-col items-center justify-center">
          <button 
            onTouchStart={(e) => { e.preventDefault(); triggerGhostInvincibility(); }}
            disabled={hudGhostPercent < 100}
            className={`w-9 h-9 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center transition-all shadow-lg touch-none ${
              hudGhostPercent >= 100 
                ? 'bg-gradient-to-b from-purple-600 to-indigo-600 border-purple-400 text-white active:scale-95' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
          </button>
          <span className="text-[9px] text-neutral-500 font-mono">{Math.floor(hudGhostPercent)}%</span>
        </div>

        {/* Action controls button pad */}
        <div className="col-span-4 flex items-center justify-end gap-1 sm:gap-2">
          
          <button 
            onTouchStart={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowDown'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowDown'] = false; }}
            onTouchCancel={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowDown'] = false; }}
            onMouseDown={() => { gameStateRef.current.keys['ArrowDown'] = true; }}
            onMouseUp={() => { gameStateRef.current.keys['ArrowDown'] = false; }}
            className="w-9 h-9 sm:w-12 sm:h-12 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-xl flex flex-col items-center justify-center active:bg-orange-500 active:text-black transition-all select-none touch-none"
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
            <span className="text-[6px] sm:text-[7px] font-bold mt-0.5">SLIDE</span>
          </button>

          <button 
            onTouchStart={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowUp'] = true; }}
            onTouchEnd={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowUp'] = false; }}
            onTouchCancel={(e) => { e.preventDefault(); gameStateRef.current.keys['ArrowUp'] = false; }}
            onMouseDown={() => { gameStateRef.current.keys['ArrowUp'] = true; }}
            onMouseUp={() => { gameStateRef.current.keys['ArrowUp'] = false; }}
            className="w-9 h-9 sm:w-12 sm:h-12 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-xl flex flex-col items-center justify-center active:bg-orange-500 active:text-black transition-all select-none touch-none"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 -rotate-90 text-green-400" />
            <span className="text-[6px] sm:text-[7px] font-bold mt-0.5">JUMP</span>
          </button>

          <button 
            onTouchStart={(e) => { e.preventDefault(); triggerPlayerAttack(); }}
            className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-tr from-orange-600 to-orange-400 border border-orange-400 text-black font-extrabold rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg select-none touch-none"
          >
            <Sword className="w-4 h-4 sm:w-5 sm:h-5 stroke-black" />
            <span className="text-[7px] sm:text-[8px] font-black mt-0.5">ATTACK</span>
          </button>
        </div>

      </div>
    </div>
  );
}

function UpgradesScreen({ setScreen, stats, setStats, gear, setGear, credits, setCredits, saveUserData }) {
  const { spendCredits: spendCreditsBackend } = useCredits();
  const statUpgrades = [
    { key: 'speed', name: 'Nano Thruster Modules', desc: 'Increases progressive runner agility & pace scaling', icon: Zap, color: 'text-orange-400' },
    { key: 'strength', name: 'Laser Blade Frequency', desc: 'Increases dynamic combat strike damage', icon: Sword, color: 'text-red-400' },
    { key: 'health', name: 'Chassis Shield Cells', desc: 'Improves total integrity health points limits', icon: Heart, color: 'text-green-400' },
    { key: 'luck', name: 'Scavenger Hack Matrix', desc: 'Boosts credits payouts using luck multipliers', icon: Sparkles, color: 'text-cyan-400' }
  ];

  const gearOptions = {
    boots: [
      { name: 'None', stat: 'None', cost: 0 },
      { name: 'Titanium Grips', stat: '+10% Speed Boost', cost: 350 },
      { name: 'Gravity Dampener', stat: '+25% Jump Lift', cost: 800 }
    ],
    armor: [
      { name: 'None', stat: 'None', cost: 0 },
      { name: 'Vortex Mesh', stat: '+20 Integrity Max', cost: 400 },
      { name: 'Nanite Platings', stat: '+45 Integrity Max', cost: 1100 }
    ]
  };

  const buyUpgrade = (key) => {
    const currentLvl = stats[key];
    const cost = Math.floor(100 * Math.pow(1.4, currentLvl));

    if (credits >= cost) {
      const nextCredits = credits - cost;
      const nextStats = { ...stats, [key]: currentLvl + 1 };
      setCredits(nextCredits);
      setStats(nextStats);
      saveUserData(nextCredits, undefined, nextStats);
      spendCreditsBackend(cost, `Cyber Runner upgrade: ${key}`);
      sfx.playCoin();
    } else {
      sfx.playHit();
    }
  };

  const buyGear = (slot, item) => {
    if (credits >= item.cost) {
      const nextCredits = credits - item.cost;
      const nextGear = { ...gear, [slot]: item.name };
      setCredits(nextCredits);
      setGear(nextGear);
      saveUserData(nextCredits, undefined, undefined, nextGear);
      spendCreditsBackend(item.cost, `Cyber Runner gear: ${item.name}`);
      sfx.playCoin();
    } else {
      sfx.playHit();
    }
  };

  return (
    <div className="flex-grow max-w-5xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-wider">Cybernetics Laboratory</h2>
          <p className="text-sm text-neutral-400">Install processor optimizations & purchase defensive gear components.</p>
        </div>
        <button 
          onClick={() => { sfx.playJump(); setScreen('menu'); }}
          className="px-5 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-orange-500 rounded-lg text-sm font-bold transition-all"
        >
          Return to Menu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core Optimizations */}
        <div className="bg-neutral-900/60 rounded-xl p-4 sm:p-6 border border-neutral-800 space-y-4">
          <h3 className="text-xl font-extrabold uppercase border-b border-neutral-800 pb-3">Solder Optimization</h3>
          <div className="space-y-4">
            {statUpgrades.map(stat => {
              const currentLvl = stats[stat.key];
              const cost = Math.floor(100 * Math.pow(1.4, currentLvl));
              const IconComp = stat.icon;

              return (
                <div key={stat.key} className="p-3 sm:p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-neutral-900 flex items-center justify-center">
                      <IconComp className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{stat.name}</h4>
                      <p className="text-xs text-neutral-400">{stat.desc}</p>
                      <span className="text-[10px] text-neutral-500 font-mono">Current level: {currentLvl}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => buyUpgrade(stat.key)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-black font-extrabold text-xs rounded hover:bg-orange-400 transition-colors whitespace-nowrap"
                  >
                    UPGRADE ({cost} PC)
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chassis Upgrades shop */}
        <div className="bg-neutral-900/60 rounded-xl p-6 border border-neutral-800 space-y-6">
          <h3 className="text-xl font-extrabold uppercase border-b border-neutral-800 pb-3">Chassis Components</h3>
          <div className="space-y-4">
            {Object.keys(gearOptions).map(slot => (
              <div key={slot} className="bg-neutral-950 p-3 sm:p-4 rounded-lg border border-neutral-800">
                <span className="text-xs font-bold uppercase text-orange-400">{slot} SLOT</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {gearOptions[slot].map(item => {
                    const active = gear[slot] === item.name;
                    return (
                      <button
                        key={item.name}
                        disabled={active}
                        onClick={() => buyGear(slot, item)}
                        className={`p-1.5 sm:p-2 rounded text-left border text-xs flex flex-col justify-between h-16 sm:h-20 transition-all ${
                          active ? 'border-orange-500 bg-orange-500/10' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                        }`}
                      >
                        <span className="font-bold block truncate w-full">{item.name}</span>
                        <span className="text-[10px] text-neutral-400 block">{item.stat}</span>
                        <span className="text-[10px] font-mono text-orange-300 block">{item.cost > 0 ? `${item.cost} PC` : 'FREE'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function CosmeticsScreen({ 
  setScreen, credits, setCredits, ownedSkins, setOwnedSkins, 
  equippedSkin, setEquippedSkin, ownedTrails, setOwnedTrails, 
  equippedTrail, setEquippedTrail, saveUserData 
}) {
  const skinsList = [
    { name: 'Default', rarity: 'Common', desc: 'Standard matrix grid stick skeleton frame', cost: 0 },
    { name: 'Silver Runner', rarity: 'Rare', desc: 'Premium chromium alloy jointed vector lines', cost: 800 },
    { name: 'Ghost Walker', rarity: 'Epic', desc: 'Glitch-shifting purple shadow runner structure', cost: 1500 }
  ];

  const trailsList = [
    { name: 'Orange Neon', rarity: 'Common', desc: 'Standard orange trail glow', cost: 0 },
    { name: 'Ghost Ice', rarity: 'Rare', desc: 'Chilling cyan ghost-mode trail', cost: 600 },
    { name: 'Purple Neon', rarity: 'Epic', desc: 'Vivid purple energy wake', cost: 1200 },
    { name: 'Green Matrix', rarity: 'Epic', desc: 'Digital green matrix code trail', cost: 1200 }
  ];

  const buySkin = (skin) => {
    if (credits >= skin.cost) {
      const nextCredits = credits - skin.cost;
      const nextOwned = [...ownedSkins, skin.name];
      setCredits(nextCredits);
      setOwnedSkins(nextOwned);
      setEquippedSkin(skin.name);
      saveUserData(nextCredits, undefined, undefined, undefined, nextOwned, skin.name);
      sfx.playCoin();
    } else {
      sfx.playHit();
    }
  };

  const buyTrail = (trail) => {
    if (credits >= trail.cost) {
      const nextCredits = credits - trail.cost;
      const nextOwned = [...ownedTrails, trail.name];
      setCredits(nextCredits);
      setOwnedTrails(nextOwned);
      setEquippedTrail(trail.name);
      saveUserData(nextCredits, undefined, undefined, undefined, undefined, undefined, nextOwned, trail.name);
      sfx.playCoin();
    } else {
      sfx.playHit();
    }
  };

  return (
    <div className="flex-grow max-w-4xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-wider">Visual Customizers</h2>
          <p className="text-sm text-neutral-400">Modify vector stick layouts and trailing neon color frequencies.</p>
        </div>
        <button 
          onClick={() => { sfx.playJump(); setScreen('menu'); }}
          className="px-5 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-orange-500 rounded-lg text-sm font-bold transition-all"
        >
          Return to Menu
        </button>
      </div>

      <div className="bg-neutral-900/60 p-4 sm:p-6 rounded-xl border border-neutral-800 space-y-4">
        <h3 className="text-lg font-extrabold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">Skins</h3>
        {skinsList.map(skin => {
          const owned = ownedSkins.includes(skin.name);
          const equipped = equippedSkin === skin.name;

          return (
            <div key={skin.name} className="p-3 sm:p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{skin.name}</h4>
                <p className="text-xs text-neutral-400 mt-0.5">{skin.desc}</p>
                <span className="text-[10px] uppercase font-bold text-orange-500">{skin.rarity}</span>
              </div>

              {equipped ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded font-bold">EQUIPPED</span>
              ) : owned ? (
                <button 
                  onClick={() => { setEquippedSkin(skin.name); sfx.playCoin(); }}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700 font-bold"
                >
                  EQUIP
                </button>
              ) : (
                <button 
                  onClick={() => buySkin(skin)}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-orange-500 text-black text-xs font-bold rounded hover:bg-orange-400"
                >
                  BUY ({skin.cost} PC)
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-neutral-900/60 p-4 sm:p-6 rounded-xl border border-neutral-800 space-y-4">
        <h3 className="text-lg font-extrabold uppercase tracking-wider text-white border-b border-neutral-800 pb-2">Trails</h3>
        {trailsList.map(trail => {
          const owned = ownedTrails.includes(trail.name);
          const equipped = equippedTrail === trail.name;

          return (
            <div key={trail.name} className="p-3 sm:p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{trail.name}</h4>
                <p className="text-xs text-neutral-400 mt-0.5">{trail.desc}</p>
                <span className="text-[10px] uppercase font-bold text-orange-500">{trail.rarity}</span>
              </div>

              {equipped ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded font-bold">EQUIPPED</span>
              ) : owned ? (
                <button 
                  onClick={() => { setEquippedTrail(trail.name); sfx.playCoin(); }}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700 font-bold"
                >
                  EQUIP
                </button>
              ) : (
                <button 
                  onClick={() => buyTrail(trail)}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-orange-500 text-black text-xs font-bold rounded hover:bg-orange-400"
                >
                  BUY ({trail.cost} PC)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengesScreen({ setScreen, dailyChallenges, setDailyChallenges, setCredits, saveUserData }) {
  const claimReward = (challenge) => {
    if (challenge.current >= challenge.target && !challenge.claimed) {
      const updated = dailyChallenges.map(c => c.id === challenge.id ? { ...c, claimed: true } : c);
      setDailyChallenges(updated);
      setCredits(prev => {
        const next = prev + challenge.reward;
        saveUserData(next);
        return next;
      });
      sfx.playCoin();
    }
  };

  return (
    <div className="flex-grow max-w-4xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-wider">Protocol Missions</h2>
          <p className="text-sm text-neutral-400">Complete server objectives to secure extra credits bounties.</p>
        </div>
        <button 
          onClick={() => { sfx.playJump(); setScreen('menu'); }}
          className="px-5 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-orange-500 rounded-lg text-sm font-bold transition-all"
        >
          Return to Menu
        </button>
      </div>

      <div className="bg-neutral-900/60 p-4 sm:p-6 rounded-xl border border-neutral-800 space-y-4">
        {dailyChallenges.map(challenge => {
          const progressPercent = Math.min(100, (challenge.current / challenge.target) * 100);
          const completed = challenge.current >= challenge.target;

          return (
            <div key={challenge.id} className="p-3 sm:p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-grow space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-5 h-5 ${completed ? 'text-green-500' : 'text-neutral-600'}`} />
                  <h4 className="font-bold text-sm text-white">{challenge.text}</h4>
                </div>
                
                <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full" style={{ width: `${progressPercent}%` }}></div>
                </div>
                
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>Progress: {challenge.current} / {challenge.target}</span>
                  <span>Payout: {challenge.reward} Puurga Credits</span>
                </div>
              </div>

              <div>
                {challenge.claimed ? (
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded font-bold block text-center md:w-32 font-mono">CLAIMED</span>
                ) : completed ? (
                  <button 
                    onClick={() => claimReward(challenge)}
                    className="w-full md:w-32 py-1.5 sm:py-2 bg-orange-500 hover:bg-orange-400 text-black font-extrabold text-xs rounded transition-colors font-mono"
                  >
                    CLAIM REWARD
                  </button>
                ) : (
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs rounded font-bold block text-center md:w-32 font-mono">LOCKED</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameOverScreen({ 
  setScreen, runSummary, credits, setCredits, purgaPoints, setPurgaPoints, saveUserData 
}) {
  const { addCredits: addCreditsToBackend } = useCredits();
  
  const claimRewards = () => {
    if (runSummary.rewardsClaimed) return;

    const gainedCredits = runSummary.creditsCollected;
    const gainedPoints = Math.floor(runSummary.distance / 12);

    const nextCredits = credits + gainedCredits;
    const nextPoints = purgaPoints + gainedPoints;

    setCredits(nextCredits);
    setPurgaPoints(nextPoints);
    saveUserData(nextCredits, nextPoints);
    
    // Sync credits to unified economy backend
    if (gainedCredits > 0) {
      addCreditsToBackend(gainedCredits, 'Cyber Runner run rewards');
    }

    sfx.playCoin();
    runSummary.rewardsClaimed = true;
    setScreen('menu');
  };

  return (
    <div className="flex-grow max-w-xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-8 flex flex-col justify-center space-y-8">
      <div className="bg-neutral-900 p-6 sm:p-8 rounded-2xl border-2 border-red-500/40 text-center space-y-6 shadow-2xl shadow-red-500/10">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/10 border border-red-500 text-red-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <Skull className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-widest uppercase text-red-500">CONNECTION LOSS</h2>
          <p className="text-neutral-400 text-sm font-medium">
            Reason: <span className="text-white font-bold">{runSummary.reason}</span> inside network zone floor {runSummary.ascendedFloor}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block font-bold">RUN DISPLACEMENT</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white block mt-1">{runSummary.distance}m</span>
          </div>
          <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block font-bold">CREDITS SECURED</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-orange-400 block mt-1">+{runSummary.creditsCollected} PC</span>
          </div>
          <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block font-bold">HOSTS DEFEATED</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white block mt-1">{runSummary.enemiesKilled} CRAWLERS</span>
          </div>
          <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block font-bold">MAX COMBOS MET</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-orange-500 block mt-1">x{runSummary.maxCombo} Combo</span>
          </div>
        </div>

        <button 
          onClick={claimRewards}
          className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-extrabold text-base sm:text-lg uppercase tracking-wider rounded-lg shadow-xl shadow-orange-500/25 transition-all transform active:scale-95"
        >
          CLAIM & RETREAT TO NEXUS
        </button>
      </div>
    </div>
  );
}