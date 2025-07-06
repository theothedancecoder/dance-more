import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug information
    const debugInfo = {
      clerkUserId: userId,
      sanityConfig: {
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
        hasToken: !!process.env.SANITY_API_TOKEN,
        environment: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    };

    // Try to fetch user from Sanity with detailed logging
    console.log('🔍 Debug: Looking for user with clerkId:', userId);
    
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]{
        _id,
        clerkId,
        role,
        isActive,
        tenant->{
          _id,
          schoolName,
          "slug": slug.current,
          status
        },
        createdAt,
        updatedAt
      }`,
      { clerkId: userId }
    );

    console.log('🔍 Debug: User found:', !!user);
    if (user) {
      console.log('🔍 Debug: User data:', JSON.stringify(user, null, 2));
    }

    // Also check if there are any users in the database at all
    const allUsers = await client.fetch(`*[_type == "user"]{_id, clerkId, role}`);
    console.log('🔍 Debug: Total users in database:', allUsers.length);

    // Check if there are any tenants
    const allTenants = await client.fetch(`*[_type == "tenant"]{_id, schoolName, "slug": slug.current, status}`);
    console.log('🔍 Debug: Total tenants in database:', allTenants.length);

    return NextResponse.json({
      debugInfo,
      user,
      totalUsers: allUsers.length,
      totalTenants: allTenants.length,
      allUsers: allUsers.map((u: any) => ({ _id: u._id, clerkId: u.clerkId, role: u.role })),
      allTenants: allTenants.map((t: any) => ({ _id: t._id, schoolName: t.schoolName, slug: t.slug, status: t.status })),
    });

  } catch (error) {
    console.error('🔍 Debug: Error in user lookup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch debug data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
