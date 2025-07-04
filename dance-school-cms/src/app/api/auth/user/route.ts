import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user from Sanity
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
