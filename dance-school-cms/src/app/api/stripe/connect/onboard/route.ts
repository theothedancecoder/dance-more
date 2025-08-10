import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { stripeConnect } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers - support both x-tenant-id and x-tenant-slug
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlugFromHeader = request.headers.get('x-tenant-slug');
    
    // If no tenant ID but we have slug, look up the tenant ID
    if (!tenantId && tenantSlugFromHeader) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $slug][0]._id`,
        { slug: tenantSlugFromHeader }
      );
      tenantId = tenant;
    }
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Verify user is admin of this tenant
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
      { userId, tenantId }
    );

    if (!user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get tenant with Stripe Connect info
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId][0] {
        _id,
        slug,
        stripeConnect
      }`,
      { tenantId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        error: 'No Stripe Connect account found. Create account first.' 
      }, { status: 400 });
    }

    const { returnUrl } = await request.json();
    const baseUrl = request.nextUrl.origin;
    const tenantSlug = tenant.slug?.current;

    // Create account link for onboarding
    const accountLink = await stripeConnect.createAccountLink(
      tenant.stripeConnect.accountId,
      `${baseUrl}/${tenantSlug}/admin/payments/stripe/refresh`, // refresh URL
      returnUrl || `${baseUrl}/${tenantSlug}/admin/payments/stripe/return` // return URL
    );

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at
    });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    );
  }
}
