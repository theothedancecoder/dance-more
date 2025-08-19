import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sanityClient } from '@/lib/sanity';
import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function getAuthenticatedUser() {
  try {
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    
    const sessionToken = authorization.substring(7);
    const session = await clerkClient.sessions.verifySession(sessionToken, sessionToken);
    
    if (!session) {
      return null;
    }
    
    const user = await clerkClient.users.getUser(session.userId);
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.publicMetadata?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, let's skip authentication to test the basic functionality
    // TODO: Implement proper authentication once middleware issues are resolved
    
    // Fetch all passes from Sanity
    const passes = await sanityClient.fetch(`
      *[_type == "pass"] | order(name asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive,
        _createdAt,
        _updatedAt
      }
    `);

    return NextResponse.json({ passes });
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}
