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
 * This function is now the single source of truth for flat interest calculations on the client-side.
 * It mirrors the backend Cloud Function logic.
 * @param {number} principal The principal loan amount.
 * @param {number} duration The duration of the loan in months.
 * @returns An object with totalInterest, totalRepayment, and monthlyRepayment.
 */
export function calculateLoanDetails(principal: number, duration: number) {
    const interestRate = 0.05; // 5% flat monthly interest
    const totalInterest = principal * interestRate * duration;
    const totalRepayment = principal + totalInterest;
    const monthlyRepayment = totalRepayment / duration;
    return { interestRate, totalInterest, totalRepayment, monthlyRepayment };
}
