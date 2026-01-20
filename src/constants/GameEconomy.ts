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
        costs: {
            purgeReduction: 150,
            removeGhost: 600,
            intercession: 300
        }
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

    return credits;
};
