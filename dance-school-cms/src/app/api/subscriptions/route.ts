import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';

// Get user's active subscriptions and available passes
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated with clerkId:', userId);

    // CRITICAL FIX: userId from Clerk auth() is actually clerkId, not Sanity _id
    // We need to find the user by clerkId first, then use their _id for subscriptions
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id,
        name,
        email,
        clerkId
      }`,
      { clerkId: userId }
    );

    if (!user) {
      console.log('⚠️ User not found in Sanity with clerkId:', userId);
      console.log('💡 This might be why subscriptions are not showing - user needs to be created in Sanity');
      return NextResponse.json({ 
        subscriptions: [],
        availablePasses: []
      });
    }

    console.log('✅ Found user in Sanity:', user.name || user.email || user._id);
    console.log('🔗 User mapping: clerkId =', userId, '-> Sanity _id =', user._id);

    // Get user's subscriptions using the correct Sanity _id
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`,
      { sanityUserId: user._id }
    );

    console.log('📊 Found subscriptions:', subscriptions.length);

    // Get available passes for purchase
    const availablePasses = await sanityClient.fetch(
      `*[_type == "pass" && isActive == true] | order(price asc)`
    );

    // Filter active subscriptions (not expired)
    const now = new Date();
    const activeSubscriptions = subscriptions.filter((sub: any) => 
      new Date(sub.endDate) > now
    );

    console.log('📋 Active subscriptions after filtering:', activeSubscriptions.length);

    return NextResponse.json({ 
      subscriptions: activeSubscriptions,
      availablePasses: availablePasses 
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// Create new subscription based on selected pass
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { passId, stripePaymentId } = await request.json();

    if (!passId) {
      return NextResponse.json(
        { error: 'Pass ID is required' },
        { status: 400 }
      );
    }

    // Ensure user exists in Sanity
    let user = await sanityClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      // Create user in Sanity if they don't exist
      try {
        user = await writeClient.create({
          _type: 'user',
          _id: userId,
          name: 'User', // Default name, will be updated by webhook
          email: '', // Will be updated by webhook
          role: 'student',
        });
      } catch (error) {
        console.error('Error creating user in Sanity:', error);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }

    // Get the selected pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId && isActive == true][0]`,
      { passId }
    );

    if (!pass) {
      return NextResponse.json(
        { error: 'Pass not found or inactive' },
        { status: 404 }
      );
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

    // Determine subscription type and remaining clips based on pass type
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
        remainingClips = undefined; // Unlimited
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid pass type' },
          { status: 400 }
        );
    }

    const subscription = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: userId,
      },
      type: subscriptionType,
      passId: pass._id,
      passName: pass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      isActive: true,
      stripePaymentId,
      purchasePrice: pass.price,
    };

    const createdSubscription = await writeClient.create(subscription);

    return NextResponse.json({
      success: true,
      subscription: createdSubscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
