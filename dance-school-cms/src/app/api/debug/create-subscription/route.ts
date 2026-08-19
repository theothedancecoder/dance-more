import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeClient, sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId: overrideUserId, passId: overridePassId } = body || {};
    const { userId } = await auth();
    const targetUserId = overrideUserId || userId;

    if (!targetUserId) {
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

    const pass = overridePassId
      ? await sanityClient.fetch(
          `*[_type == "pass" && _id == $passId && tenant._ref == $tenantId && isActive == true][0]`,
          { passId: overridePassId, tenantId: tenant._id }
        )
      : null;

    const passes = pass
      ? [pass]
      : await sanityClient.fetch(
          `*[_type == "pass" && tenant._ref == $tenantId && isActive == true] | order(_createdAt desc)`,
          { tenantId: tenant._id }
        );

    if (!passes || passes.length === 0) {
      return NextResponse.json({ error: 'No active passes found' }, { status: 404 });
    }

    const selectedPass = pass || passes[0];

    // Find/create the Sanity user by Clerk ID
    let targetUser = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]`,
      { clerkId: targetUserId }
    );

    if (!targetUser) {
      targetUser = await writeClient.create({
        _type: 'user',
        clerkId: targetUserId,
        name: 'User',
        email: '',
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const now = new Date();
    const endDate = selectedPass.validityType === 'date' && selectedPass.expiryDate
      ? new Date(selectedPass.expiryDate)
      : new Date(now.getTime() + (selectedPass.validityDays || 0) * 24 * 60 * 60 * 1000);

    let subscriptionType: string;
    let remainingClips: number | undefined;

    switch (selectedPass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = selectedPass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = selectedPass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        subscriptionType = 'single';
        remainingClips = 1;
    }

    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: targetUser._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id,
      },
      type: subscriptionType,
      passId: selectedPass._id,
      passName: selectedPass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      isActive: true,
      stripePaymentId: 'debug_test_payment',
      purchasePrice: selectedPass.price,
    };

    console.log('Creating debug subscription:', subscriptionData);

    const createdSubscription = await writeClient.create(subscriptionData);

    return NextResponse.json({
      success: true,
      message: 'Debug subscription created successfully',
      subscription: createdSubscription,
      pass: selectedPass
    });

  } catch (error) {
    console.error('Debug subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create debug subscription' },
      { status: 500 }
    );
  }
}
