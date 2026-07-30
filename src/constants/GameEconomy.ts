/**
 * Game Economy Configuration
 * 
 * This file acts as a centralized template for all game-related credit conversions.
 * When adding a new game, define its economy rules here.
 */

export interface GameEconomyRules {
    id: string;
    name: string;
    // How many credits users earn based on score
    scoreToCreditsRatio: number;
    // Flat rewards for specific events
    rewards: {
        completion: number;
        win?: number;
        perfectScore?: number;
        dailyBonus?: number;
    };
    // Penalties for wrong answers/misses
    penalties?: {
        wrongAnswer?: number;
        missedTarget?: number;
        corruption?: number;
    };
    // Costs for in-game items (if applicable)
    costs?: {
        [key: string]: number;
    };
}

export const GAME_ECONOMY: Record<string, GameEconomyRules> = {
    REDEMPTION: {
        id: 'redemption',
        name: 'Redemption: Paths of Restoration',
        // 50 tokens = 1 credit
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 1,
            perfectScore: 2.5,
            dailyBonus: 5
        },
        penalties: {
            wrongAnswer: 0.25
        },
        costs: {
            purgeReduction: 150,
            removeGhost: 600,
            intercession: 300
        }
    },
    SWORD_OF_JUDGMENT: {
        id: 'sword_of_judgment',
        name: 'Sword of Judgment',
        // 50 tokens = 1 credit
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 0.75,
            win: 1.25,
            perfectScore: 3.75
        },
        penalties: {
            corruption: 0.5,
            missedTarget: 0.1
        }
    },
    PATH_OF_WATCHMAN: {
        id: 'path_of_watchman',
        name: 'Path of the Watchman',
        // 50 tokens = 1 credit
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 1,
            win: 2.5
        },
        penalties: {
            corruption: 0.25
        }
    },
    PURGA_RIFT: {
        id: 'purga_rift',
        name: 'Purga Rift',
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 1.25,
            win: 2,
            perfectScore: 4,
        },
        penalties: {
            wrongAnswer: 0.4,
        },
    },
    CYBER_RUNNER: {
        id: 'cyber_runner',
        name: 'Cyber Runner',
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 1,
            win: 1.75,
            perfectScore: 3.5,
        },
        penalties: {
            missedTarget: 0.15,
            corruption: 0.25,
        },
    },
    // Template for future games
    TEMPLATE_GAME: {
        id: 'template',
        name: 'Template Game',
        scoreToCreditsRatio: 0.02,
        rewards: {
            completion: 0.5,
            win: 2.5
        }
    }
};

/**
 * Calculates total credits earned from a game session
 */
export const calculateGameEarnings = (
    gameId: string,
    score: number,
    isPerfect: boolean = false
): number => {
    const rules = GAME_ECONOMY[gameId.toUpperCase()] || GAME_ECONOMY.TEMPLATE_GAME;

    let credits = Math.floor(score * rules.scoreToCreditsRatio);

    // Add completion bonus
    credits += rules.rewards.completion;

    // Add perfect score bonus
    if (isPerfect && rules.rewards.perfectScore) {
        credits += rules.rewards.perfectScore;
    }

    return Math.max(0, credits); // Ensure non-negative
};

/**
 * Gets the penalty amount for a specific event type
 */
export const getGamePenalty = (
    gameId: string,
    penaltyType: 'wrongAnswer' | 'missedTarget' | 'corruption'
): number => {
    const rules = GAME_ECONOMY[gameId.toUpperCase()] || GAME_ECONOMY.TEMPLATE_GAME;
    return rules.penalties?.[penaltyType] || 0;
};

/**
 * Gets the win bonus for a game
 */
export const getWinBonus = (gameId: string): number => {
    const rules = GAME_ECONOMY[gameId.toUpperCase()] || GAME_ECONOMY.TEMPLATE_GAME;
    return rules.rewards.win || 0;
};

/**
 * Comprehensive game result calculator
 * Takes into account score, penalties, and bonuses
 */
export interface GameResultParams {
    gameId: string;
    score: number;
    isPerfect?: boolean;
    isWin?: boolean;
    wrongAnswers?: number;
    missedTargets?: number;
    corruptionHits?: number;
}

export const calculateGameResult = (params: GameResultParams): { earned: number; lost: number; net: number } => {
    const {
        gameId,
        score,
        isPerfect = false,
        isWin = false,
        wrongAnswers = 0,
        missedTargets = 0,
        corruptionHits = 0
    } = params;

    const rules = GAME_ECONOMY[gameId.toUpperCase()] || GAME_ECONOMY.TEMPLATE_GAME;

    // Calculate earnings
    let earned = Math.floor(score * rules.scoreToCreditsRatio);
    earned += rules.rewards.completion;

    if (isPerfect && rules.rewards.perfectScore) {
        earned += rules.rewards.perfectScore;
    }

    if (isWin && rules.rewards.win) {
        earned += rules.rewards.win;
    }

    // Calculate penalties
    let lost = 0;
    if (rules.penalties) {
        lost += (rules.penalties.wrongAnswer || 0) * wrongAnswers;
        lost += (rules.penalties.missedTarget || 0) * missedTargets;
        lost += (rules.penalties.corruption || 0) * corruptionHits;
    }

    const net = earned - lost;

    return { earned, lost, net };
};
