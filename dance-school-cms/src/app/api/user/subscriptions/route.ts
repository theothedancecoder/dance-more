import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { resolveUserReferenceIds } from '@/lib/user-references';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ No userId found in auth()');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated with ID:', userId);

    // Get tenant slug from header
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      console.log('❌ No tenant slug provided');
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    console.log('🏢 Looking for tenant:', tenantSlug);

    // First get the tenant ID - try multiple ways to find the tenant
    let tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current
      }`,
      { tenantSlug }
    );

    // If not found by slug, try by subdomain
    if (!tenant) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && subdomain.current == $tenantSlug][0] {
          _id,
          schoolName,
          "subdomain": subdomain.current
        }`,
        { tenantSlug }
      );
    }

    // If still not found, try by school name (case insensitive)
    if (!tenant) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && lower(schoolName) match lower($tenantSlug + "*")][0] {
          _id,
          schoolName,
          "subdomain": subdomain.current
        }`,
        { tenantSlug }
      );
    }

    if (!tenant) {
      console.log('❌ Tenant not found:', tenantSlug);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found tenant:', tenant.schoolName, 'ID:', tenant._id);

    const userReferenceIds = await resolveUserReferenceIds(userId);
    const matchedUserDocuments = await sanityClient.fetch<number>(
      `count(*[_type == "user" && (clerkId == $clerkId || _id == $clerkId)])`,
      { clerkId: userId }
    );
    console.log('🔗 Resolved user references for subscriptions:', userReferenceIds);

    const tenantPassIds = await sanityClient.fetch<string[]>(
      `*[_type == "pass" && tenant._ref == $tenantId]._id`,
      { tenantId: tenant._id }
    );

    // Get user's active subscriptions for this tenant using the correct Sanity _id
    const now = new Date();
    console.log('🔍 Querying subscriptions with params:', { 
      userReferenceIds,
      clerkId: userId,
      tenantId: tenant._id, 
      now: now.toISOString() 
    });

    // IMPORTANT: We prioritize the stored passName and only use originalPass as fallback
    // This ensures customers see the correct pass name they actually purchased
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref in $userReferenceIds && isActive == true && endDate > $now && (tenant._ref == $tenantId || (!defined(tenant) && ((defined(passId) && passId in $tenantPassIds) || (defined(pass._ref) && pass._ref in $tenantPassIds))))] | order(_createdAt desc) {
        _id,
        type,
        passName,
        passId,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        stripePaymentId,
        stripeSessionId,
        _createdAt,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "originalPass": *[_type == "pass" && _id == coalesce(^.passId, ^.pass._ref)][0]{name, type}
      }`,
      { userReferenceIds, now: now.toISOString(), tenantId: tenant._id, tenantPassIds }
    );

    console.log('📊 Found active subscriptions:', subscriptions.length);
    if (subscriptions.length > 0) {
      console.log('📋 Subscription details:', subscriptions.map((sub: any) => ({
        id: sub._id,
        storedPassName: sub.passName,
        originalPassName: sub.originalPass?.name,
        finalDisplayName: sub.passName || sub.originalPass?.name || 'Class Package',
        type: sub.type,
        daysRemaining: sub.daysRemaining,
        sessionId: sub.stripeSessionId
      })));
    }

    // Debug: Check if there are any subscriptions at all for this user across all tenants
    const userSubscriptionsAllTenants = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref in $userReferenceIds] {
        _id,
        type,
        passName,
        isActive,
        startDate,
        endDate,
        tenant->{_id, schoolName}
      }`,
      { userReferenceIds }
    );
    console.log('🔍 All user subscriptions across tenants:', userSubscriptionsAllTenants.length);

    // Debug: Check if there are any subscriptions at all for this tenant
    const allTenantSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId] {
        _id,
        type,
        passName,
        user->{_id, name, email},
        isActive,
        startDate,
        endDate,
        stripeSessionId
      }`,
      { tenantId: tenant._id }
    );
    console.log('🔍 All subscriptions for tenant:', allTenantSubscriptions.length);

    // Also get expired subscriptions for history (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref in $userReferenceIds && (isActive == false || endDate <= $now) && endDate >= $thirtyDaysAgo && (tenant._ref == $tenantId || (!defined(tenant) && ((defined(passId) && passId in $tenantPassIds) || (defined(pass._ref) && pass._ref in $tenantPassIds))))] | order(_createdAt desc) {
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
      { userReferenceIds, now: now.toISOString(), thirtyDaysAgo: thirtyDaysAgo.toISOString(), tenantId: tenant._id, tenantPassIds }
    );

    console.log('📊 Found expired subscriptions:', expiredSubscriptions.length);

    // Log summary for debugging
    console.log('📈 SUBSCRIPTION FETCH SUMMARY:', {
      clerkId: userId,
      userReferenceIds,
      tenantId: tenant._id,
      tenantName: tenant.schoolName,
      userExistsInSanity: matchedUserDocuments > 0,
      activeSubscriptions: subscriptions.length,
      expiredSubscriptions: expiredSubscriptions.length,
      totalUserSubscriptions: userSubscriptionsAllTenants.length,
      totalTenantSubscriptions: allTenantSubscriptions.length
    });

    return NextResponse.json({ 
      activeSubscriptions: subscriptions,
      expiredSubscriptions: expiredSubscriptions,
      debug: {
        clerkId: userId,
        userReferenceIds,
        tenantId: tenant._id,
        userExists: matchedUserDocuments > 0,
        totalUserSubscriptions: userSubscriptionsAllTenants.length,
        totalTenantSubscriptions: allTenantSubscriptions.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user subscriptions:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
