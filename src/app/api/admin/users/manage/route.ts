import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/database';
import { UserRole } from '@/types';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function GET() {
  try {
    const users = db.listUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, email } = await request.json();

    if (action === 'promote') {
      // First, find the user in Clerk by email
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [email],
      });

      if (clerkUsers.data.length === 0) {
        return NextResponse.json(
          { error: `User with email ${email} not found in Clerk` },
          { status: 404 }
        );
      }

      const clerkUser = clerkUsers.data[0];

      // Update Clerk metadata
      await clerkClient.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          role: 'admin',
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

      return NextResponse.json({ success: true });
    } 
    
    else if (action === 'demote') {
      const user = db.getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: `User with email ${email} not found` },
          { status: 404 }
        );
      }

      db.updateUser(user.id, { role: UserRole.STUDENT });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
