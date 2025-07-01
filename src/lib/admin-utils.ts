import { db } from './database';
import { UserRole } from '@/types';
import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Server-side only utility to check if a user is admin by Clerk user ID
export async function isAdmin(clerkUserId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    if (!user) {
      return false;
    }

    // Check if user has admin role in Clerk metadata
    const isAdminInClerk = user.publicMetadata?.role === 'admin';
    
    // Also check our local database as fallback
    if (user.emailAddresses[0]) {
      const email = user.emailAddresses[0].emailAddress;
      const dbUser = db.getUserByEmail(email);
      const isAdminInDb = dbUser?.role === UserRole.ADMIN;
      
      return isAdminInClerk || isAdminInDb;
    }
    
    return isAdminInClerk;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
