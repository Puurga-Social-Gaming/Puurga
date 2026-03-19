import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Target, Play, RotateCcw, Award, ArrowLeft, Coins } from 'lucide-react';
import { useCredits } from '../hooks/useCredits';
import { toast } from 'react-hot-toast';

/**
 * PATH OF THE WATCHMAN
 * A premium, fast-paced action game for social media.
 * Themes: Clarity vs Chaos, Order vs Corruption.
 */

const COLORS = {
    bg: '#0b0b0b',
    surface: '#1a1a1a',
    surfaceAlt: '#2a2a2a',
    accent: '#f97316', // Watchman Orange
    text: '#ffffff',
    enemy: '#4b5563', // Muted grey for corruption
    player: '#ffffff',
};

const GAME_CONFIG = {
    WIDTH: 800,
    HEIGHT: 500,
    PLAYER_SIZE: 30,
    SHIELD_COOLDOWN: 5000,
    FOCUS_COOLDOWN: 15000,
    RUN_TIME_MAX: 120000, // 120 seconds
};

const PathOfTheWatchman = () => {
    const navigate = useNavigate();
    const { addCredits, balance: userBalance } = useCredits();

    // Game State
    const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [shieldActive, setShieldActive] = useState(false);
    const [focusActive, setFocusActive] = useState(false);
    const [cooldowns, setCooldowns] = useState({ shield: 0, focus: 0 });
    const [combo, setCombo] = useState(0);
    const [finalCredits, setFinalCredits] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const awardedRef = useRef(false);
    const healthRef = useRef(100);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const shakeTimeoutRef = useRef<number | null>(null);
    const pausedRef = useRef(false);

    // Canvas Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const pointerDownRef = useRef(false);

    // Game Engine Refs (Mutable data to avoid React render cycles)
    const engine = useRef<any>({
        player: { x: 100, y: 250, vx: 0, vy: 0, targetX: 100, targetY: 250 },
        enemies: [],
        projectiles: [],
        particles: [],
        frame: 0,
        lastTime: 0,
        spawnTimer: 0,
        difficulty: 1,
        comboTimer: 0,
        startTime: 0,
    });

    const resetEngine = () => {
        engine.current = {
            player: { x: 100, y: 250, vx: 0, vy: 0, targetX: 100, targetY: 250 },
            enemies: [],
            projectiles: [],
            particles: [],
            frame: 0,
            lastTime: performance.now(),
            spawnTimer: 0,
            difficulty: 1,
            comboTimer: 0,
            startTime: performance.now(),
        };
        setScore(0);
        setHealth(100);
        healthRef.current = 100;
        setCombo(0);
        setCooldowns({ shield: 0, focus: 0 });
        setShieldActive(false);
        setFocusActive(false);
        setElapsedMs(0);
        awardedRef.current = false;
    };

    useEffect(() => {
        healthRef.current = health;
    }, [health]);

    // --- Core Game Logic ---

    const spawnEnemy = (diff: number) => {
        const roll = Math.random();
        const t = Math.min(1, diff / 10);

        let type = 'Walker';
        let hp = 1;
        let speed = 2.0 + Math.random() * 1.8 + t * 0.8;
        let size = 25;

        if (roll < 0.08 + t * 0.08) {
            type = 'Bomber';
            hp = 2;
            speed = 2.2 + t * 1.2;
            size = 32;
        } else if (roll < 0.18 + t * 0.12) {
            type = 'Zigzag';
            hp = 1;
            speed = 2.4 + t * 1.3;
            size = 22;
        } else if (roll < 0.38 + t * 0.1) {
            type = 'Deceiver';
            hp = 1;
            speed = 4.8 + t * 1.6;
            size = 20;
        } else if (roll < 0.52 + t * 0.1) {
            type = 'Sentinel';
            hp = 3;
            speed = 1.6 + t * 0.4;
            size = 40;
        }

        return {
            id: Math.random(),
            x: GAME_CONFIG.WIDTH + 50,
            y: 50 + Math.random() * (GAME_CONFIG.HEIGHT - 100),
            type,
            hp,
            maxHp: hp,
            speed,
            size,
            zigzagPhase: Math.random() * Math.PI * 2,
            nearMissCounted: false,
            color: type === 'Sentinel' ? '#374151' : type === 'Bomber' ? '#374151' : '#4b5563'
        };
    };

    const shake = useCallback((strength = 3) => {
        const el = canvasContainerRef.current;
        if (!el) return;
        const x = (Math.random() * 2 - 1) * strength;
        const y = (Math.random() * 2 - 1) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
        if (shakeTimeoutRef.current) {
            window.clearTimeout(shakeTimeoutRef.current);
        }
        shakeTimeoutRef.current = window.setTimeout(() => {
            el.style.transform = 'none';
            shakeTimeoutRef.current = null;
        }, 70);
    }, []);

    const createParticles = (x: number, y: number, color: string, count = 5) => {
        for (let i = 0; i < count; i++) {
            engine.current.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const e = engine.current;

        // Clear background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid Effect
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width + 40; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i - (e.frame % 40), 0);
            ctx.lineTo(i - (e.frame % 40), canvas.height);
            ctx.stroke();
        }

        if (gameState === 'START') {
            // Draw idle player even when not playing
            ctx.save();
            ctx.translate(e.player.x, e.player.y);
            ctx.fillStyle = COLORS.player;
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-10, -15); ctx.lineTo(-10, 15); ctx.closePath();
            ctx.fill();
            ctx.restore();
            return;
        }

        // Focus Mode Overlay
        if (focusActive) {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Particles
        e.particles.forEach((p: any) => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;

        // Enemies
        e.enemies.forEach((enemy: any) => {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            if (enemy.type === 'Sentinel') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#4b5563';
            }
            ctx.fillStyle = enemy.color;
            if (enemy.type === 'Walker') {
                ctx.fillRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
            } else if (enemy.type === 'Deceiver') {
                ctx.beginPath();
                ctx.moveTo(0, -enemy.size / 2); ctx.lineTo(enemy.size / 2, 0);
                ctx.lineTo(0, enemy.size / 2); ctx.lineTo(-enemy.size / 2, 0);
                ctx.closePath(); ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(0, 0, enemy.size / 2, 0, Math.PI * 2); ctx.fill();
            }
            if (enemy.maxHp > 1) {
                ctx.fillStyle = '#333';
                ctx.fillRect(-15, -enemy.size - 5, 30, 4);
                ctx.fillStyle = COLORS.accent;
                ctx.fillRect(-15, -enemy.size - 5, 30 * (enemy.hp / enemy.maxHp), 4);
            }
            ctx.restore();
        });

        // Projectiles
        ctx.fillStyle = COLORS.accent;
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.accent;
        e.projectiles.forEach((p: any) => { ctx.fillRect(p.x, p.y - 2, 15, 4); });
        ctx.shadowBlur = 0;

        // Player
        ctx.save();
        ctx.translate(e.player.x, e.player.y);
        if (shieldActive) {
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'; ctx.fill();
        }
        ctx.fillStyle = COLORS.player;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(-10, -15); ctx.lineTo(-10, 15); ctx.closePath();
        ctx.fill();
        ctx.restore();
    }, [gameState, shieldActive, focusActive]);

    const update = useCallback((time: number) => {
        if (gameState !== 'PLAYING') {
            draw();
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        if (pausedRef.current) {
            // Keep rendering without advancing simulation while the tab is blurred/hidden
            engine.current.lastTime = time;
            draw();
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        const dt = time - engine.current.lastTime;
        engine.current.lastTime = time;
        engine.current.frame++;

        const e = engine.current;
        const timeScale = focusActive ? 0.3 : 1.0;

        // Movement
        const dx = e.player.targetX - e.player.x;
        e.player.x += dx * 0.15;
        const dy = e.player.targetY - e.player.y;
        e.player.y += dy * 0.15;

        const runMs = Math.max(0, time - (e.startTime || time));
        const clampedRunMs = Math.min(GAME_CONFIG.RUN_TIME_MAX, runMs);
        setElapsedMs(clampedRunMs);
        e.difficulty = 1 + runMs / 8000;

        if (runMs >= GAME_CONFIG.RUN_TIME_MAX) {
            setGameState('GAMEOVER');
        }

        // Spawning
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0) {
            const spawnCount = 1 + Math.floor(e.difficulty / 4);
            for (let k = 0; k < spawnCount; k++) {
                e.enemies.push(spawnEnemy(e.difficulty));
            }
            e.spawnTimer = Math.max(250, 1200 - (e.difficulty * 85));
        }

        // Update Enemies
        for (let i = e.enemies.length - 1; i >= 0; i--) {
            const enemy = e.enemies[i];
            enemy.speed += (e.difficulty * 0.0005) * dt;
            enemy.x -= enemy.speed * timeScale;
            if (enemy.type === 'Deceiver') enemy.y += Math.sin(e.frame * 0.1) * 3;
            if (enemy.type === 'Zigzag') {
                enemy.y += Math.sin((e.frame * 0.12) + (enemy.zigzagPhase || 0)) * (4 + e.difficulty * 0.4);
            }

            const nearMissDist = enemy.size / 2 + GAME_CONFIG.PLAYER_SIZE / 2 + 26;
            const dist = Math.hypot(enemy.x - e.player.x, enemy.y - e.player.y);
            if (!enemy.nearMissCounted && dist < nearMissDist && dist >= (enemy.size / 2 + GAME_CONFIG.PLAYER_SIZE / 2)) {
                enemy.nearMissCounted = true;
                setScore(s => s + 5);
                shake(2);
            }

            if (dist < (enemy.size / 2 + GAME_CONFIG.PLAYER_SIZE / 2)) {
                if (shieldActive) {
                    createParticles(enemy.x, enemy.y, COLORS.accent, 10);
                    e.enemies.splice(i, 1);
                    setScore(s => s + 50);
                } else {
                    const damage = enemy.type === 'Sentinel' ? 20 : 10;
                    setHealth(h => {
                        const next = Math.max(0, h - damage);
                        if (next === 0) {
                            setGameState('GAMEOVER');
                        }
                        return next;
                    });
                    createParticles(e.player.x, e.player.y, '#ff4444', 10);
                    e.enemies.splice(i, 1);
                    setCombo(0);
                }
            } else {
                const passedShooterX = e.player.x - (GAME_CONFIG.PLAYER_SIZE / 2) - (enemy.size / 2);
                if (enemy.x < passedShooterX) {
                    if (!shieldActive) {
                        const damage = enemy.type === 'Sentinel' ? 12 : 6;
                        setHealth(h => {
                            const next = Math.max(0, h - damage);
                            if (next === 0) {
                                setGameState('GAMEOVER');
                            }
                            return next;
                        });
                        createParticles(e.player.x, e.player.y, '#ff4444', 8);
                        shake(2);
                        setCombo(0);
                    }
                    e.enemies.splice(i, 1);
                } else if (enemy.x < -100) {
                    e.enemies.splice(i, 1);
                }
            }
        }

        if (e.enemies.length > 180) {
            e.enemies.splice(0, e.enemies.length - 180);
        }

        // Update Projectiles
        for (let i = e.projectiles.length - 1; i >= 0; i--) {
            const p = e.projectiles[i];
            p.x += p.vx * timeScale;
            let hit = false;
            for (let j = e.enemies.length - 1; j >= 0; j--) {
                const enemy = e.enemies[j];
                if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.size) {
                    enemy.hp--;
                    createParticles(p.x, p.y, COLORS.accent, 5);
                    hit = true;
                    if (enemy.hp <= 0) {
                        if (enemy.type === 'Bomber') {
                            for (let s = 0; s < 2; s++) {
                                e.enemies.push({
                                    ...spawnEnemy(Math.max(1, e.difficulty * 0.8)),
                                    type: 'Deceiver',
                                    hp: 1,
                                    maxHp: 1,
                                    size: 18,
                                    speed: (enemy.speed || 3) + 1.5 + Math.random() * 1.5,
                                    x: enemy.x + (Math.random() * 20 - 10),
                                    y: enemy.y + (Math.random() * 20 - 10),
                                });
                            }
                            shake(3);
                        }
                        e.enemies.splice(j, 1);
                        setScore(s => s + (enemy.type === 'Sentinel' ? 300 : 100));
                        setCombo(c => c + 1);
                        e.comboTimer = 2000;
                    }
                    break;
                }
            }
            if (hit || p.x > GAME_CONFIG.WIDTH + 50) e.projectiles.splice(i, 1);
        }

        // Particles
        for (let i = e.particles.length - 1; i >= 0; i--) {
            const p = e.particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.02;
            if (p.life <= 0) e.particles.splice(i, 1);
        }

        if (e.comboTimer > 0) {
            e.comboTimer -= dt;
            if (e.comboTimer <= 0) setCombo(0);
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [gameState, shieldActive, focusActive, draw]);

    // Interactions
    const handleAttack = useCallback(() => {
        if (gameState !== 'PLAYING') return;
        engine.current.projectiles.push({
            x: engine.current.player.x + 20,
            y: engine.current.player.y,
            vx: 12,
        });
    }, [gameState]);

    const triggerShield = () => {
        if (cooldowns.shield > 0 || gameState !== 'PLAYING') return;
        setShieldActive(true);
        setCooldowns(c => ({ ...c, shield: 100 }));
        engine.current.enemies.forEach((en: any) => {
            if (Math.hypot(en.x - engine.current.player.x, en.y - engine.current.player.y) < 150) {
                en.x += 100;
                createParticles(en.x, en.y, COLORS.accent, 3);
            }
        });
        setTimeout(() => setShieldActive(false), 2000);
        const interval = setInterval(() => {
            setCooldowns(c => {
                if (c.shield <= 0) { clearInterval(interval); return { ...c, shield: 0 }; }
                return { ...c, shield: c.shield - 2 };
            });
        }, 100);
    };

    const triggerFocus = () => {
        if (cooldowns.focus > 0 || gameState !== 'PLAYING') return;
        setFocusActive(true);
        setCooldowns(c => ({ ...c, focus: 100 }));
        setTimeout(() => setFocusActive(false), 3000);
        const interval = setInterval(() => {
            setCooldowns(c => {
                if (c.focus <= 0) { clearInterval(interval); return { ...c, focus: 0 }; }
                return { ...c, focus: c.focus - 0.7 };
            });
        }, 100);
    };

    const startGame = () => {
        resetEngine();
        setGameState('PLAYING');
    };

    const updatePointerTarget = useCallback((clientX: number, clientY: number) => {
        if (gameState !== 'PLAYING') return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const half = GAME_CONFIG.PLAYER_SIZE / 2;
        engine.current.player.targetX = Math.max(half, Math.min(GAME_CONFIG.WIDTH - half, x));
        engine.current.player.targetY = Math.max(half, Math.min(GAME_CONFIG.HEIGHT - half, y));
    }, [gameState]);

    const handleCanvasMove = (e: any) => {
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX === undefined || clientY === undefined) return;
        updatePointerTarget(clientX, clientY);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (gameState !== 'PLAYING') return;
        pointerDownRef.current = true;

        // Prevent scroll/zoom gestures while interacting with the canvas
        e.preventDefault();

        // Capture pointer so dragging stays responsive even if finger leaves the canvas
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        updatePointerTarget(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (gameState !== 'PLAYING') return;
        if (e.pointerType === 'touch' && !pointerDownRef.current) return;
        updatePointerTarget(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (gameState !== 'PLAYING') return;
        pointerDownRef.current = false;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const onMouseMove = (e: MouseEvent) => {
            updatePointerTarget(e.clientX, e.clientY);
        };

        const onTouchMove = (e: TouchEvent) => {
            const t = e.touches?.[0];
            if (!t) return;
            updatePointerTarget(t.clientX, t.clientY);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove, { passive: true });

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, [gameState, updatePointerTarget]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [update]);

    useEffect(() => {
        const pause = () => {
            if (gameState !== 'PLAYING') return;
            pausedRef.current = true;
        };

        const resume = () => {
            if (gameState !== 'PLAYING') return;
            pausedRef.current = false;
            engine.current.lastTime = performance.now();
        };

        const onVisibilityChange = () => {
            if (document.hidden) pause();
            else resume();
        };

        window.addEventListener('blur', pause);
        window.addEventListener('focus', resume);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('blur', pause);
            window.removeEventListener('focus', resume);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [gameState]);

    useEffect(() => {
        return () => {
            if (shakeTimeoutRef.current) {
                window.clearTimeout(shakeTimeoutRef.current);
                shakeTimeoutRef.current = null;
            }
        };
    }, []);

    // Award Credits Integration
    useEffect(() => {
        if (gameState === 'GAMEOVER') {
            const calcCredits = Math.floor((score / 10) * (1 + combo * 0.1));
            setFinalCredits(calcCredits);

            // Award credits exactly once per game over
            if (calcCredits > 0 && !awardedRef.current) {
                addCredits(calcCredits, 'Path of the Watchman Reward');
                toast.success(`Earned ${calcCredits} credits!`);
                awardedRef.current = true;
            }
        }
    }, [gameState, score, combo, addCredits]);

    const CooldownButton = ({ icon: Icon, label, progress, onClick, color = COLORS.accent }: any) => (
        <button
            onClick={onClick}
            disabled={progress > 0}
            className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1
    ${progress > 0 ? 'border-gray-800 bg-gray-900 opacity-50' : 'border-gray-700 bg-gray-800 active:scale-95'}`}
        >
            <Icon size={24} color={progress > 0 ? '#4b5563' : color} />
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</span>
            {progress > 0 && (
                <div className="absolute bottom-0 left-0 h-1 bg-orange-500 transition-all duration-100" style={{ width: `${progress}%` }} />
            )}
        </button>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans select-none relative" style={{ backgroundColor: COLORS.bg, color: COLORS.text }}>

            {/* Back Button and Balance (Integrated from Platform) */}
            <div className="w-full max-w-[800px] mb-6 flex justify-between items-center z-10">
                <button
                    onClick={() => navigate('/puurga-games')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-800 transition-all hover:scale-105 text-white"
                >
                    <ArrowLeft size={16} />
                    <span className="font-bold text-xs uppercase tracking-widest">Back</span>
                </button>

                <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-full">
                    <Coins className="text-yellow-500 w-4 h-4" />
                    <span className="font-bold text-sm text-white">{userBalance.toLocaleString()} CR</span>
                </div>
            </div>

            {/* Game Header */}
            <div className="w-full max-w-[800px] flex justify-between items-end mb-4 px-2">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter uppercase italic">
                        Path of the <span style={{ color: COLORS.accent }}>Watchman</span>
                    </h1>
                    <div className="flex gap-4 mt-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Health</span>
                            <div className="w-32 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${health}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Combo</span>
                            <span className="text-lg font-black leading-none" style={{ color: combo > 5 ? COLORS.accent : 'white' }}>x{combo}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Time</span>
                            <span className="text-sm font-black leading-none text-white">
                                {String(Math.floor(elapsedMs / 60000)).padStart(2, '0')}:{String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Threat</span>
                            <span className="text-sm font-black leading-none" style={{ color: COLORS.accent }}>
                                {Math.min(99, Math.max(1, Math.floor(engine.current?.difficulty || 1)))}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Score</span>
                    <div className="text-3xl font-black tracking-widest leading-none">{score.toLocaleString()}</div>
                </div>
            </div>

            <div
                ref={canvasContainerRef}
                className={`relative group overflow-hidden rounded-2xl border border-gray-800 shadow-2xl ${gameState === 'PLAYING' ? 'cursor-none' : 'cursor-crosshair'}`}
                style={{
                    touchAction: 'none',
                    overscrollBehavior: 'contain',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={GAME_CONFIG.WIDTH}
                    height={GAME_CONFIG.HEIGHT}
                    onMouseMove={handleCanvasMove}
                    onTouchMove={handleCanvasMove}
                    onClick={handleAttack}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="max-w-full h-auto block bg-black touch-none"
                />

                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                        <div className="mb-6 p-4 rounded-full bg-orange-500/10 border border-orange-500/20">
                            <Shield size={48} className="text-orange-500 animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">The Path Awaits</h2>
                        <p className="text-gray-400 max-w-md mb-8 text-sm leading-relaxed">Navigate the chaos. Use your light to strike down corruption.</p>
                        <button onClick={startGame} className="px-10 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-2">
                            <Play size={20} fill="currentColor" /> Initialize Run
                        </button>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
                        <h2 className="text-gray-500 uppercase tracking-widest font-bold text-sm mb-2">Run Concluded</h2>
                        <div className="text-6xl font-black text-white mb-6 italic tracking-tighter">DISCONNECTED</div>
                        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Score</span>
                                <span className="text-2xl font-black">{score}</span>
                            </div>
                            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-orange-400">Credits</span>
                                <span className="text-2xl font-black text-orange-500">+{finalCredits}</span>
                            </div>
                        </div>
                        <button onClick={startGame} className="w-full max-w-xs py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                            <RotateCcw size={18} /> Retry Run
                        </button>
                    </div>
                )}
            </div>

            <div className="w-full max-w-[800px] mt-6 grid grid-cols-3 gap-4">
                <CooldownButton icon={Shield} label="Shield Burst" progress={cooldowns.shield} onClick={triggerShield} />
                <CooldownButton icon={Zap} label="Focus Mode" progress={cooldowns.focus} onClick={triggerFocus} />
                <button
                    onClick={handleAttack}
                    disabled={gameState !== 'PLAYING'}
                    className={`p-4 rounded-xl border flex flex-col justify-center items-center transition-all active:scale-95
                    ${gameState !== 'PLAYING' ? 'border-gray-800 bg-gray-900 opacity-50' : 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'}`}
                    aria-label="Attack"
                >
                    <Target size={20} className={gameState !== 'PLAYING' ? 'text-gray-500 mb-1' : 'text-orange-400 mb-1'} />
                    <span className={`text-[10px] uppercase font-bold tracking-widest text-center leading-none ${gameState !== 'PLAYING' ? 'text-gray-500' : 'text-orange-300'}`}>
                        Attack
                    </span>
                </button>
            </div>

            <div className="mt-8 flex gap-6 items-center text-gray-600">
                <div className="flex items-center gap-1"><Award size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Daily Limit: 450/1000 CR</span></div>
                <div className="flex items-center gap-1"><Target size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Rank: Sentinel III</span></div>
            </div>

            <style>
                {`
      @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .animate-pulse { animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    `}
            </style>
        </div>
    );
};

export default PathOfTheWatchman;
