import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { setCreditApiPending } from '../context/UserContext';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { calculateGameResult, GAME_ECONOMY, GameResultParams } from '../constants/GameEconomy';
import { showCreditToast, CreditChangeData } from '../components/Credits/CreditChangeToast';

export const useCredits = () => {
    const { user, updateUser } = useUser();

    const balance = user?.credits || 0;

    /**
     * Add credits via server-validated endpoint.
     * Server calculates and returns the new balance.
     */
    const addCredits = useCallback(async (amount: number, reason: string) => {
        if (!user) return false;
        if (amount <= 0) return false;

        setCreditApiPending(true);
        try {
            const response = await api.post('/credits/award', {
                amount,
                reason,
            });

            if (response.data?.success) {
                const newBalance = response.data.credits;
                updateUser({ credits: newBalance });

                const toastData: CreditChangeData = {
                    amount,
                    source: 'game',
                    description: reason,
                    newBalance,
                };
                toast.success(showCreditToast(toastData), { duration: 4000, icon: '🪙' });
                setCreditApiPending(false);
                return true;
            }

            toast.error('Could not sync credits');
            setCreditApiPending(false);
            return false;
        } catch (error) {
            console.error('Failed to add credits:', error);
            toast.error('Could not sync credits');
            setCreditApiPending(false);
            return false;
        }
    }, [user, updateUser]);

    /**
     * Deduct credits via server-validated endpoint.
     */
    const spendCredits = useCallback(async (amount: number, reason: string) => {
        if (!user) return false;
        if (balance < amount) {
            toast.error('Insufficient Credits');
            return false;
        }

        setCreditApiPending(true);
        try {
            const response = await api.post('/credits/spend', {
                amount,
                source: 'spend',
                description: reason,
            });

            if (response.data?.success) {
                const newBalance = response.data.credits;
                updateUser({ credits: newBalance });

                const toastData: CreditChangeData = {
                    amount: -amount,
                    source: 'spend',
                    description: reason,
                    newBalance,
                };
                toast.success(showCreditToast(toastData), { duration: 4000 });
                setCreditApiPending(false);
                return true;
            }

            toast.error('Transaction failed');
            setCreditApiPending(false);
            return false;
        } catch (error) {
            console.error('Failed to spend credits:', error);
            toast.error('Transaction failed');
            setCreditApiPending(false);
            return false;
        }
    }, [user, balance, updateUser]);

    /**
     * Deducts credits for game penalties (shows toast)
     */
    const deductPenalty = useCallback(async (amount: number, reason: string) => {
        if (!user || amount <= 0) return false;

        setCreditApiPending(true);
        try {
            const response = await api.post('/credits/spend', {
                amount,
                source: 'game',
                description: reason,
            });

            if (response.data?.success) {
                updateUser({ credits: response.data.credits });

                const toastData: CreditChangeData = {
                    amount: -amount,
                    source: 'penalty',
                    description: reason,
                    newBalance: response.data.credits,
                };
                toast.success(showCreditToast(toastData), { duration: 4000 });
                setCreditApiPending(false);
                return true;
            }
            setCreditApiPending(false);
            return false;
        } catch (error) {
            console.error('Failed to deduct penalty:', error);
            setCreditApiPending(false);
            return false;
        }
    }, [user, updateUser]);

    /**
     * Process a game result via server-validated POST /games/finish.
     * Server validates score, calculates rewards, and returns the result.
     */
    const processFullGameSession = useCallback(async (params: GameResultParams) => {
        setCreditApiPending(true);
        try {
            const response = await api.post('/games/finish', {
                gameId: params.gameId,
                score: params.score,
                timePlayed: 0,
                isWin: params.isWin || false,
                isPerfect: params.isPerfect || false,
                metadata: {
                    wrongAnswers: params.wrongAnswers,
                    missedTargets: params.missedTargets,
                    corruptionHits: params.corruptionHits,
                },
            });

            if (response.data?.success) {
                const { creditsAwarded, newBalance, isWin, isPerfect, breakdown } = response.data;
                updateUser({ credits: newBalance });

                const highKey = `puurga_high_${params.gameId}`;
                const prevHigh = Number(localStorage.getItem(highKey) || 0);
                if (params.score > prevHigh) {
                    localStorage.setItem(highKey, String(params.score));
                }

                const source = params.gameId || 'game';
                const toastData: CreditChangeData = {
                    amount: creditsAwarded,
                    source: 'game',
                    description: source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
                    newBalance,
                    breakdown,
                };
                toast.success(showCreditToast(toastData), { duration: 5000, icon: '🎮' });
                setCreditApiPending(false);

                return {
                    earned: creditsAwarded,
                    lost: 0,
                    net: creditsAwarded,
                    isWin,
                    isPerfect,
                    newBalance,
                    breakdown,
                };
            }

            const result = calculateGameResult(params);
            setCreditApiPending(false);
            return result;
        } catch (error) {
            console.error('Game finish failed, falling back to local calculation:', error);
            const result = calculateGameResult(params);
            setCreditApiPending(false);
            return result;
        }
    }, [updateUser]);

    /**
     * Simpler wrapper for game results (used by some games)
     */
    const processGameResult = useCallback(async (
        gameId: string,
        score: number,
        isPerfect: boolean = false,
        additionalParams?: Partial<GameResultParams>
    ) => {
        return processFullGameSession({
            gameId,
            score,
            isPerfect,
            ...additionalParams
        });
    }, [processFullGameSession]);

    /**
     * Merge localStorage credits into backend (one-time migration for disconnected games)
     */
    const mergeLocalCredits = useCallback(async (localAmount: number, source: string) => {
        if (!user || localAmount <= 0) return false;

        try {
            const response = await api.post('/credits/merge', {
                amount: localAmount,
                source,
            });

            if (response.data?.success) {
                updateUser({ credits: response.data.credits });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to merge credits:', error);
            return false;
        }
    }, [user, updateUser]);

    /**
     * Fetch credits from backend and sync local state
     */
    const refreshCredits = useCallback(async () => {
        try {
            const response = await api.get('/credits');
            if (response.data && typeof response.data.credits === 'number') {
                updateUser({ credits: response.data.credits });
                return response.data.credits;
            }
        } catch (error) {
            console.error('Failed to fetch credits from backend:', error);
        }
        return balance;
    }, [updateUser, balance]);

    return {
        balance,
        addCredits,
        spendCredits,
        deductPenalty,
        processGameResult,
        processFullGameSession,
        mergeLocalCredits,
        refreshCredits,
        economyRules: GAME_ECONOMY
    };
};
