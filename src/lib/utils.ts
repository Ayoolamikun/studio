import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

/**
 * Calculates the simple interest rate based on the loan amount.
 * This is the single source of truth for interest rate calculations.
 * @param {number} amount The principal loan amount.
 * @return {number} The interest rate (e.g., 0.15 for 15%).
 */
export function getInterestRate(amount: number): number {
  if (amount >= 10000 && amount <= 50000) {
    return 0.15; // 15%
  } else if (amount > 50000 && amount <= 150000) {
    return 0.10; // 10%
  } else if (amount > 150000) {
    return 0.07; // 7%
  }
  // Fallback for amounts outside the defined tiers, though UI should prevent this.
  return 0.20; 
}


/**
 * Calculates the total repayment amount for a given principal.
 * Uses the centralized getInterestRate function.
 * @param {number} principal The principal loan amount.
 * @return {number} The total amount to be repaid.
 */
export function calculateTotalRepayment(principal: number): number {
  const interestRate = getInterestRate(principal);
  const total = principal + (principal * interestRate);
  return total;
}
