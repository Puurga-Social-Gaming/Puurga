import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { calculateGameResult, GAME_ECONOMY, GameResultParams } from '../constants/GameEconomy';

export const useCredits = () => {
    const { user, updateUser } = useUser();

    const balance = user?.credits || 0;

    /**
     * Syncs credits with the backend
     */
    const syncCreditsToBackend = useCallback(async (newBalance: number) => {
        try {
            await api.post('/credits/update', { credits: newBalance });
            return true;
        } catch (error) {
            console.error('Failed to sync credits with backend:', error);
            // Don't throw - we'll use optimistic updates
            return false;
        }
    }, []);

    /**
     * Adds credits to the user's balance.
     * Syncs with backend and updates local state.
     */
    const addCredits = useCallback(async (amount: number, reason: string) => {
        if (!user) return false;

        try {
            // Optimistic Update
            const newBalance = (user.credits || 0) + amount;
            updateUser({ credits: newBalance });

            // Sync with backend
            await syncCreditsToBackend(newBalance);

            // Also persist to localStorage for game sync
            localStorage.setItem('perga_points', String(newBalance));

            toast.success(`+${amount} Credits Earned!`);
            console.log(`Credits added: ${amount} - ${reason}. New balance: ${newBalance}`);
            return true;
        } catch (error) {
            console.error('Failed to add credits:', error);
            toast.error('Could not sync credits');
            return false;
        }
    }, [user, updateUser, syncCreditsToBackend]);

    /**
     * Deducts credits from the user's balance.
     */
    const spendCredits = useCallback(async (amount: number, reason: string) => {
        if (!user) return false;
        if (balance < amount) {
            toast.error('Insufficient Credits');
            return false;
        }

        try {
            // Optimistic Update
            const newBalance = user.credits - amount;
            updateUser({ credits: newBalance });

            // Sync with backend
            await syncCreditsToBackend(newBalance);

            // Also persist to localStorage
            localStorage.setItem('perga_points', String(newBalance));

            toast.success(`-${amount} Credits`);
            console.log(`Credits spent: ${amount} - ${reason}. New balance: ${newBalance}`);
            return true;
        } catch (error) {
            console.error('Failed to spend credits:', error);
            toast.error('Transaction failed');
            return false;
        }
    }, [user, balance, updateUser, syncCreditsToBackend]);

    /**
     * Deducts credits for game penalties (silent - no toast)
     */
    const deductPenalty = useCallback(async (amount: number, reason: string) => {
        if (!user || amount <= 0) return false;

        const newBalance = Math.max(0, (user.credits || 0) - amount);
        updateUser({ credits: newBalance });

        // Sync with backend
        await syncCreditsToBackend(newBalance);

        // Also persist to localStorage
        localStorage.setItem('perga_points', String(newBalance));

        console.log(`Penalty applied: ${amount} - ${reason}. New balance: ${newBalance}`);
        return true;
    }, [user, updateUser, syncCreditsToBackend]);

    /**
     * Helper to process game results automatically using the Economy Template.
     * Handles both earnings and penalties.
     */
    const processGameResult = useCallback(async (
        gameId: string,
        score: number,
        isPerfect: boolean = false,
        additionalParams?: Partial<GameResultParams>
    ) => {
        const result = calculateGameResult({
            gameId,
            score,
            isPerfect,
            ...additionalParams
        });

        if (result.net > 0) {
            await addCredits(result.net, `Played ${gameId}: Score ${score}`);
        }

        return result;
    }, [addCredits]);

    /**
     * Process comprehensive game session with all details
     */
    const processFullGameSession = useCallback(async (params: GameResultParams) => {
        const result = calculateGameResult(params);

        if (result.net > 0) {
            await addCredits(result.net, `${params.gameId} session complete`);
        }

        return result;
    }, [addCredits]);

    /**
     * Fetch credits from backend and sync local state
     */
    const refreshCredits = useCallback(async () => {
        try {
            const response = await api.get('/credits');
            if (response.data && typeof response.data.credits === 'number') {
                updateUser({ credits: response.data.credits });
                localStorage.setItem('perga_points', String(response.data.credits));
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
        refreshCredits,
        economyRules: GAME_ECONOMY
    };
};
