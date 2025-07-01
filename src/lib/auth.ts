import { auth, currentUser } from '@clerk/nextjs/server';
import { ExtendedUser, User, UserRole } from '../types';
import { db } from './database';

// Auth utilities using Clerk
export const authUtils = {
  // Get current user with role information
  getCurrentUser: async (): Promise<ExtendedUser | null> => {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Anonymous User';

    // Get user from our database to get role information
    let dbUser = db.getUserByEmail(email);
    
    // If user doesn't exist in our database, create them with appropriate role
    if (!dbUser) {
      const role = email === 'dancation@gmail.com' ? UserRole.ADMIN : UserRole.STUDENT;
      dbUser = db.createUser({
        email,
        name,
        role,
      });
      console.log(`Created user ${email} with role ${role} in auth.ts`);
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      clerkUser,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
  },

  // Role checking functions
  isAdmin: async (user?: ExtendedUser | null): Promise<boolean> => {
    const currentUser = user || (await authUtils.getCurrentUser());
    return currentUser?.role === UserRole.ADMIN;
  },

  isStudent: async (user?: ExtendedUser | null): Promise<boolean> => {
    const currentUser = user || (await authUtils.getCurrentUser());
    return currentUser?.role === UserRole.STUDENT;
  },

  isInstructor: async (user?: ExtendedUser | null): Promise<boolean> => {
    const currentUser = user || (await authUtils.getCurrentUser());
    return currentUser?.role === UserRole.INSTRUCTOR;
  },

  // Check if user has required role
  hasRole: async (requiredRoles: UserRole[], user?: ExtendedUser | null): Promise<boolean> => {
    const currentUser = user || (await authUtils.getCurrentUser());
    if (!currentUser) return false;
    return requiredRoles.includes(currentUser.role);
  },
};

// Server-side authentication check
export const getServerUser = async (): Promise<ExtendedUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0].emailAddress;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Anonymous User';

  // Get user from our database to get role information
  let dbUser = db.getUserByEmail(email);
  
  // If user doesn't exist in our database, create them with appropriate role
  if (!dbUser) {
    const role = email === 'dancation@gmail.com' ? UserRole.ADMIN : UserRole.STUDENT;
    dbUser = db.createUser({
      email,
      name,
      role,
    });
    console.log(`Created user ${email} with role ${role} in getServerUser`);
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    clerkUser,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
};

// Route protection utility (for client components)
export const requireAuth = async (allowedRoles?: UserRole[]): Promise<boolean> => {
  const user = await authUtils.getCurrentUser();
  
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in?redirect_url=' + window.location.pathname;
    }
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (typeof window !== 'undefined') {
      window.location.href = '/unauthorized';
    }
    return false;
  }

  return true;
};
