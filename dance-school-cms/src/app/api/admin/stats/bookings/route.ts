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

    // Get bookings count and revenue
    const bookings = await sanityClient.fetch(
      `*[_type == "booking" && tenant._ref == $tenantId] {
        _id,
        "amount": class->price,
        _createdAt
      }`,
      { tenantId: tenant._id }
    );

    // Get subscriptions (pass purchases) count and revenue
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId] {
        _id,
        amount,
        _createdAt
      }`,
      { tenantId: tenant._id }
    );

    // Calculate total revenue from both bookings and subscriptions
    const bookingRevenue = bookings.reduce((sum: number, booking: any) => 
      sum + (booking.amount || 0), 0
    );
    
    const subscriptionRevenue = subscriptions.reduce((sum: number, sub: any) => 
      sum + (sub.amount || 0), 0
    );

    const totalRevenue = bookingRevenue + subscriptionRevenue;
    const totalBookings = bookings.length + subscriptions.length;

    // Generate revenue by month data (last 6 months)
    const now = new Date();
    const revenueByMonth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthBookings = bookings.filter((b: any) => {
        const createdAt = new Date(b._createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });
      
      const monthSubscriptions = subscriptions.filter((s: any) => {
        const createdAt = new Date(s._createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });
      
      const monthRevenue = 
        monthBookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) +
        monthSubscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
      
      revenueByMonth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue
      });
    }

    return NextResponse.json({ 
      totalBookings,
      totalRevenue,
      revenueByMonth
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking statistics' },
      { status: 500 }
    );
  }
}
