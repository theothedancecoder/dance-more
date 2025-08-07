import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeClient, sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
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

    // Get all available passes for this tenant
    const passes = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId && isActive == true] | order(_createdAt desc)`,
      { tenantId: tenant._id }
    );

    if (!passes || passes.length === 0) {
      return NextResponse.json({ error: 'No active passes found' }, { status: 404 });
    }

    // Use the first pass (most recently created)
    const pass = passes[0];

    // Create a test subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

    let subscriptionType: string;
    let remainingClips: number | undefined;

    switch (pass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = pass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = pass.classesLimit;
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
        _ref: userId,
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id,
      },
      type: subscriptionType,
      passId: pass._id,
      passName: pass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      isActive: true,
      stripePaymentId: 'debug_test_payment',
      purchasePrice: pass.price,
    };

    console.log('Creating debug subscription:', subscriptionData);

    const createdSubscription = await writeClient.create(subscriptionData);

    return NextResponse.json({
      success: true,
      message: 'Debug subscription created successfully',
      subscription: createdSubscription,
      pass: pass
    });

  } catch (error) {
    console.error('Debug subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create debug subscription' },
      { status: 500 }
    );
  }
}
