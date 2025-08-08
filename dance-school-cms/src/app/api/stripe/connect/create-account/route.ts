import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { stripeConnect } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers
    const tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantId && !tenantSlug) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Get tenant details (support both ID and slug lookup)
    let tenant;
    if (tenantId) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && _id == $tenantId][0] {
          _id,
          schoolName,
          contactEmail,
          ownerId,
          stripeConnect
        }`,
        { tenantId }
      );
    } else {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug][0] {
          _id,
          schoolName,
          contactEmail,
          ownerId,
          stripeConnect
        }`,
        { tenantSlug }
      );
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify user is admin of this tenant (check both user table and tenant owner)
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
      { userId, tenantId: tenant._id }
    );

    const isOwner = tenant.ownerId === userId;

    if (!user && !isOwner) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if already has a Stripe Connect account
    if (tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        error: 'Stripe Connect account already exists',
        accountId: tenant.stripeConnect.accountId 
      }, { status: 400 });
    }

    const { businessType = 'individual', country = 'NO' } = await request.json();

    // Get email for Stripe account - try tenant contactEmail first, then user's Clerk email
    let email = tenant.contactEmail;
    
    if (!email) {
      console.log('No tenant contactEmail, fetching from Clerk...');
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        email = clerkUser.emailAddresses?.[0]?.emailAddress;
        console.log('Got email from Clerk:', email);
      } catch (clerkError) {
        console.error('Error fetching user from Clerk:', clerkError);
      }
    }

    if (!email) {
      return NextResponse.json({ 
        error: 'Email address required. Please set a contact email for your school or ensure your account has a valid email address.' 
      }, { status: 400 });
    }

    console.log('Creating Stripe Connect account with email:', email);

    // Create Stripe Connect account
    const account = await stripeConnect.createAccount({
      email,
      country,
      businessType,
    });

    console.log('Stripe Connect account created:', account.id);

    // Update tenant with Stripe Connect info and email if it was missing
    const updateData: any = {
      'stripeConnect.accountId': account.id,
      'stripeConnect.accountStatus': 'pending',
      'stripeConnect.country': country,
      'stripeConnect.connectedAt': new Date().toISOString(),
      'stripeConnect.lastSyncAt': new Date().toISOString(),
    };

    // If tenant didn't have contactEmail, set it now
    if (!tenant.contactEmail && email) {
      updateData.contactEmail = email;
    }

    await writeClient
      .patch(tenant._id)
      .set(updateData)
      .commit();

    console.log('Tenant updated with Stripe Connect info');

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Stripe Connect account created successfully'
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
