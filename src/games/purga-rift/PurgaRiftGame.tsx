// @ts-nocheck
// Pasted game module — types checked at IntegratedGameShell boundary only.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap, Trophy, Users, Skull, AlertTriangle, RotateCcw,
  Volume2, VolumeX, Flame, ShoppingBag, EyeOff,
  Coins, ArrowRight, Share2, Play, Award
} from 'lucide-react';
import { useCredits } from '../../hooks/useCredits';

// Web Audio Synthesis class for immersive high-fidelity sci-fi sounds
class RiftSoundSynth {
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

  setMuted(m) {
    this.muted = m;
  }

  playSuccess() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc1.frequency.setValueAtTime(1046.50, now + 0.24); // C6

      osc2.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.setValueAtTime(329.63, now + 0.08); // E4
      osc2.frequency.setValueAtTime(392.00, now + 0.16); // G4
      osc2.frequency.setValueAtTime(523.25, now + 0.24); // C5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }

  playFailure() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.4);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }

  playTick() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }

  playGlitch() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(450, now + 0.05);
      osc.frequency.setValueAtTime(180, now + 0.1);
      osc.frequency.setValueAtTime(600, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }

  playShadowTrigger() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(40, now + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 1.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.4);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }
}

const synth = new RiftSoundSynth();

const DEFAULT_FRIENDS = [
  { id: 'u1', name: 'Christopher', score: 15300, level: 54, badge: 'Rift Master', avatar: '🪐', online: true },
  { id: 'u2', name: 'Adam', score: 14200, level: 41, badge: 'Shadow Walker', avatar: '🛸', online: true },
  { id: 'u3', name: 'Sarah', score: 13500, level: 38, badge: 'The Oracle', avatar: '💫', online: false },
  { id: 'u4', name: 'Nexus_Core', score: 11900, level: 31, badge: 'The Seeker', avatar: '⚡', online: true },
  { id: 'u5', name: 'PuurgaElite', score: 9400, level: 24, badge: 'Novice', avatar: '☄️', online: false },
];

const SHOP_ITEMS = [
  { id: 'theme-void', name: 'Deep Void UI', description: 'Unlock neon crimson styling', price: 150, type: 'theme', rarity: 'Legendary', previewColor: 'from-rose-950 to-neutral-950 border-rose-500' },
  { id: 'theme-emerald', name: 'Emerald Matrix', description: 'Unlock terminal green aesthetic', price: 80, type: 'theme', rarity: 'Rare', previewColor: 'from-emerald-950 to-neutral-950 border-emerald-500' },
  { id: 'theme-ether', name: 'Ethereal Blue', description: 'Deep cosmic cyan themes', price: 100, type: 'theme', rarity: 'Epic', previewColor: 'from-cyan-950 to-neutral-950 border-cyan-500' },
  { id: 'title-seeker', name: 'Title: The Seeker', description: 'Showcase title beneath your name', price: 40, type: 'title', rarity: 'Common', label: 'The Seeker' },
  { id: 'title-oracle', name: 'Title: The Oracle', description: 'Showcase legendary title on profiles', price: 120, type: 'title', rarity: 'Epic', label: 'The Oracle' },
  { id: 'title-walker', name: 'Title: Shadow Walker', description: 'Exclusive dark title badge', price: 180, type: 'title', rarity: 'Legendary', label: 'Shadow Walker' },
  { id: 'title-master', name: 'Title: Rift Master', description: 'Highest state of digital alignment', price: 250, type: 'title', rarity: 'Mythic', label: 'Rift Master' },
];

