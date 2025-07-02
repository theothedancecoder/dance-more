import { auth, currentUser } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { ExtendedUser, UserRole } from '../types';

// Get admin emails from environment variable
const getAdminEmails = (): string[] => {
  const adminEmails = process.env.ADMIN_EMAILS || 'dancation@gmail.com';
  return adminEmails.split(',').map(email => email.trim().toLowerCase());
};

// Check if email is admin
const isAdminEmail = (email: string): boolean => {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
};

// Auth utilities using Clerk and Sanity
export const authUtils = {
  // Get current user with role information
  getCurrentUser: async (): Promise<ExtendedUser | null> => {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0].emailAddress;
    
    // Get user from Sanity
    const sanityUser = await sanityClient.fetch(`
      *[_type == "user" && clerkId == $clerkId][0] {
        _id,
        clerkId,
        email,
        name,
        firstName,
        lastName,
        role,
        createdAt,
        updatedAt
      }
    `, { clerkId: clerkUser.id });

    // If user doesn't exist in Sanity yet, create them
    if (!sanityUser) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Anonymous User';
      const role = isAdminEmail(email) ? UserRole.ADMIN : UserRole.STUDENT;

      const newUser = await writeClient.create({
        _type: 'user',
        clerkId: clerkUser.id,
        email: email,
        name: name,
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        role: role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        id: newUser._id,
        clerkId: clerkUser.id,
        email: email,
        name: name,
        role: role,
        clerkUser,
        createdAt: new Date(clerkUser.createdAt),
        updatedAt: new Date(clerkUser.updatedAt),
      };
    }

    // Return existing user data
    return {
      id: sanityUser._id,
      clerkId: sanityUser.clerkId,
      email: sanityUser.email,
      name: sanityUser.name,
      role: sanityUser.role,
      clerkUser,
      createdAt: new Date(sanityUser.createdAt),
      updatedAt: new Date(sanityUser.updatedAt),
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

  // Get user from Sanity
  const sanityUser = await sanityClient.fetch(`
    *[_type == "user" && clerkId == $clerkId][0] {
      _id,
      clerkId,
      email,
      name,
      firstName,
      lastName,
      role,
      createdAt,
      updatedAt
    }
  `, { clerkId: clerkUser.id });

  if (!sanityUser) {
    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Anonymous User';
    const role = isAdminEmail(email) ? UserRole.ADMIN : UserRole.STUDENT;

    const newUser = await writeClient.create({
      _type: 'user',
      clerkId: clerkUser.id,
      email: email,
      name: name,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      role: role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      id: newUser._id,
      clerkId: clerkUser.id,
      email: email,
      name: name,
      role: role,
      clerkUser,
      createdAt: new Date(clerkUser.createdAt),
      updatedAt: new Date(clerkUser.updatedAt),
    };
  }

  return {
    id: sanityUser._id,
    clerkId: sanityUser.clerkId,
    email: sanityUser.email,
    name: sanityUser.name,
    role: sanityUser.role,
    clerkUser,
    createdAt: new Date(sanityUser.createdAt),
    updatedAt: new Date(sanityUser.updatedAt),
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

// Export utility functions for use in other parts of the app
export { isAdminEmail, getAdminEmails };
