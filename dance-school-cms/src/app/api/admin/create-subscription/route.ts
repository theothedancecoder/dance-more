import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userClerkId, tenantId, passId, passName, type, purchasePrice, remainingClips } = body;

    // Create subscription using the admin client (bypasses token permissions)
    const now = new Date();
    const endDate = new Date();
    
    // Set end date based on type
    switch (type) {
      case 'single':
        endDate.setDate(now.getDate() + 1); // 1 day for single class
        break;
      case 'multi-pass':
      case 'clipcard':
        endDate.setDate(now.getDate() + 30); // 30 days for multi-pass/clipcard
        break;
      case 'monthly':
        endDate.setMonth(now.getMonth() + 1); // 1 month for monthly pass
        break;
      default:
        endDate.setDate(now.getDate() + 30);
    }

    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: userClerkId,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type,
      passId,
      passName,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips: type === 'monthly' ? undefined : remainingClips,
      isActive: true,
      stripePaymentId: `admin_created_${Date.now()}`,
      purchasePrice,
    };

    console.log('Creating subscription via admin endpoint:', subscriptionData);

    // Try to create using the write client
    const createdSubscription = await sanityClient.create(subscriptionData);

    return NextResponse.json({
      success: true,
      subscription: createdSubscription,
      message: 'Subscription created successfully'
    });

  } catch (error) {
    console.error('Error creating subscription via admin endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
