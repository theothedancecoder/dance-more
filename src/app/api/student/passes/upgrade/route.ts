import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, newPassId, successUrl, cancelUrl } = await request.json();

    if (!subscriptionId || !newPassId) {
      return NextResponse.json(
        { error: 'Subscription ID and new pass ID are required' },
        { status: 400 }
      );
    }

    // Fetch current subscription
    const subscription = await sanityClient.fetch(`
      *[_type == "subscription" && _id == $subscriptionId && user->clerkId == $userId][0] {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        user->{
          _id,
          clerkId,
          email,
          name
        }
      }
    `, { subscriptionId, userId: user.id });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or access denied' },
        { status: 404 }
      );
    }

    if (!subscription.isActive) {
      return NextResponse.json(
        { error: 'Cannot upgrade inactive subscription' },
        { status: 400 }
      );
    }

    // Check if subscription is expired
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (endDate <= now) {
      return NextResponse.json(
        { error: 'Cannot upgrade expired subscription' },
        { status: 400 }
      );
    }

    // Fetch current pass details
    const currentPass = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId][0] {
        _id,
        name,
        price,
        isActive
      }
    `, { passId: subscription.passId });

    if (!currentPass) {
      return NextResponse.json(
        { error: 'Current pass not found' },
        { status: 404 }
      );
    }

    // Fetch new pass details
    const newPass = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId][0] {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive
      }
    `, { passId: newPassId });

    if (!newPass) {
      return NextResponse.json(
        { error: 'New pass not found' },
        { status: 404 }
      );
    }

    if (!newPass.isActive) {
      return NextResponse.json(
        { error: 'Selected pass is not available for purchase' },
        { status: 400 }
      );
    }

    // Calculate upgrade cost
    const upgradeCost = newPass.price - currentPass.price;
    
    if (upgradeCost <= 0) {
      return NextResponse.json(
        { error: 'Cannot upgrade to a pass that costs the same or less' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session for upgrade
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.currency,
            product_data: {
              name: `Pass Upgrade: ${currentPass.name} → ${newPass.name}`,
              description: `Upgrade from ${currentPass.name} to ${newPass.name}`,
              metadata: {
                subscriptionId: subscription._id,
                currentPassId: currentPass._id,
                newPassId: newPass._id,
                userId: user.id,
                type: 'pass_upgrade'
              },
            },
            unit_amount: Math.round(upgradeCost * 100), // Convert to øre (smallest currency unit)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/student/passes?upgraded=true`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/student/passes`,
      customer_email: user.email,
      metadata: {
        subscriptionId: subscription._id,
        currentPassId: currentPass._id,
        newPassId: newPass._id,
        userId: user.id,
        userEmail: user.email,
        type: 'pass_upgrade',
        upgradeCost: upgradeCost.toString()
      },
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url,
      upgradeCost,
      currentPass: currentPass.name,
      newPass: newPass.name
    });
  } catch (error) {
    console.error('Pass upgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to create upgrade session' },
      { status: 500 }
    );
  }
}
