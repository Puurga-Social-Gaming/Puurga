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
        // 1 Score Point = 1 Credit
        scoreToCreditsRatio: 1.0,
        rewards: {
            completion: 20,
            perfectScore: 50,
            dailyBonus: 100
        },
        penalties: {
            wrongAnswer: 5 // Lose 5 credits for each wrong answer
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
        // 10 Score Points = 1 Credit (slicing game earns lots of points quickly)
        scoreToCreditsRatio: 0.1,
        rewards: {
            completion: 15,
            win: 25,
            perfectScore: 75 // No corruption hits during game
        },
        penalties: {
            corruption: 10, // Hitting a bomb/skull loses credits
            missedTarget: 2 // Missing a fruit/icon costs credits
        }
    },
    PATH_OF_WATCHMAN: {
        id: 'path_of_watchman',
        name: 'Path of the Watchman',
        // Balanced ratio for action game
        scoreToCreditsRatio: 0.08,
        rewards: {
            completion: 20,
            win: 50 // Surviving the full game
        },
        penalties: {
            corruption: 5 // Getting hit by enemies
        }
    },
    PURGA_RIFT: {
        id: 'purga_rift',
        name: 'Purga Rift',
        scoreToCreditsRatio: 0.12,
        rewards: {
            completion: 25,
            win: 40,
            perfectScore: 80,
        },
        penalties: {
            wrongAnswer: 8,
        },
    },
    CYBER_RUNNER: {
        id: 'cyber_runner',
        name: 'Cyber Runner',
        scoreToCreditsRatio: 0.1,
        rewards: {
            completion: 20,
            win: 35,
            perfectScore: 70,
        },
        penalties: {
            missedTarget: 3,
            corruption: 5,
        },
    },
    // Template for future games
    TEMPLATE_GAME: {
        id: 'template',
        name: 'Template Game',
        scoreToCreditsRatio: 0.5, // 2 Score Points = 1 Credit
        rewards: {
            completion: 10,
            win: 50
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
