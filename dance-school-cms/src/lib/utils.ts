import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export const formatDate = (date: Date): string => {
  return format(date, 'PPP');
};

export const formatTime = (date: Date): string => {
  return format(date, 'p');
};

export const formatDateTime = (date: Date): string => {
  return format(date, 'PPP p');
};

export const isDateInFuture = (date: Date): boolean => {
  return isAfter(date, new Date());
};

export const isDateInPast = (date: Date): boolean => {
  return isBefore(date, new Date());
};

export const addDaysToDate = (date: Date, days: number): Date => {
  return addDays(date, days);
};

// Currency utilities
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const group = key(item);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

// Subscription utilities
export const isSubscriptionActive = (subscription: {
  status: string;
  endDate: Date;
}): boolean => {
  return subscription.status === 'active' && isDateInFuture(subscription.endDate);
};

export const getSubscriptionDaysRemaining = (endDate: Date): number => {
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Class utilities
export const canBookClass = (
  classData: { startTime: Date; capacity: number },
  currentBookings: number
): boolean => {
  return isDateInFuture(classData.startTime) && currentBookings < classData.capacity;
};

export const getClassStatus = (
  classData: { startTime: Date; capacity: number },
  currentBookings: number
): 'upcoming' | 'full' | 'past' => {
  if (isDateInPast(classData.startTime)) {
    return 'past';
  }
  if (currentBookings >= classData.capacity) {
    return 'full';
  }
  return 'upcoming';
};

// Analytics utilities
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
};

// Error handling utilities
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Local storage utilities (for client-side)
export const getFromLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setToLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Handle storage errors silently
  }
};

export const removeFromLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Handle storage errors silently
  }
};
