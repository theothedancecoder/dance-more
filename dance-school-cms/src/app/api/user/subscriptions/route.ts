import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No userId found in auth()');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated with ID:', userId);

    // Get tenant slug from header
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    // First get the tenant ID
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id
      }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get user's active subscriptions for this tenant
    const now = new Date();
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        _createdAt,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }`,
      { userId, now: now.toISOString(), tenantId: tenant._id }
    );

    console.log('Sanity query params:', { userId, tenantId: tenant._id, now: now.toISOString() });
    console.log('Found subscriptions:', subscriptions);

    // Debug: Check if there are any subscriptions at all for this tenant
    const allSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId] {
        _id,
        type,
        passName,
        user,
        isActive,
        startDate,
        endDate
      }`,
      { tenantId: tenant._id }
    );
    console.log('All subscriptions for tenant:', allSubscriptions);

    // Also get expired subscriptions for history (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && (isActive == false || endDate <= $now) && endDate >= $thirtyDaysAgo && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        _createdAt,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }`,
      { userId, now: now.toISOString(), thirtyDaysAgo: thirtyDaysAgo.toISOString(), tenantId: tenant._id }
    );

    return NextResponse.json({ 
      activeSubscriptions: subscriptions,
      expiredSubscriptions: expiredSubscriptions
    });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
