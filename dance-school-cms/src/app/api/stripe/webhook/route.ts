import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN!,
  apiVersion: '2023-05-03',
  useCdn: false,
});

// Use the correct webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function createSubscriptionFromSession(session: Stripe.Checkout.Session) {
  try {
    console.log('🎫 Creating subscription from session:', session.id);
    
    // Check if subscription already exists
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
      { sessionId: session.id }
    );

    if (existingSubscription) {
      console.log('✅ Subscription already exists for session:', session.id);
      return;
    }

    // Extract metadata
    const { passId, userId, tenantId } = session.metadata || {};
    
    if (!passId || !userId || !tenantId) {
      console.error('❌ Missing required metadata in session:', { passId, userId, tenantId });
      return;
    }

    // Get pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { passId }
    );

    if (!pass) {
      console.error('❌ Pass not found:', passId);
      return;
    }

    console.log('✅ Found pass:', pass.name, '(' + pass.type + ')');

    // Ensure user exists - userId from metadata is the Clerk ID
    let user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log('👤 Creating user with Clerk ID:', userId);
      user = await sanityClient.create({
        _type: 'user',
        clerkId: userId,
        name: session.customer_details?.name || 'Customer',
        email: session.customer_details?.email || session.customer_email || '',
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ User created:', user._id);
    } else {
      console.log('✅ User exists:', user.name, '(' + user._id + ')');
    }

    // Calculate subscription details
    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

    let subscriptionType;
    let remainingClips;

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
        return;
    }

    // Create subscription
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: subscriptionType,
      startDate: new Date(session.created * 1000).toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
      stripePaymentId: session.payment_intent,
      stripeSessionId: session.id,
      isActive: true,
    };

    console.log('📝 Creating subscription for', user.name + ':');
    console.log('   Pass:', pass.name, '(' + subscriptionType + ')');
    console.log('   Classes:', remainingClips || 'Unlimited');
    console.log('   Valid until:', endDate.toLocaleDateString());

    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log('🎉 SUCCESS! Created subscription:', createdSubscription._id);
    console.log('✅', user.name, 'can now see their', pass.name, 'pass in "Your Active Passes"');

  } catch (error) {
    console.error('❌ Error creating subscription from webhook:', error);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') as string;
  
  // CRITICAL: Get raw body as buffer to preserve exact bytes for signature verification
  // This prevents issues with JSON parsing corrupting the signature
  const body = await req.arrayBuffer();
  const bodyString = Buffer.from(body).toString('utf8');

  let event: Stripe.Event;

  try { 
    event = stripe.webhooks.constructEvent(bodyString, sig, webhookSecret!);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    console.error('❌ Signature header:', sig);
    console.error('❌ Body length:', bodyString.length);
    console.error('❌ Webhook secret exists:', !!webhookSecret);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`✅ Received event: ${event.type}`);

  // Handle the events you care about
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('💰 Checkout session completed:', session.id);
    
    // Process all checkout sessions (remove restrictive filter)
    if (session.metadata?.passId) {
      await createSubscriptionFromSession(session);
    } else {
      console.log('ℹ️ Skipping session without passId metadata:', session.id);
    }
  }

  return new NextResponse(null, { status: 200 });
}
