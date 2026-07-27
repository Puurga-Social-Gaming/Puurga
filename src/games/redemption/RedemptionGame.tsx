import { useState, useEffect, useRef } from 'react';
import {
    Shield,
    Zap,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCcw,
    Trophy,
    Scale,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCredits } from '../../shared/economy/useCredits';
import { GAME_ECONOMY } from '../../shared/economy/GameEconomy';

/**
 * REDEMPTION: PATHS OF RESTORATION
 * Integrated with Central Credit System
 */

// --- CONFIGURATION & DATA ---

const GAME_CONFIG = {
    maxDailyPlays: 5,
    streakMultiplier: 0.1,
    timeLimit: 15,
    questionsPerSession: 3,
    tokenThreshold: 5,
    // Base scores are now handled by GameEconomy, but we keep this for local calculation
    baseScore: 50
};

// Use costs from Central Economy
const COSTS = GAME_ECONOMY.REDEMPTION.costs || {
    purgeReduction: 150,
    removeGhost: 600,
    intercession: 300,
};

const SCENARIOS = [
    {
        id: 1,
        category: "Restraint",
        text: "A rival influencer posts a half-truth that damages your reputation. The community is waiting for your reaction. You have damaging information on them.",
        choices: [
            { id: 'a', text: "Release the information to balance the scales.", correct: false, feedback: "Escalation breeds chaos. The cycle continues." },
            { id: 'b', text: "Publicly refute the lie with evidence, but ignore their flaws.", correct: true, feedback: "Truth defense without malice restores order." },
            { id: 'c', text: "Mock them satirically to win the crowd.", correct: false, feedback: "Mockery erodes your own dignity." },
            { id: 'd', text: "Stay silent and hope it passes.", correct: false, feedback: "Silence in the face of falsehood can be mistaken for guilt." }
        ]
    },
    {
        id: 2,
        category: "Mercy",
        text: "You see a user being 'purged' (banned) in the public square for a mistake they admitted to. The crowd is cheering for their removal.",
        choices: [
            { id: 'a', text: "Join the crowd to signal your own virtue.", correct: false, feedback: "Crowd justice lacks discernment." },
            { id: 'b', text: "Privately message them support but say nothing public.", correct: false, feedback: "Cowardice is not mercy." },
            { id: 'c', text: "Publicly call for a second chance, risking your own score.", correct: true, feedback: "Mercy requires risk. You stood in the gap." },
            { id: 'd', text: "Report them again to ensure they are gone.", correct: false, feedback: "Severity without purpose is cruelty." }
        ]
    },
    {
        id: 3,
        category: "Truth",
        text: "You discover a glitch that generates free Redemption Credits. No one is watching.",
        choices: [
            { id: 'a', text: "Farm the credits to help your friends.", correct: false, feedback: "Good ends do not justify corrupt means." },
            { id: 'b', text: "Ignore it and keep playing.", correct: false, feedback: "Passive observation allows the flaw to remain." },
            { id: 'c', text: "Report the glitch immediately to admins.", correct: true, feedback: "Integrity is what you do when no one watches." },
            { id: 'd', text: "Use it once, just to see if it works.", correct: false, feedback: "Compromise starts with a single step." }
        ]
    },
    {
        id: 4,
        category: "Wisdom",
        text: "Two friends are in a heated public debate on your feed. It's turning toxic.",
        choices: [
            { id: 'a', text: "Pick the side of the friend you like more.", correct: false, feedback: "Bias blinds judgment." },
            { id: 'b', text: "Delete the thread entirely without warning.", correct: false, feedback: "Suppression does not resolve conflict." },
            { id: 'c', text: "Mediate by highlighting shared values.", correct: true, feedback: "Peacemakers sow in peace and reap righteousness." },
            { id: 'd', text: "Let them fight it out for engagement.", correct: false, feedback: "Exploiting conflict for gain is corruption." }
        ]
    }
];

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, subValue, color, borderColor }: any) => (
    <div className={`bg-card border ${borderColor || 'border-border'} rounded-lg p-3 flex flex-col items-center justify-center shadow-theme-sm min-w-[80px] flex-1`}>
        <Icon className={`w-5 h-5 mb-1 ${color}`} />
        <span className="text-xl font-bold text-foreground">{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
        {subValue && <span className="text-[10px] text-muted">{subValue}</span>}
    </div>
);

const ActionButton = ({ onClick, disabled, variant = 'primary', children, className = '' }: any) => {
    const baseStyle = "w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
    const variants: any = {
        primary: "bg-accent hover:opacity-90 text-black shadow-theme-button disabled:opacity-50 disabled:cursor-not-allowed border border-transparent",
        secondary: "bg-background-secondary hover:bg-card-hover text-foreground disabled:opacity-50 border border-border",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
        outline: "border border-border text-muted hover:border-accent hover:text-accent bg-transparent"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

// 3. Main Application
export default function RedemptionGame() {
    // --- HOOKS ---
    const { balance, spendCredits, processFullGameSession } = useCredits(); // Using central credit system
    const [view, setView] = useState('dashboard');

    const [stats, setStats] = useState({
        // credits: REMOVED - Usage replaced by 'balance'
        integrityStreak: 3,
        intercessionTokens: 1,
        purgeCount: 2,
        isGhost: false,
        dailyPlays: 0,
        lastPlayed: null as string | null
    });

    const [session, setSession] = useState({
        scenarios: [] as typeof SCENARIOS,
        currentIndex: 0,
        score: 0,
        correctCount: 0,
        history: [] as any[]
    });

    const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.timeLimit);
    const [timerActive, setTimerActive] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timerActive && timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && timerActive) {
            handleChoiceTimeOut();
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timerActive, timeLeft]);

    // -- Game Logic --

    const startGame = () => {
        if (stats.dailyPlays >= GAME_CONFIG.maxDailyPlays) return;

        const shuffled = [...SCENARIOS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, GAME_CONFIG.questionsPerSession);

        setSession({
            scenarios: selected,
            currentIndex: 0,
            score: 0,
            correctCount: 0,
            history: []
        });

        setTimeLeft(GAME_CONFIG.timeLimit);
        setFeedback(null);
        setView('game');
        setTimerActive(true);
    };

    const handleChoice = (choice: any) => {
        setTimerActive(false);
        const currentScenario = session.scenarios[session.currentIndex];
        const isCorrect = choice.correct;

        let pointsEarned = 0;
        if (isCorrect) {
            const streakBonus = stats.integrityStreak * GAME_CONFIG.streakMultiplier;
            pointsEarned = Math.round(GAME_CONFIG.baseScore * (1 + streakBonus));
        }

        setFeedback({
            type: isCorrect ? 'correct' : 'incorrect',
            message: choice.feedback,
            points: pointsEarned,
            choiceText: choice.text
        });

        setSession(prev => ({
            ...prev,
            score: prev.score + pointsEarned,
            correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
            history: [...prev.history, {
                id: currentScenario.id,
                correct: isCorrect,
                points: pointsEarned
            }]
        }));
    };

    const handleChoiceTimeOut = () => {
        setTimerActive(false);
        setFeedback({
            type: 'incorrect',
            message: "Indecision is a choice in itself.",
            points: 0,
            choiceText: "Time Expired"
        });

        setSession(prev => ({
            ...prev,
            history: [...prev.history, {
                id: session.scenarios[session.currentIndex].id,
                correct: false,
                points: 0
            }]
        }));
    };

    const nextScenario = () => {
        if (session.currentIndex < session.scenarios.length - 1) {
            setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
            setTimeLeft(GAME_CONFIG.timeLimit);
            setFeedback(null);
            setTimerActive(true);
        } else {
            finishSession();
        }
    };

    const finishSession = async () => {
        const perfectSession = session.correctCount === session.scenarios.length;
        const wrongAnswers = session.scenarios.length - session.correctCount;
        let newStreak = stats.integrityStreak;
        let newTokens = stats.intercessionTokens;

        if (session.history.some(h => !h.correct)) {
            newStreak = 0;
        } else {
            newStreak += 1;
        }

        if (perfectSession && newStreak % 5 === 0 && newStreak > 0) {
            newTokens += 1;
        }

        // --- CREDIT INTEGRATION ---
        // Process credits via centralized system with penalties for wrong answers
        await processFullGameSession({
            gameId: 'REDEMPTION',
            score: session.score,
            isPerfect: perfectSession,
            isWin: perfectSession,
            wrongAnswers: wrongAnswers
        });

        setStats(prev => ({
            ...prev,
            // credits: ... handled by useCredits
            dailyPlays: prev.dailyPlays + 1,
            integrityStreak: newStreak,
            intercessionTokens: newTokens
        }));

        setView('summary');
    };

    const handleShopPurchase = async (type: string) => {
        let cost = 0;

        if (type === 'purge' && stats.purgeCount > 0) {
            cost = COSTS.purgeReduction;
            if (await spendCredits(cost, "Redemption: Atonement")) {
                setStats(prev => ({ ...prev, purgeCount: prev.purgeCount - 1 }));
            }
        } else if (type === 'ghost' && stats.isGhost) {
            cost = COSTS.removeGhost;
            if (await spendCredits(cost, "Redemption: Resurrection")) {
                setStats(prev => ({ ...prev, isGhost: false }));
            }
        } else if (type === 'intercede' && stats.intercessionTokens >= 1) {
            cost = COSTS.intercession;
            if (await spendCredits(cost, "Redemption: Intercession")) {
                setStats(prev => ({ ...prev, intercessionTokens: prev.intercessionTokens - 1 }));
                alert("Intercession successful for user: @AnonUser");
            }
        } else {
            // Already handled checks in UI or insufficient balance handled by spendCredits
        }
    };

    // --- RENDER HELPERS ---

    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Integrity Header */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-theme-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                    <Shield className="w-32 h-32 text-accent" />
                </div>

                <div className="relative z-10">
                    <h2 className="text-accent/80 text-xs font-bold tracking-widest uppercase mb-1">Current Standing</h2>
                    <h1 className="text-3xl font-black text-foreground mb-6 tracking-tight">
                        {stats.isGhost ? "GHOST STATUS" : "ACTIVE CITIZEN"}
                    </h1>

                    <div className="flex gap-4">
                        {/* UPDATED: Credits from Balance */}
                        <StatCard icon={Zap} label="Credits" value={balance} color="text-accent" borderColor="border-accent/20" />
                        <StatCard icon={Trophy} label="Streak" value={stats.integrityStreak} color="text-foreground" />
                        <StatCard icon={Users} label="Tokens" value={stats.intercessionTokens} color="text-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Daily Limits */}
            <div className="bg-background-secondary rounded-lg p-4 border border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted" />
                    <div>
                        <div className="text-sm font-medium text-foreground">Daily Allocation</div>
                        <div className="text-xs text-muted">Resets in 04:12:00</div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-accent">{GAME_CONFIG.maxDailyPlays - stats.dailyPlays}</span>
                    <span className="text-sm text-muted">/{GAME_CONFIG.maxDailyPlays} left</span>
                </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-3">
                <ActionButton
                    onClick={startGame}
                    disabled={stats.dailyPlays >= GAME_CONFIG.maxDailyPlays}
                    className="h-16 text-lg relative overflow-hidden group border-0"
                >
                    Start Session
                </ActionButton>

                <ActionButton
                    variant="secondary"
                    onClick={() => setView('shop')}
                    className="h-14"
                >
                    Redemption Center
                </ActionButton>
            </div>

            {/* Lore/Footer */}
            <div className="text-center pt-4">
                <p className="text-xs text-muted italic">"Integrity is the currency of the future."</p>
            </div>
        </div>
    );

    const renderGame = () => {
        const currentScenario = session.scenarios[session.currentIndex];

        if (feedback) {
            return (
                <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
                    <div className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border mb-6 ${feedback.type === 'correct'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                        }`}>
                        {feedback.type === 'correct' ? (
                            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                        ) : (
                            <XCircle className="w-16 h-16 text-red-500 mb-4" />
                        )}

                        <h2 className={`text-2xl font-bold mb-2 ${feedback.type === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                            {feedback.type === 'correct' ? 'Restoration Achieved' : 'Judgment Failed'}
                        </h2>

                        <p className="text-center text-foreground mb-6 leading-relaxed">
                            {feedback.message}
                        </p>

                        <div className="bg-background-secondary border border-border rounded-lg py-2 px-6 flex items-center gap-2 mb-8">
                            <Zap className="w-4 h-4 text-accent" />
                            <span className="text-accent font-bold">+{feedback.points} Credits</span>
                        </div>
                    </div>

                    <ActionButton onClick={nextScenario}>
                        {session.currentIndex < session.scenarios.length - 1 ? 'Next Scenario' : 'Complete Session'}
                    </ActionButton>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                {/* Header / Timer */}
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xs text-muted font-bold tracking-widest uppercase">
                        Scenario {session.currentIndex + 1}/{session.scenarios.length}
                    </div>
                    <div className={`flex items-center gap-2 font-mono font-bold ${timeLeft <= 5 ? 'text-accent animate-pulse' : 'text-muted'}`}>
                        <Clock className="w-4 h-4" />
                        00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-background-secondary h-1 rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-accent transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / GAME_CONFIG.timeLimit) * 100}%` }}
                    />
                </div>

                {/* Question Card */}
                <div className="bg-card p-6 rounded-xl border border-border shadow-theme-md mb-6 flex-1">
                    <div className="inline-block px-2 py-1 bg-background-secondary text-accent border border-accent/20 text-[10px] font-bold rounded mb-3 uppercase tracking-wider">
                        {currentScenario.category}
                    </div>
                    <h3 className="text-xl text-foreground font-medium leading-relaxed">
                        {currentScenario.text}
                    </h3>
                </div>

                {/* Choices */}
                <div className="space-y-3">
                    {currentScenario.choices.map((choice) => (
                        <button
                            key={choice.id}
                            onClick={() => handleChoice(choice)}
                            className="w-full p-4 bg-card hover:bg-card-hover border border-border hover:border-accent/50 rounded-lg text-left text-sm text-foreground transition-all active:scale-[0.98] flex items-center justify-between group"
                        >
                            <span>{choice.text}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-accent text-xs uppercase tracking-wider transition-opacity font-bold">
                                Select
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderSummary = () => {
        const perfectScore = session.correctCount === session.scenarios.length;

        return (
            <div className="animate-in slide-in-from-bottom-8 duration-500 text-center">
                <div className="mb-6 inline-flex p-4 bg-card rounded-full ring-4 ring-border shadow-theme-lg relative">
                    <Scale className="w-12 h-12 text-accent" />
                    {perfectScore && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete</h2>
                <p className="text-muted mb-8">Your choices have been weighed.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <div className="text-muted text-xs uppercase tracking-wider mb-1">Earned</div>
                        {/* Note: This shows Score, but credits are calculated separately via processGameResult */}
                        <div className="text-2xl font-bold text-accent">{session.score} Credits</div>
                    </div>
                    <div className="bg-card p-4 rounded-lg border border-border">
                        <div className="text-muted text-xs uppercase tracking-wider mb-1">Accuracy</div>
                        <div className={`text-2xl font-bold ${perfectScore ? 'text-green-500' : 'text-foreground'}`}>
                            {Math.round((session.correctCount / session.scenarios.length) * 100)}%
                        </div>
                    </div>
                </div>

                <ActionButton onClick={() => setView('dashboard')}>Return to Dashboard</ActionButton>
            </div>
        );
    };

    const renderShop = () => (
        <div className="animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('dashboard')} className="p-2 hover:bg-card-hover rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-muted" />
                </button>
                <h2 className="text-xl font-bold text-foreground">Redemption Center</h2>
            </div>

            <div className="bg-card p-4 rounded-lg mb-6 flex justify-between items-center border border-border">
                <div>
                    <div className="text-xs text-muted uppercase tracking-wider">Balance</div>
                    <div className="text-2xl font-bold text-accent flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        {balance} Credits
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted uppercase tracking-wider">Tokens</div>
                    <div className="text-xl font-bold text-foreground flex items-center justify-end gap-2">
                        <Users className="w-4 h-4 text-yellow-500" />
                        {stats.intercessionTokens}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Item 1: Purge Reduction */}
                <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className="bg-background-secondary p-2 rounded-lg h-fit">
                                <RefreshCcw className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Atonement</h3>
                                <p className="text-xs text-muted mt-1">Reduces your purge count by 1.</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-accent">{COSTS.purgeReduction} Credits</span>
                    </div>
                    <ActionButton
                        variant="outline"
                        className="text-sm py-2"
                        disabled={balance < COSTS.purgeReduction || stats.purgeCount === 0}
                        onClick={() => handleShopPurchase('purge')}
                    >
                        {stats.purgeCount === 0 ? "Purge Count is 0" : "Redeem Self"}
                    </ActionButton>
                </div>

                {/* Item 2: Remove Ghost */}
                <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className="bg-background-secondary p-2 rounded-lg h-fit">
                                <Shield className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Resurrection</h3>
                                <p className="text-xs text-muted mt-1">Removes Ghost Status immediately.</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-accent">{COSTS.removeGhost} Credits</span>
                    </div>
                    <ActionButton
                        variant="outline"
                        className="text-sm py-2"
                        disabled={balance < COSTS.removeGhost || !stats.isGhost}
                        onClick={() => handleShopPurchase('ghost')}
                    >
                        {!stats.isGhost ? "Status Normal" : "Restore Visibility"}
                    </ActionButton>
                </div>

                {/* Item 3: Intercession */}
                <div className="bg-card-gradient p-4 rounded-xl border border-accent/30 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Users className="w-24 h-24 text-accent" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex gap-3">
                            <div className="bg-accent/10 p-2 rounded-lg h-fit">
                                <Users className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Intercession</h3>
                                <p className="text-xs text-muted mt-1 max-w-[200px]">Use your standing to vouch for another user, reducing their penalties.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-accent">{COSTS.intercession} Credits</div>
                            <div className="text-xs font-bold text-yellow-500">+ 1 Token</div>
                        </div>
                    </div>

                    <div className="flex gap-2 relative z-10">
                        <input type="text" placeholder="@username" className="bg-background border border-border rounded px-3 text-sm text-foreground flex-1 outline-none focus:border-accent placeholder:text-muted" />
                        <ActionButton
                            variant="primary"
                            className="text-sm py-2 w-auto"
                            disabled={balance < COSTS.intercession || stats.intercessionTokens < 1}
                            onClick={() => handleShopPurchase('intercede')}
                        >
                            Intercede
                        </ActionButton>
                    </div>
                </div>

            </div>
        </div>
    );

    return (
        <div className="w-full text-foreground flex flex-col pb-4">
            {/* App Bar — horizontal padding comes from Layout page-shell */}
            <div className="pb-3 mb-1 flex items-center justify-between border-b border-border sticky top-0 z-40 bg-background/90 backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                        to="/puurga-games"
                        className="p-1.5 -ml-1.5 rounded-xl text-muted hover:text-foreground hover:bg-card-hover transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-theme-sm shrink-0">
                        <Shield className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-lg tracking-tight text-foreground leading-tight">Redemption</h1>
                        <p className="text-[11px] text-muted">Paths of restoration</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted bg-card border border-border rounded-full px-2.5 py-1.5 shadow-theme-sm shrink-0">
                    <Zap className="w-3.5 h-3.5 text-accent" />
                    <span className="tabular-nums text-foreground font-semibold">{balance}</span>
                </div>
            </div>

            <div className="flex-1 py-4">
                {view === 'dashboard' && renderDashboard()}
                {view === 'game' && renderGame()}
                {view === 'summary' && renderSummary()}
                {view === 'shop' && renderShop()}
            </div>

            <div className="sticky bottom-20 lg:bottom-0 z-30 mt-2 border-t border-border bg-background/95 backdrop-blur-md py-2 flex justify-around items-center text-muted">
                <button
                    type="button"
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] transition-colors ${view === 'dashboard' ? 'text-foreground bg-card border border-border' : 'hover:text-foreground'}`}
                    onClick={() => setView('dashboard')}
                >
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </button>
                <button
                    type="button"
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] transition-colors ${view === 'shop' ? 'text-foreground bg-card border border-border' : 'hover:text-foreground'}`}
                    onClick={() => setView('shop')}
                >
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Redeem</span>
                </button>
                <Link
                    to="/puurga-games"
                    className="p-2 rounded-xl flex flex-col items-center gap-1 min-w-[4.5rem] hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Exit</span>
                </Link>
            </div>
        </div>
    );
}