export default function PurgaRiftGame() {
  const { balance, addCredits, spendCredits, mergeLocalCredits } = useCredits();
  const [view, setView] = useState('hub'); // hub, game, shop, leaderboard, social, gameover
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [trust, setTrust] = useState(100);
  // Migrate localStorage credits to unified economy on first load
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    if (migrated) return;
    const saved = localStorage.getItem('purga_rift_points');
    const localCredits = saved ? parseInt(saved) : 0;
    if (localCredits > 0) {
      mergeLocalCredits(localCredits, 'purga_rift').then(() => {
        localStorage.removeItem('purga_rift_points');
        setMigrated(true);
      });
    } else {
      setMigrated(true);
    }
  }, [migrated, mergeLocalCredits]);
  const puurgaPoints = balance;
  const [unlockedCosmetics, setUnlockedCosmetics] = useState(() => {
    const saved = localStorage.getItem('purga_rift_unlocked');
    return saved ? JSON.parse(saved) : ['theme-emerald'];
  });
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('purga_rift_theme') || 'theme-emerald';
  });
  const [activeTitle, setActiveTitle] = useState(() => {
    return localStorage.getItem('purga_rift_title') || 'The Seeker';
  });
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('purga_rift_muted');
    return saved === 'true';
  });
  const [customEvent, setCustomEvent] = useState(null); // 'Blackout', 'Mirror', 'RiftStorm', 'TimeCollapse'
  
  // Game Play States
  const [gameMode, setGameMode] = useState('normal'); // 'normal', 'shadow'
  const [currentPattern, setCurrentPattern] = useState([]);
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [streak, setStreak] = useState(0);
  const [timerMax, setTimerMax] = useState(15);
  const [timerLeft, setTimerLeft] = useState(15);
  const [deceptionHint, setDeceptionHint] = useState(null); // Info panel displaying real/fake hints
  const [inputReversed, setInputReversed] = useState(false);
  const [blackoutVisible, setBlackoutVisible] = useState(true);
  
  // Simon memory sequence task specific states
  const [isMemorySequence, setIsMemorySequence] = useState(false);
  const [simonTarget, setSimonTarget] = useState([]);
  const [simonPlayerProgress, setSimonPlayerProgress] = useState([]);
  const [simonFlashingIdx, setSimonFlashingIdx] = useState(-1);

  // Social / Battle Simulation
  const [activeBattleId, setActiveBattleId] = useState(null);
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleOpponentLevel, setBattleOpponentLevel] = useState(1);
  const [battleOpponentScore, setBattleOpponentScore] = useState(0);
  const [battleHistory, setBattleHistory] = useState(() => {
    const saved = localStorage.getItem('purga_rift_battle_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [localLeaderboard, setLocalLeaderboard] = useState(() => {
    const saved = localStorage.getItem('purga_rift_leaderboard');
    return saved ? JSON.parse(saved) : [];
  });

  // Particle background Canvas Ref
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space background coloring
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height));
      if (gameMode === 'shadow') {
        gradient.addColorStop(0, '#1c0505');
        gradient.addColorStop(1, '#050101');
      } else {
        gradient.addColorStop(0, '#0c071d');
        gradient.addColorStop(1, '#030008');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Vector Grid Matrix Lines
      ctx.strokeStyle = gameMode === 'shadow' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(139, 92, 246, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Drawing neural-connected floating dust particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = gameMode === 'shadow' 
          ? `rgba(239, 68, 68, ${p.alpha})` 
          : `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();

        // Connect near neighbors with web-like neural paths
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = gameMode === 'shadow'
              ? `rgba(239, 68, 68, ${(1 - dist / 100) * 0.15})`
              : `rgba(139, 92, 246, ${(1 - dist / 100) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameMode]);

  // Persist game state to localStorage (credits now handled by unified economy)
  useEffect(() => { localStorage.setItem('purga_rift_unlocked', JSON.stringify(unlockedCosmetics)); }, [unlockedCosmetics]);
  useEffect(() => { localStorage.setItem('purga_rift_theme', activeTheme); }, [activeTheme]);
  useEffect(() => { localStorage.setItem('purga_rift_title', activeTitle); }, [activeTitle]);
  useEffect(() => { localStorage.setItem('purga_rift_muted', muted); }, [muted]);
  useEffect(() => { localStorage.setItem('purga_rift_battle_history', JSON.stringify(battleHistory)); }, [battleHistory]);
  useEffect(() => { localStorage.setItem('purga_rift_leaderboard', JSON.stringify(localLeaderboard)); }, [localLeaderboard]);

  useEffect(() => {
    synth.setMuted(muted);
  }, [muted]);

  const triggerGameOver = useCallback(() => {
    synth.playFailure();

    // Save score to local leaderboard
    setLocalLeaderboard(prev => {
      const entry = { score, level, date: Date.now() };
      const updated = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 20);
      return updated;
    });

    if (activeBattleId) {
      // Determine winner based on score
      const didWin = score > battleOpponentScore;
      const finalBattleState = {
        opponent: battleOpponent.name,
        userScore: score,
        opponentScore: battleOpponentScore,
        outcome: didWin ? 'VICTORY' : 'DEFEAT',
        rewards: didWin ? 30 : 5
      };
      setBattleHistory(prev => [finalBattleState, ...prev]);
      if (didWin) addCredits(30, 'Purga Rift battle victory');
      else addCredits(5, 'Purga Rift battle defeat');
    }
    setView('gameover');
  }, [score, activeBattleId, battleOpponent, battleOpponentScore]);

  useEffect(() => {
    let timer;
    if (view === 'game') {
      timer = setInterval(() => {
        setTimerLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Time out acts as a wrong answer
            handleAnswerEvaluation(null);
            return 0;
          }
          if (prev <= 4) {
            synth.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, currentPattern, correctAnswer, isMemorySequence]);

  const generateNewRiftTask = useCallback((currLvl) => {
    // Reset temporary custom mechanics
    setInputReversed(false);
    setBlackoutVisible(true);
    setIsMemorySequence(false);

    // Determine random/special visual corruption modifiers
    let chosenEvent = null;
    if (currLvl >= 15 && Math.random() < 0.35) {
      const modes = ['Blackout', 'Mirror', 'TimeCollapse'];
      if (currLvl >= 25) modes.push('RiftStorm');
      chosenEvent = modes[Math.floor(Math.random() * modes.length)];
      setCustomEvent(chosenEvent);
      if (chosenEvent === 'Mirror') setInputReversed(true);
      if (chosenEvent === 'Blackout') {
        setTimeout(() => setBlackoutVisible(false), 2000); // Blackout hides panel after 2s
      }
    } else {
      setCustomEvent(null);
    }

    // Timer calibration
    let baseTime = 16 - Math.min(6, Math.floor(currLvl / 8));
    if (chosenEvent === 'TimeCollapse') baseTime = Math.max(4, Math.floor(baseTime / 2));
    setTimerMax(baseTime);
    setTimerLeft(baseTime);

    // Pick puzzle generator sequence type based on levels
    if (currLvl >= 11 && currLvl <= 20 && Math.random() < 0.7) {
      // Level 11-20: Classic Memory Replication (Simon says)
      setIsMemorySequence(true);
      const possibleSymbols = ['🟢', '🔵', '🟡', '🟣'];
      const seqLength = 3 + Math.floor((currLvl - 10) / 4); // sequence length increases
      const genSeq = Array.from({ length: seqLength }, () => possibleSymbols[Math.floor(Math.random() * possibleSymbols.length)]);
      
      setSimonTarget(genSeq);
      setSimonPlayerProgress([]);
      setOptions(possibleSymbols);
      setDeceptionHint(null);
      
      // Trigger sequence visual playback animation
      let step = 0;
      const playAnim = setInterval(() => {
        if (step < genSeq.length) {
          setSimonFlashingIdx(step);
          synth.playTick();
          setTimeout(() => setSimonFlashingIdx(-1), 350);
          step++;
        } else {
          clearInterval(playAnim);
        }
      }, 600);
      
    } else {
      // Standard visual prediction patterns (Logic, sequence trends, symbol sets)
      const symbolsList = ['🟢', '🔵', '🟡', '🟣', '🔺', '⭐', '💎', '💀'];
      const selectedPool = symbolsList.slice(0, Math.min(8, 4 + Math.floor(currLvl / 10)));
      
      const patternType = Math.floor(Math.random() * 4);
      let pattern = [];
      let correctAns = '';
      let candidates = [];

      if (patternType === 0) {
        // Alternating Pattern: A B A B A ?
        const symA = selectedPool[0];
        const symB = selectedPool[1];
        pattern = [symA, symB, symA, symB, symA];
        correctAns = symB;
        candidates = [symB, symA, selectedPool[2] || '⭐', selectedPool[3] || '💎'];
      } else if (patternType === 1) {
        // Incrementing Group Pattern: A B B A B B B A B ?
        const symA = selectedPool[1] || '🔵';
        const symB = selectedPool[2] || '🟡';
        pattern = [symA, symB, symB, symA, symB, symB, symB, symA, symB, symB, symB];
        correctAns = symB;
        candidates = [symB, symA, selectedPool[0], selectedPool[3] || '🔺'];
      } else if (patternType === 2) {
        // Rotational Cycle: A B C A B ?
        const symA = selectedPool[0];
        const symB = selectedPool[1];
        const symC = selectedPool[2] || '🟡';
        pattern = [symA, symB, symC, symA, symB];
        correctAns = symC;
        candidates = [symC, symA, symB, selectedPool[3] || '🔺'];
      } else {
        // Progressive steps: Increasing numeric sequence inside tags
        const baseNum = Math.floor(Math.random() * 20);
        const steps = Math.floor(Math.random() * 4) + 2; // +2, +3 etc
        pattern = [baseNum, baseNum + steps, baseNum + (steps * 2), baseNum + (steps * 3)];
        correctAns = String(baseNum + (steps * 4));
        candidates = [
          correctAns, 
          String(baseNum + (steps * 4) + 1), 
          String(baseNum + (steps * 3) + steps - 2), 
          String(baseNum + (steps * 5))
        ];
      }

      // Shuffling candidates
      candidates = candidates.sort(() => Math.random() - 0.5);

      // Level 31-40: Inject False Signals & Deception HUD Warnings
      let warningState = null;
      if (currLvl >= 30) {
        const truthChance = Math.random() > 0.45; // some hints lied!
        const correctTargetString = typeof correctAns === 'string' ? correctAns : String(correctAns);
        const wrongOption = candidates.find(c => c !== correctAns) || '🔺';
        
        if (truthChance) {
          warningState = {
            integrity: 'PURE',
            text: `Rift Core says: Correct Signal is definitely ${correctTargetString}`
          };
        } else {
          warningState = {
            integrity: 'CORRUPTED',
            text: `Rift Core says: Avoid ${correctTargetString}, go with ${wrongOption}`
          };
        }
      }

      setCurrentPattern(pattern);
      setCorrectAnswer(correctAns);
      setOptions(candidates);
      setDeceptionHint(warningState);
    }
  }, [gameMode]);

  const startNewGame = (type = 'normal') => {
    synth.init();
    setGameMode(type);
    setScore(0);
    setLevel(1);
    setTrust(100);
    setStreak(0);
    setCustomEvent(null);
    setView('game');
    generateNewRiftTask(1);

    if (type === 'shadow') {
      synth.playShadowTrigger();
    } else {
      synth.playSuccess();
    }
  };

  useEffect(() => {
    let opponentInterval;
    if (view === 'game' && activeBattleId) {
      opponentInterval = setInterval(() => {
        // Simulated real-time opponent performance steps
        setBattleOpponentScore(prev => {
          // Opponent has randomized accuracy based on their pre-level
          const successChance = Math.random() > (0.15 + (level * 0.005));
          const scoreBump = successChance ? Math.floor(Math.random() * 120 + 80) : 0;
          
          if (Math.random() > 0.45) {
            setBattleOpponentLevel(l => l + (successChance ? 1 : 0));
          }
          return prev + scoreBump;
        });
      }, 5000); // changes every 5 seconds to feel live
    }
    return () => clearInterval(opponentInterval);
  }, [view, activeBattleId, level]);

  const handleAnswerEvaluation = (playerAnswer) => {
    let isCorrect = false;

    if (isMemorySequence) {
      // Memory replication mode logic
      const nextProgress = [...simonPlayerProgress, playerAnswer];
      const checkIdx = nextProgress.length - 1;

      if (simonTarget[checkIdx] === playerAnswer) {
        setSimonPlayerProgress(nextProgress);
        synth.playTick();
        
        // Sequence fully replicated
        if (nextProgress.length === simonTarget.length) {
          isCorrect = true;
        } else {
          // Progress is valid but sequence isn't finished yet
          return;
        }
      } else {
        isCorrect = false;
      }
    } else {
      // Standard static pattern check
      isCorrect = String(playerAnswer) === String(correctAnswer);
    }

    if (isCorrect) {
      synth.playSuccess();
      const ptMultiplier = gameMode === 'shadow' ? 3 : 1;
      const stormMultiplier = customEvent === 'RiftStorm' ? 2 : 1;
      const basePoints = Math.floor(100 * (1 + level * 0.15)) * ptMultiplier * stormMultiplier;
      
      setScore(prev => prev + basePoints);
      setStreak(prev => prev + 1);
      setTrust(prev => Math.min(100, prev + 5));
      addCredits(2 * ptMultiplier, 'Purga Rift correct answer');

      // Level progressions
      const nextLvl = level + 1;
      setLevel(nextLvl);
      
      // Load next puzzle task
      setTimeout(() => generateNewRiftTask(nextLvl), 600);

    } else {
      synth.playGlitch();
      setStreak(0);
      const trustLoss = 10;
      const nextTrust = trust - trustLoss;
      setTrust(Math.max(0, nextTrust));

      if (nextTrust <= 0) {
        if (gameMode === 'normal') {
          // Drop down to Shadow Rift rather than instant gameover!
          setGameMode('shadow');
          setTrust(80); // Restarts inside the brutal shadow rift phase
          synth.playShadowTrigger();
          setTimeout(() => generateNewRiftTask(level), 1000);
        } else {
          // If already in Shadow Rift and trust hits 0, game ends instantly
          triggerGameOver();
        }
      } else {
        // Redo pattern/try next on same level
        setTimeout(() => generateNewRiftTask(level), 600);
      }
    }
  };

  const handlePurchase = (item) => {
    if (puurgaPoints >= item.price && !unlockedCosmetics.includes(item.id)) {
      synth.playSuccess();
      spendCredits(item.price, `Purga Rift cosmetic: ${item.label || item.id}`);
      setUnlockedCosmetics(prev => [...prev, item.id]);
      if (item.type === 'theme') {
        setActiveTheme(item.id);
      } else if (item.type === 'title') {
        setActiveTitle(item.label);
      }
    } else {
      synth.playGlitch();
    }
  };

  const initiateSimulatedBattle = (opponent) => {
    setBattleOpponent(opponent);
    setBattleOpponentLevel(1);
    setBattleOpponentScore(0);
    setActiveBattleId('battle-' + Date.now());
    startNewGame('normal');
  };

  const inActiveRun = view === 'game';

  return (
    <div className={`h-full min-h-0 w-full relative flex flex-col text-neutral-100 overflow-hidden font-sans select-none bg-neutral-950 ${inActiveRun ? '' : 'pt-14'}`}>
      
      {/* Background canvas representation */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Futuristic Scanline HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10 opacity-30" />
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 via-indigo-500 to-rose-500 opacity-60 animate-scanline pointer-events-none z-10" />

      {}
      <header className={`relative z-20 shrink-0 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between ${inActiveRun ? 'py-1.5 sm:py-2' : 'py-2 sm:py-3'}`}>
        <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0" onClick={() => setView('hub')}>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-gradient-to-tr from-violet-600 to-emerald-500 flex items-center justify-center font-black tracking-widest text-black text-xs sm:text-sm glow-green shrink-0">
            PR
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold tracking-[0.2em] sm:tracking-[0.25em] text-neutral-100 uppercase truncate">
              Purga <span className="text-violet-400">Rift</span>
            </h1>
            {!inActiveRun && (
            <p className="text-[10px] text-neutral-400 tracking-wider hidden sm:block truncate">"Trust Nothing. Predict Everything."</p>
            )}
          </div>
        </div>

        {/* HUD Currency & Sound Settings */}
        <div className="flex items-center space-x-3">
          <div className="bg-neutral-900/90 border border-violet-500/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center space-x-2 text-xs">
            <Coins className="w-3.5 h-3.5 text-yellow-400 animate-spin-slow" />
            <span className="font-bold text-yellow-300">{puurgaPoints} pts</span>
          </div>

          <button 
            onClick={() => {
              setMuted(!muted);
              synth.setMuted(!muted);
            }} 
            className="p-1 sm:p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
          </button>

          {view !== 'hub' && (
            <button 
              onClick={() => setView('hub')} 
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs hover:bg-neutral-800 text-neutral-300 transition"
            >
              Exit to Hub
            </button>
          )}
        </div>
      </header>

      {}
      <main className={`flex-1 min-h-0 relative z-20 max-w-7xl w-full mx-auto px-3 sm:px-4 flex flex-col justify-start ${inActiveRun ? 'py-2 overflow-hidden' : 'py-4 sm:py-6 integrated-game-scroll'}`}>
        
        {/* ================= VIEW: HUB / DASHBOARD ================= */}
        {view === 'hub' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fadeIn">
            
            {/* LEFT AREA: Profile Card, Titles & Play Buttons */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Premium Player Digital Card */}
              <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-neutral-900/95 to-neutral-950 p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-xl bg-violet-950/80 border border-violet-500 flex items-center justify-center text-3xl shadow-lg">
                      👁️
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-bold text-white tracking-wide">Puurga Operator</h2>
                        <span className="px-2 py-0.5 bg-violet-950 border border-violet-500 text-violet-300 text-[10px] rounded uppercase tracking-widest font-mono">
                          {activeTitle}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 font-mono">ID: {crypto.randomUUID().slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 text-center min-w-[70px]">
                      <span className="block text-xl font-extrabold text-white">43</span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Max Lvl</span>
                    </div>
                    <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 text-center min-w-[70px]">
                      <span className="block text-xl font-extrabold text-yellow-400">{puurgaPoints}</span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Points</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-800/60 mt-6 pt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Daily Rift Available
                  </span>
                  <span className="px-2 py-1 bg-amber-950/30 border border-amber-500/20 text-amber-400 text-xs rounded-md flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Boss Rift Active
                  </span>
                </div>
              </div>

              {/* Core Game Modes Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Standard Practice/Rift Run */}
                <div className="group relative rounded-xl border border-violet-500/20 bg-neutral-900/45 p-4 sm:p-6 hover:border-violet-500/60 transition duration-300 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-950/50 flex items-center justify-center mb-4">
                    </div>
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-violet-300 transition">Enter The Rift</h3>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                      Scale dynamically mutating visual signals. Build correct pattern strings, survive memory blackouts, and ignore deceptive matrix messages.
                    </p>
                  </div>
                  <button 
                    onClick={() => startNewGame('normal')}
                    className="mt-6 w-full py-2 sm:py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-violet-600/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    START DESCENT
                  </button>
                </div>

                {/* Instant Shadow Rift Option */}
                <div className="group relative rounded-xl border border-rose-500/20 bg-neutral-900/45 p-4 sm:p-6 hover:border-rose-500/60 transition duration-300 flex flex-col justify-between">
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-rose-950/80 border border-rose-500 text-rose-400 text-[9px] rounded font-mono uppercase tracking-widest">
                    3x Rewards
                  </div>
                  <div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rose-950/50 flex items-center justify-center mb-4">
                      <Skull className="w-5 h-5 text-rose-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-rose-300 transition">Shadow Rift Mode</h3>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                      Extreme difficulty mode. Dissonant visuals, highly deceptive guidelines, strict timers, and one-mistake instadeath threshold rules.
                    </p>
                  </div>
                  <button 
                    onClick={() => startNewGame('shadow')}
                    className="mt-6 w-full py-2 sm:py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm transition tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-600/20"
                  >
                    <Skull className="w-4 h-4" />
                    SURVIVAL RUN
                  </button>
                </div>

              </div>

              {/* Daily & Sunday Boss Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Daily Challenge Card */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-violet-400 font-mono tracking-widest uppercase block mb-1">24-Hour Trial</span>
                    <h4 className="text-sm font-bold text-white">Daily Unified Rift Puzzle</h4>
                    <p className="text-xs text-neutral-400 mt-1">Identical signals for all operators.</p>
                  </div>
                  <button 
                    onClick={() => startNewGame('normal')} 
                    className="p-2.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-violet-400 hover:text-white transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekly Sunday Boss Rift */}
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-neutral-900 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase block mb-1">Weekly Event</span>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Sunday Boss Rift
                      <Award className="w-4 h-4 text-amber-400" />
                    </h4>
                    <p className="text-xs text-neutral-400 mt-1">100 levels of pure predictive strategy.</p>
                  </div>
                  <button 
                    onClick={() => startNewGame('normal')} 
                    className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900 text-amber-300 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>

            {/* RIGHT AREA: Live Social Feed, Battles panel, Shop shortcut */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Rift Battles & Friends Arena */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800/80">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    Simulated Battles
                  </h3>
                  <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    AI Opponents
                  </span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {DEFAULT_FRIENDS.map((friend) => (
                    <div key={friend.id} className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-9 h-9 bg-neutral-900 border border-neutral-700 rounded-full flex items-center justify-center text-lg">
                          {friend.avatar}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-bold text-neutral-200">{friend.name}</h4>
                            <span className="text-[9px] text-violet-400 font-mono">{friend.badge}</span>
                          </div>
                          <p className="text-[10px] text-neutral-500">Peak Lvl: {friend.level}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => initiateSimulatedBattle(friend)}
                        className="px-2 py-1 bg-violet-950 hover:bg-violet-900 text-violet-300 text-[10px] font-bold uppercase rounded border border-violet-500/30 transition"
                      >
                        Duel
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-neutral-600 mt-3 text-center italic">Opponents are AI-simulated for practice. No real-time multiplayer available.</p>
              </div>

              {/* Quick Cosmetic Shop Redirection Banner */}
              <div className="rounded-xl bg-gradient-to-tr from-violet-900 to-indigo-950 p-5 border border-violet-500/30 text-center">
                <ShoppingBag className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white">Operator Customization</h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  Redeem Puurga Points for legendary custom themes, titles, and glowing profile effects.
                </p>
                <button 
                  onClick={() => setView('shop')}
                  className="mt-4 w-full py-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition"
                >
                  Enter Cosmetic Terminal
                </button>
              </div>

              {/* Game High scores Showcase */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase mb-3 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  Personal Best Scores
                </h4>
                <div className="space-y-2">
                  {localLeaderboard.slice(0, 5).length > 0 ? (
                    localLeaderboard.slice(0, 5).map((entry, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 border-b border-neutral-800/40 last:border-0">
                        <span className="text-neutral-300 font-medium">#{idx + 1} — Lvl {entry.level}</span>
                        <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400' : 'text-neutral-400'}`}>
                          {entry.score.toLocaleString()} pts
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-500 text-center py-2">No games played yet</p>
                  )}
                </div>
                <button 
                  onClick={() => setView('leaderboard')}
                  className="mt-3 text-[11px] text-violet-400 hover:underline block text-center w-full"
                >
                  View Full Standings
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ================= VIEW: THE RIFT CHAMBER (GAME CORE) ================= */}
        {view === 'game' && (
          <div className="h-full min-h-0 max-w-3xl w-full mx-auto animate-fadeIn flex flex-col items-stretch overflow-hidden">
            
            {/* Top HUD State indicators */}
            <div className="w-full shrink-0 bg-neutral-900/80 border border-neutral-800/60 rounded-xl p-1 sm:p-2 mb-1 sm:mb-2 flex items-center justify-between flex-wrap gap-1 sm:gap-2">
              
              {/* Score & Current Streak */}
              <div className="flex items-center space-x-4">
                <div>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-mono">Score</span>
                  <span className="text-sm sm:text-base font-extrabold text-white font-mono">{score}</span>
                </div>
                <div className="h-6 w-[1px] bg-neutral-800" />
                <div>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-mono">Level</span>
                  <span className="text-sm sm:text-base font-extrabold text-violet-400 font-mono">{level}</span>
                </div>
                <div className="h-6 w-[1px] bg-neutral-800" />
                <div className="flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-400">{streak} streak</span>
                </div>
              </div>

              {/* Active simulated Live Duel score update */}
              {activeBattleId && battleOpponent && (
                <div className="bg-neutral-950/80 border border-violet-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] text-neutral-400 uppercase font-mono block">Opponent: {battleOpponent.name}</span>
                    <span className="text-xs font-bold text-rose-400 font-mono">Lvl {battleOpponentLevel} ({battleOpponentScore} pts)</span>
                  </div>
                  <div className="text-[10px] bg-amber-950/80 text-amber-400 px-1.5 py-0.5 rounded font-mono font-black uppercase">
                    SIMULATED
                  </div>
                </div>
              )}

              {/* Trust Meter Progress bar */}
              <div className="flex flex-col min-w-[100px] sm:min-w-[120px]">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-widest">Trust</span>
                  <span className={`text-[10px] font-black font-mono ${trust <= 30 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                    {trust}%
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      gameMode === 'shadow' ? 'bg-gradient-to-r from-rose-600 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                    }`} 
                    style={{ width: `${trust}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Dynamic visual custom mode modifiers warnings */}
            {customEvent && (
              <div className="w-full mb-1 animate-bounce">
                {customEvent === 'Blackout' && (
                  <div className="bg-neutral-950 border border-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg text-[10px] text-center flex items-center justify-center gap-1.5">
                    <EyeOff className="w-3 h-3 text-violet-400 animate-pulse" />
                    <span><strong>BLACKOUT:</strong> Sequence hides in 2s. Memorize instantly!</span>
                  </div>
                )}
                {customEvent === 'Mirror' && (
                  <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-[10px] text-center flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span><strong>MIRROR:</strong> Button layout reversed!</span>
                  </div>
                )}
                {customEvent === 'TimeCollapse' && (
                  <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg text-[10px] text-center flex items-center justify-center gap-1.5">
                    <Zap className="w-3 h-3 text-rose-500" />
                    <span><strong>TIME COLLAPSE:</strong> Countdown tripled!</span>
                  </div>
                )}
                {customEvent === 'RiftStorm' && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg text-[10px] text-center flex items-center justify-center gap-1.5">
                    <Award className="w-3 h-3 text-emerald-500 animate-spin-slow" />
                    <span><strong>RIFT STORM:</strong> Double points active!</span>
                  </div>
                )}
              </div>
            )}

            {/* MAIN GAME STAGE VIEWPORT CARD */}
            <div className={`w-full flex-1 min-h-0 relative rounded-xl sm:rounded-2xl border ${
              gameMode === 'shadow' ? 'border-rose-600 bg-black' : 'border-neutral-800 bg-neutral-950/90'
            } p-1 sm:p-3 text-center flex flex-col items-center justify-center shadow-2xl overflow-hidden touch-manipulation`}>
              
              {/* Scanline flickering overlay for Shadow rift mode */}
              {gameMode === 'shadow' && (
                <div className="absolute inset-0 bg-red-950/5 pointer-events-none animate-pulse" />
              )}

              {/* Timer Progress Ring Bar */}
              <div className="absolute top-2 right-2 flex items-center space-x-1 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                <span className="text-neutral-500">TTL:</span>
                <span className={`font-bold ${timerLeft <= 4 ? 'text-rose-500 animate-ping' : 'text-emerald-400'}`}>
                  {timerLeft}s
                </span>
              </div>

              {/* Header Context Indicator */}
              <div className="mb-1 sm:mb-1 shrink-0">
                <span className={`text-[10px] sm:text-xs font-mono uppercase tracking-widest ${
                  gameMode === 'shadow' ? 'text-rose-500 font-extrabold' : 'text-violet-400'
                }`}>
                  {gameMode === 'shadow' ? '⚡ SHADOW RIFT ⚡' : `PHASE ${Math.ceil(level / 10)}: LVL ${level}`}
                </span>
                <h3 className="text-base sm:text-xl font-bold text-white mt-1">
                  {isMemorySequence ? 'Replicate Sequence' : 'Decipher the Pattern'}
                </h3>
              </div>

              {/* Simon Sequential Flash Display */}
              {isMemorySequence ? (
                <div className="flex flex-wrap justify-center gap-1 sm:gap-2 my-1 sm:my-2">
                  {simonTarget.map((symbol, i) => {
                    const isFlashed = simonFlashingIdx === i;
                    const hasPassed = simonPlayerProgress.length > i;
                    return (
                      <div 
                        key={i} 
                        className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center text-lg sm:text-xl transition-all duration-300 ${
                          isFlashed 
                            ? 'bg-violet-600 border-violet-400 scale-110 shadow-lg shadow-violet-500/30' 
                            : hasPassed 
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-neutral-400' 
                              : 'bg-neutral-900/60 border-neutral-800 text-neutral-600'
                        }`}
                      >
                        {isFlashed || hasPassed ? symbol : '❓'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Standard Pattern sequence display layout */
                <div className="w-full">
                  <div className={`flex flex-wrap justify-center gap-1 sm:gap-2 my-1 sm:my-2 transition-opacity duration-500 ${blackoutVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {currentPattern.map((item, index) => (
                      <div 
                        key={index} 
                        className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-lg font-bold font-mono border ${
                          gameMode === 'shadow' 
                            ? 'bg-neutral-900/90 border-rose-500/40 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                            : 'bg-neutral-900 border-neutral-800 text-white'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                    
                    {/* The missing/predicted target block */}
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-lg font-black border border-violet-500/60 bg-violet-950/30 text-violet-300 animate-pulse">
                      ?
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic deception HUD alerts */}
              {deceptionHint && (
                <div className={`w-full max-w-md p-2 rounded-lg border text-left my-1 ${
                  deceptionHint.integrity === 'PURE' 
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/20 text-rose-300 animate-pulse'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                      SIGNAL INTEGRITY: {deceptionHint.integrity}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{deceptionHint.text}</p>
                </div>
              )}

            </div>

            {/* PLAYER SELECTION INTERACTIVE BUTTONS */}
            <div className="w-full shrink-0 mt-1 sm:mt-2 pb-1">
              <span className="block text-center text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest font-mono mb-1 sm:mb-1">
                Select Predicted Output
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">
                {(inputReversed ? [...options].reverse() : options).map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerEvaluation(opt)}
                    className={`min-h-[36px] sm:min-h-[40px] p-1 sm:p-2 rounded-xl border text-sm sm:text-base font-bold font-mono flex items-center justify-center transition-all active:scale-95 duration-150 touch-manipulation ${
                      gameMode === 'shadow'
                        ? 'bg-neutral-950 border-rose-600 hover:bg-rose-950/40 text-rose-300 shadow-md hover:shadow-rose-500/20'
                        : 'bg-neutral-900 border-neutral-800 hover:border-violet-500 hover:bg-neutral-800 text-white shadow-lg'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= VIEW: THE REWARDS / TITLE SHOP TERMINAL ================= */}
        {view === 'shop' && (
          <div className="max-w-4xl w-full mx-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-wide">Rift Customization Terminal</h2>
                <p className="text-xs text-neutral-400 mt-1">Redeem your hard-earned Puurga Points for permanent profile tags & styling adjustments</p>
              </div>

              {/* Wallet tracker */}
              <div className="bg-neutral-900 border border-violet-500/30 px-4 py-2 rounded-xl flex items-center space-x-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-black text-yellow-300">{puurgaPoints} Puurga Points</span>
              </div>
            </div>

            {/* GRID OF COSMETICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SHOP_ITEMS.map((item) => {
                const isUnlocked = unlockedCosmetics.includes(item.id);
                const isActive = activeTheme === item.id || activeTitle === item.label;

                return (
                  <div 
                    key={item.id} 
                    className={`relative rounded-xl border bg-neutral-900/50 p-4 sm:p-5 flex flex-col justify-between transition duration-200 ${
                      isActive ? 'border-violet-500 shadow-lg shadow-violet-600/10' : 'border-neutral-800'
                    }`}
                  >
                    <div>
                      {/* Rarity Tag */}
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest ${
                        item.rarity === 'Legendary' ? 'bg-rose-950 text-rose-400' :
                        item.rarity === 'Epic' ? 'bg-violet-950 text-violet-400' :
                        item.rarity === 'Rare' ? 'bg-cyan-950 text-cyan-400' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {item.rarity}
                      </span>

                      {/* Title Display or Visual representation box */}
                      {item.type === 'theme' ? (
                        <div className={`w-full h-12 rounded-lg border bg-gradient-to-r ${item.previewColor} my-3 opacity-80`} />
                      ) : (
                        <div className="w-full py-2 px-3 rounded bg-neutral-950 border border-neutral-800 text-center font-mono text-xs text-violet-400 my-3 font-bold">
                          [{item.label}]
                        </div>
                      )}

                      <h3 className="text-sm font-bold text-white mt-2">{item.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                        {isUnlocked ? 'Owned' : `${item.price} pts`}
                      </span>

                      {isUnlocked ? (
                        <button
                          disabled={isActive}
                          onClick={() => {
                            if (item.type === 'theme') setActiveTheme(item.id);
                            else if (item.type === 'title') setActiveTitle(item.label);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
isActive
                              ? 'bg-neutral-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-white hover:bg-neutral-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={puurgaPoints < item.price}
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider transition ${
                            puurgaPoints >= item.price
                              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                          }`}
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= VIEW: STANDINGS / LEADERBOARD ================= */}
        {view === 'leaderboard' && (
          <div className="max-w-3xl w-full mx-auto animate-fadeIn bg-neutral-900/90 rounded-2xl border border-neutral-800 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-neutral-800">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <div>
                <h2 className="text-xl font-extrabold text-white">Personal Best Scores</h2>
                <p className="text-xs text-neutral-400">Your top scores tracked locally on this device</p>
              </div>
            </div>

            <div className="space-y-3">
              {localLeaderboard.length > 0 ? (
                localLeaderboard.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 sm:p-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className={`text-xs sm:text-sm font-mono font-bold w-6 ${
                        idx === 0 ? 'text-yellow-400 text-lg' : idx === 1 ? 'text-neutral-300' : idx === 2 ? 'text-amber-600' : 'text-neutral-500'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">Run #{localLeaderboard.length - idx}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block">Level {entry.level}</span>
                      </div>
                    </div>

                    <span className="text-sm font-mono font-black text-yellow-400 tracking-wide">
                      {entry.score.toLocaleString()} pts
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No scores yet. Start a run to set your first personal best!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW: GAME OVER / OUTCOME TERMINATION SUMMARY ================= */}
        {view === 'gameover' && (
          <div className="max-w-xl w-full mx-auto text-center animate-fadeIn flex flex-col items-center justify-center py-12">
            
            <div className="relative mb-6">
              <div className="absolute inset-0 w-24 h-24 bg-rose-600/10 rounded-full blur-xl pointer-events-none mx-auto" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-950/40 border border-rose-500 flex items-center justify-center mx-auto shadow-lg">
                <Skull className="w-10 h-10 text-rose-500" />
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-wide uppercase">Rift Connection Terminated</h2>
            <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
              Your consciousness returned to normal coordinates. You withstood mutations and distortions up to:
            </p>

            {/* Performance Stats Dashboard Grid */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm my-8">
              <div className="bg-neutral-900 border border-neutral-800 p-3 sm:p-4 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">Survived Levels</span>
                <span className="text-3xl font-black text-violet-400 font-mono block mt-1">{level}</span>
                <span className="text-[9px] text-neutral-400 block mt-1 font-sans">Beating 97% of operators</span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-3 sm:p-4 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-mono">Final High Score</span>
                <span className="text-3xl font-black text-yellow-400 font-mono block mt-1">{score}</span>
                <span className="text-[9px] text-neutral-400 block mt-1 font-sans">Puurga points secured</span>
              </div>
            </div>

            {/* Simulated Live Duel Battle Recap Outcome */}
            {activeBattleId && battleOpponent && (
              <div className="w-full max-w-sm bg-neutral-900/80 border border-violet-500/20 p-4 rounded-xl mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Live Battle Duel Recap</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    score > battleOpponentScore ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                  }`}>
                    {score > battleOpponentScore ? 'VICTORY' : 'DEFEAT'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="text-left">
                    <span className="text-xs font-bold text-neutral-300 block">Your Score</span>
                    <span className="text-lg font-mono font-extrabold text-white">{score}</span>
                  </div>
                  <div className="text-neutral-600 font-bold">VS</div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-neutral-300 block">{battleOpponent.name}</span>
                    <span className="text-lg font-mono font-extrabold text-rose-400">{battleOpponentScore}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button 
                onClick={() => startNewGame('normal')}
                className="flex-1 py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10"
              >
                <RotateCcw className="w-4 h-4" />
                DESCENT AGAIN
              </button>

              <button 
                onClick={() => setView('hub')}
                className="flex-1 py-2.5 sm:py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 font-semibold rounded-xl text-sm transition"
              >
                EXIT TO MAIN HUB
              </button>
            </div>

            {/* Viral Social Share Element */}
            <div className="mt-8 border-t border-neutral-800/80 pt-6 w-full max-w-xs flex flex-col items-center">
              <span className="text-xs text-neutral-500 mb-3 flex items-center gap-1.5 font-mono">
                <Share2 className="w-3.5 h-3.5" />
                CHALLENGE YOUR CIRCLE
              </span>
              <button 
                onClick={() => {
                  synth.playSuccess();
                  navigator.clipboard.writeText(`I survived level ${level} in PURGA RIFT. Can you defeat the dimension prediction patterns? Play now!`);
                }}
                className="px-4 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs tracking-wider transition uppercase"
              >
                Copy Challenge Invite Link
              </button>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}