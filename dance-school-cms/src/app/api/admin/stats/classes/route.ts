import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function GET(request: NextRequest) {
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

    // Get tenant from headers
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Get tenant ID from slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]{ _id }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Count total classes for this tenant
    const classCount = await sanityClient.fetch(
      `count(*[_type == "class" && tenant._ref == $tenantId])`,
      { tenantId: tenant._id }
    );

    // Get popular classes with booking counts
    const popularClasses = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId] {
        "name": title,
        "bookings": count(*[_type == "booking" && class._ref == ^._id])
      } | order(bookings desc)[0...5]`,
      { tenantId: tenant._id }
    );

    return NextResponse.json({ 
      totalClasses: classCount,
      popularClasses: popularClasses || []
    });
  } catch (error) {
    console.error('Error fetching class stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class statistics' },
      { status: 500 }
    );
  }
}
