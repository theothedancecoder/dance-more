import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { stripe } from '@/lib/stripe';

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

    // Get tenant info
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]{ _id, schoolName }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.log('🔄 Syncing subscriptions for user:', userId, 'tenant:', tenant.schoolName);

    // Ensure user exists in Sanity first
    let user = await sanityClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log('👤 Creating user in Sanity during sync:', userId);
      try {
        user = await writeClient.create({
          _type: 'user',
          _id: userId,
          name: 'User', // Will be updated when we have more info
          email: '', // Will be updated when we have more info
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ User created during sync:', user._id);
      } catch (error) {
        console.error('❌ Failed to create user during sync:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    // Check for recent Stripe sessions for this user that might not have been processed
    const recentSessions = await stripe.checkout.sessions.list({
      limit: 20, // Increased limit to catch more sessions
      created: {
        gte: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), // Last 7 days instead of 24 hours
      },
    });

    const userSessions = recentSessions.data.filter(session => 
      session.metadata?.userId === userId && 
      session.metadata?.tenantId === tenant._id &&
      session.metadata?.type === 'pass_purchase' &&
      session.payment_status === 'paid'
    );

    console.log('💳 Found recent paid sessions for user:', userSessions.length);

    let createdCount = 0;
    let skippedCount = 0;

    for (const session of userSessions) {
      const { passId } = session.metadata || {};
      
      if (!passId) {
        console.log('⚠️ Session missing passId:', session.id);
        continue;
      }

      // Check if subscription already exists for this session (using both session ID and payment ID)
      const existingSubscription = await sanityClient.fetch(
        `*[_type == "subscription" && (stripeSessionId == $sessionId || stripePaymentId == $paymentId)][0]`,
        { sessionId: session.id, paymentId: session.payment_intent }
      );

      if (existingSubscription) {
        console.log('✅ Subscription already exists for session:', session.id);
        skippedCount++;
        continue;
      }

      // Get pass details
      const pass = await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId && isActive == true][0]`,
        { passId }
      );

      if (!pass) {
        console.log('❌ Pass not found:', passId);
        continue;
      }

      // Create the missing subscription
      const sessionDate = new Date(session.created * 1000);
      const endDate = new Date(sessionDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

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
          console.error('❌ Invalid pass type:', pass.type);
          continue;
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
        startDate: sessionDate.toISOString(),
        endDate: endDate.toISOString(),
        remainingClips,
        passId: pass._id, // Store original pass ID
        passName: pass.name,
        purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
        stripePaymentId: session.payment_intent as string,
        stripeSessionId: session.id, // Add session ID for proper tracking
        isActive: true,
      };

      try {
        const createdSubscription = await writeClient.create(subscriptionData);
        console.log('🎉 Created missing subscription:', createdSubscription._id, 'for pass:', pass.name);
        console.log('📋 Subscription details:', {
          id: createdSubscription._id,
          type: subscriptionType,
          passName: pass.name,
          remainingClips,
          validUntil: endDate.toISOString(),
          sessionId: session.id
        });
        createdCount++;
      } catch (error) {
        console.error('❌ Failed to create subscription:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
        }
      }
    }

    const message = `Synced ${createdCount} missing subscriptions, skipped ${skippedCount} existing ones`;
    console.log('✅ Sync complete:', message);

    return NextResponse.json({ 
      success: true, 
      message,
      createdCount,
      skippedCount,
      totalSessionsFound: userSessions.length
    });

  } catch (error) {
    console.error('❌ Sync subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscriptions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
