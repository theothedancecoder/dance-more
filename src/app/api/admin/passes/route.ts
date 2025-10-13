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
    
    // Check if we should filter expired passes (for student view)
    const { searchParams } = new URL(request.url);
    const filterExpired = searchParams.get('filterExpired') === 'true';
    
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
        _updatedAt,
        "isExpired": validityType == "date" && dateTime(expiryDate) < dateTime(now())
      }
    `);

    // Filter out expired passes if requested (for student view)
    let filteredPasses = passes;
    if (filterExpired) {
      filteredPasses = passes.filter((pass: any) => {
        // Only show active passes
        if (!pass.isActive) return false;
        
        // Filter out expired fixed-date passes
        // Check both Sanity's isExpired and do a JavaScript fallback check
        if (pass.validityType === 'date' && pass.expiryDate) {
          // If Sanity's isExpired is explicitly true, filter it out
          if (pass.isExpired === true) {
            return false;
          }
          
          // Fallback: Check expiry date in JavaScript (in case Sanity returned null)
          const expiryDate = new Date(pass.expiryDate);
          const now = new Date();
          if (expiryDate < now) {
            console.log(`⏰ Filtering expired pass: ${pass.name} (expired ${expiryDate.toLocaleDateString()})`);
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`📋 Filtered passes: ${passes.length} total, ${filteredPasses.length} available (${passes.length - filteredPasses.length} expired/inactive)`);
    }

    return NextResponse.json({ passes: filteredPasses });
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}
