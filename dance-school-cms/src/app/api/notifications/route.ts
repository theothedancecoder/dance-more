import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';

// GET - Fetch notifications for current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = request.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current user
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine target audience filter based on user role and subscription status
    let targetAudienceFilter = `(targetAudience == "all"`;
    
    if (user.role === 'student') {
      targetAudienceFilter += ` || targetAudience == "students"`;
    } else if (user.role === 'instructor') {
      targetAudienceFilter += ` || targetAudience == "instructors"`;
    }

    // Check if user has active subscriptions for "active_subscribers" filter
    const hasActiveSubscription = await sanityClient.fetch(
      `count(*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId && isActive == true && endDate > now()]) > 0`,
      { userId: user._id, tenantId: tenant._id }
    );

    if (hasActiveSubscription) {
      targetAudienceFilter += ` || targetAudience == "active_subscribers"`;
    }

    targetAudienceFilter += `)`;

    // Fetch active notifications for this user
    const notifications = await sanityClient.fetch(
      `*[_type == "notification" && 
         tenant._ref == $tenantId && 
         isActive == true && 
         ${targetAudienceFilter} &&
         (expiresAt == null || expiresAt > now())
       ] | order(priority desc, createdAt desc) {
        _id,
        title,
        message,
        type,
        priority,
        actionUrl,
        actionText,
        createdAt,
        "isRead": $userId in readBy[].user._ref
      }`,
      { tenantId: tenant._id, userId: user._id }
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
