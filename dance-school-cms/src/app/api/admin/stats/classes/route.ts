import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Count total class instances in Sanity
    const classCount = await sanityClient.fetch(
      `count(*[_type == "classInstance"])`
    );

    return NextResponse.json({ count: classCount });
  } catch (error) {
    console.error('Error fetching class stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class statistics' },
      { status: 500 }
    );
  }
}
