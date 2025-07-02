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

    // Count total bookings in Sanity
    // This counts all class instances that have at least one booking
    const bookingsCount = await sanityClient.fetch(
      `count(*[_type == "classInstance" && defined(bookings) && count(bookings) > 0])`
    );

    return NextResponse.json({ count: bookingsCount });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking statistics' },
      { status: 500 }
    );
  }
}
