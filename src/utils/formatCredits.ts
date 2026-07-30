/**
 * Formats a credit amount with decimal precision and thousand separators.
 * Examples: 3.40, 25.20, 140.80, 1,250.00
 */
export const formatCredits = (amount: number): string => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats a credit amount for compact display (e.g., in game cards).
 * Shows decimals only if non-zero.
 */
export const formatCreditsCompact = (amount: number): string => {
  if (amount === Math.floor(amount)) {
    return amount.toLocaleString();
  }
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
