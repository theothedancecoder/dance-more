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

// Ensure webhook secret is configured
if (!webhookSecret) {
  console.error('❌ STRIPE_WEBHOOK_SECRET environment variable is not set');
}

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

async function handleChargeSucceeded(charge: Stripe.Charge) {
  try {
    console.log('💳 Charge succeeded:', charge.id, 'Amount:', charge.amount / 100, charge.currency.toUpperCase());
    
    // If this charge is associated with a payment intent that has metadata, we can process it
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
      const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
      
      if (paymentIntent.metadata?.passId) {
        console.log('🎫 Found passId in payment intent metadata:', paymentIntent.metadata.passId);
        
        // Create a mock session object from the payment intent for compatibility
        const mockSession: Partial<Stripe.Checkout.Session> = {
          id: `pi_session_${paymentIntent.id}`,
          payment_intent: paymentIntent.id,
          amount_total: paymentIntent.amount,
          metadata: paymentIntent.metadata,
          customer_details: {
            email: paymentIntent.receipt_email || '',
            name: paymentIntent.shipping?.name || 'Customer',
            address: null,
            phone: null,
            tax_exempt: null,
            tax_ids: null,
          },
          created: Math.floor(Date.now() / 1000),
        };
        
        await createSubscriptionFromSession(mockSession as Stripe.Checkout.Session);
      } else {
        console.log('ℹ️ No passId metadata found in payment intent for charge:', charge.id);
      }
    } else {
      console.log('ℹ️ Charge not associated with payment intent:', charge.id);
    }
  } catch (error) {
    console.error('❌ Error handling charge.succeeded:', error);
  }
}

export async function POST(req: Request) {
  // Validate webhook secret exists
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  
  if (!sig) {
    console.error('❌ No Stripe signature header found');
    return new NextResponse('No signature header', { status: 400 });
  }
  
  let body: string = '';
  let event: Stripe.Event;

  try {
    // CRITICAL: Get raw body as text to preserve exact bytes for signature verification
    // Using req.text() instead of arrayBuffer conversion to avoid encoding issues
    body = await req.text();
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    
  } catch (err) {
    const error = err as Error;
    console.error('❌ Webhook signature verification failed:', error.message);
    console.error('❌ Signature header:', sig);
    console.error('❌ Body length:', body.length);
    console.error('❌ Webhook secret configured:', !!webhookSecret);
    
    // Return the exact error message from Stripe for debugging
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  console.log(`✅ Received verified event: ${event.type} (${event.id})`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Checkout session completed:', session.id);
        
        if (session.metadata?.passId) {
          await createSubscriptionFromSession(session);
        } else {
          console.log('ℹ️ Skipping session without passId metadata:', session.id);
        }
        break;

      case 'charge.succeeded':
        const charge = event.data.object as Stripe.Charge;
        await handleChargeSucceeded(charge);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💳 Payment intent succeeded:', paymentIntent.id);
        // This is often followed by charge.succeeded, so we can log it but don't need to process
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error processing webhook event:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}
