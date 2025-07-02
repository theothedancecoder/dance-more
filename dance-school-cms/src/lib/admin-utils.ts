import { db } from './database';
import { UserRole } from '@/types';
import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Utility function to promote a user to admin and update Clerk metadata
export async function promoteToAdmin(email: string): Promise<boolean> {
  try {
    // First, find the user in Clerk by email
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (clerkUsers.data.length === 0) {
      console.error(`User with email ${email} not found in Clerk`);
      return false;
    }

    const clerkUser = clerkUsers.data[0];

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: UserRole.ADMIN,
      },
    });

    // Also update local database
    let dbUser = db.getUserByEmail(email);
    if (!dbUser) {
      // Create user in local database if doesn't exist
      dbUser = db.createUser({
        email,
        name: clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}` 
          : email,
        role: UserRole.ADMIN,
      });
    } else {
      // Update existing user
      db.updateUser(dbUser.id, { role: UserRole.ADMIN });
    }

    console.log(`User ${email} promoted to admin successfully`);
    return true;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
}

// Utility function to list all users and their roles
export function listAllUsers() {
  const users = db.listUsers();
  console.log('All users:');
  users.forEach((user: any) => {
    console.log(`- ${user.email}: ${user.role} (ID: ${user.id})`);
  });
  return users;
}

// Utility function to demote admin to student
export async function demoteToStudent(email: string): Promise<boolean> {
  try {
    // First, find the user in Clerk by email
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (clerkUsers.data.length === 0) {
      console.error(`User with email ${email} not found in Clerk`);
      return false;
    }

    const clerkUser = clerkUsers.data[0];

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: UserRole.STUDENT,
      },
    });

    // Also update local database
    const user = db.getUserByEmail(email);
    if (user) {
      db.updateUser(user.id, { role: UserRole.STUDENT });
    }

    console.log(`User ${email} demoted to student`);
    return true;
  } catch (error) {
    console.error('Error demoting user:', error);
    return false;
  }
}

// Server-side only utility to check if a user is admin by Clerk user ID
export async function isAdmin(clerkUserId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    if (!user) {
      return false;
    }

    // Check if user has admin role in Clerk metadata
    const isAdminInClerk = user.publicMetadata?.role === UserRole.ADMIN;
    
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
