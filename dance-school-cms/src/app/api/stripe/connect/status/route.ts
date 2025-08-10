import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { stripeConnect } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers - support both x-tenant-id and x-tenant-slug
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    // If no tenant ID but we have slug, look up the tenant ID
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $slug][0]._id`,
        { slug: tenantSlug }
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
        stripeConnect
      }`,
      { tenantId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        connected: false,
        message: 'No Stripe Connect account found'
      });
    }

    // Get account details from Stripe
    const account = await stripeConnect.getAccount(tenant.stripeConnect.accountId);

    // Update tenant with latest account status
    const updateData: any = {
      'stripeConnect.lastSyncAt': new Date().toISOString(),
      'stripeConnect.chargesEnabled': account.charges_enabled,
      'stripeConnect.payoutsEnabled': account.payouts_enabled,
    };

    // Determine account status
    if (account.details_submitted && account.charges_enabled) {
      updateData['stripeConnect.accountStatus'] = 'active';
      updateData['stripeConnect.onboardingCompleted'] = true;
    } else if (account.details_submitted) {
      updateData['stripeConnect.accountStatus'] = 'pending';
    } else {
      updateData['stripeConnect.accountStatus'] = 'not_connected';
    }

    // Update tenant in database
    await writeClient
      .patch(tenantId)
      .set(updateData)
      .commit();

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      accountStatus: updateData['stripeConnect.accountStatus'],
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingCompleted: updateData['stripeConnect.onboardingCompleted'] || false,
      detailsSubmitted: account.details_submitted,
      country: account.country,
      currency: account.default_currency,
      businessType: account.business_type,
      email: account.email,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      }
    });

  } catch (error) {
    console.error('Error fetching Stripe Connect status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}
