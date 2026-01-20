import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
// import api from '../api/api';
import toast from 'react-hot-toast';
import { calculateGameEarnings, GAME_ECONOMY } from '../constants/GameEconomy';

export const useCredits = () => {
    const { user, updateUser } = useUser();

    const balance = user?.credits || 0;

    /**
     * Adds credits to the user's balance.
     * Syncs with backend and updates local state.
     */
    const addCredits = useCallback(async (amount: number, _reason: string) => {
        if (!user) return;

        try {
            // Optimistic Update
            const newBalance = (user.credits || 0) + amount;
            updateUser({ credits: newBalance });

            // API Call (Mocked for now if specific endpoint doesn't exist, but structured for real implementation)
            // await api.post('/users/credits/add', { amount, reason });

            // Since we don't know the exact endpoint, we'll assume the updateUser hook persists it to localStorage
            // In a real scenario: const res = await api.post('/credits/transaction', { type: 'credit', amount, reason });

            toast.success(`+${amount} Credits Earned!`);
            return true;
        } catch (error) {
            console.error('Failed to add credits:', error);
            toast.error('Could not sync credits');
            // Revert optimistic update if needed
            return false;
        }
    }, [user, updateUser]);

    /**
     * Deducts credits from the user's balance.
     */
    const spendCredits = useCallback(async (amount: number, _reason: string) => {
        if (!user) return false;
        if (balance < amount) {
            toast.error('Insufficient Credits');
            return false;
        }

        try {
            // Optimistic Update
            const newBalance = user.credits - amount;
            updateUser({ credits: newBalance });

            // API Call
            // await api.post('/users/credits/spend', { amount, reason });

            toast.success(`-${amount} Credits`);
            return true;
        } catch (error) {
            console.error('Failed to spend credits:', error);
            toast.error('Transaction failed');
            return false;
        }
    }, [user, balance, updateUser]);

    /**
     * Helper to process game results automatically using the Economy Template.
     */
    const processGameResult = useCallback(async (gameId: string, score: number, isPerfect: boolean = false) => {
        const earnedAmount = calculateGameEarnings(gameId, score, isPerfect);
        if (earnedAmount > 0) {
            await addCredits(earnedAmount, `Played ${gameId}: Score ${score}`);
        }
        return earnedAmount;
    }, [addCredits]);

    return {
        balance,
        addCredits,
        spendCredits,
        processGameResult,
        economyRules: GAME_ECONOMY
    };
};
