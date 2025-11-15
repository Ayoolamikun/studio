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

export function getInterestRate(amount: number): number {
  if (amount >= 10000 && amount <= 50000) {
    return 0.15; // 15%
  } else if (amount >= 51000 && amount <= 150000) {
    return 0.10; // 10%
  } else if (amount >= 151000) {
    return 0.07; // 7%
  }
  return 0;
}

export function calculateTotalRepayment(principal: number): number {
  const interestRate = getInterestRate(principal);
  return principal + (principal * interestRate);
}
