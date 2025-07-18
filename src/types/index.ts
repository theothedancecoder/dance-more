import { z } from 'zod';
import type { User as ClerkUser } from '@clerk/nextjs/server';

// User Types
export const UserRole = {
  ADMIN: 'admin',
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.STUDENT, UserRole.INSTRUCTOR]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Extended user type that combines Clerk user with our role system
export type ExtendedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clerkUser: ClerkUser;
  createdAt: Date;
  updatedAt: Date;
};

// Class Types
export const ClassSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  instructorId: z.string(),
  capacity: z.number().min(1),
  price: z.number().min(0),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Class = z.infer<typeof ClassSchema>;

// Pass Types
export const PassType = {
  SINGLE: 'single',
  MULTI: 'multi',
  UNLIMITED: 'unlimited',
} as const;

export type PassType = typeof PassType[keyof typeof PassType];

export const PassSchema = z.object({
  id: z.string(),
  type: z.enum([PassType.SINGLE, PassType.MULTI, PassType.UNLIMITED]),
  name: z.string(),
  description: z.string(),
  price: z.number().min(0),
  validityDays: z.number().min(1),
  classesLimit: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Pass = z.infer<typeof PassSchema>;

// Subscription Types
export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  passId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  remainingClasses: z.number().nullable(),
  status: z.enum(['active', 'expired', 'cancelled']),
  autoRenew: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// Booking Types
export const BookingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  classId: z.string(),
  subscriptionId: z.string(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']),
  attended: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Booking = z.infer<typeof BookingSchema>;

// Payment Types
export const PaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  currency: z.string(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  type: z.enum(['subscription', 'pass']),
  referenceId: z.string(), // subscriptionId or passId
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// Chat Types
export const ChatMessageSchema = z.object({
  id: z.string(),
  classId: z.string(),
  userId: z.string(),
  content: z.string(),
  createdAt: z.date(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
