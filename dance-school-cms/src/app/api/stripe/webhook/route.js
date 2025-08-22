import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

// Detect environment and pick the right secret
const webhookSecret =
  process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_WEBHOOK_SECRET_PROD // from Stripe Dashboard
    : process.env.STRIPE_WEBHOOK_SECRET_LOCAL; // from Stripe CLI

// CRITICAL: Disable body parsing for this API route to preserve raw body for signature verification
// This prevents Vercel/Next.js from modifying the request body which breaks Stripe signatures
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Explicitly disable body parsing to prevent payload modification
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  console.log('🔍 Webhook POST request received');
  
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
  
  let event;
  let rawBody;

  try {
    // CRITICAL: Use arrayBuffer() and convert to Buffer to preserve exact bytes
    // This is the ORIGINAL working approach that was used before
    const arrayBuffer = await req.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
    
    console.log('📦 Raw body received as buffer, length:', rawBody.length);
    console.log('🔑 Signature header:', sig.substring(0, 50) + '...');
    console.log('📄 Body preview:', rawBody.toString('utf8', 0, 100) + '...');
    
    // Verify webhook signature with buffer converted to string
    event = stripe.webhooks.constructEvent(rawBody.toString('utf8'), sig, webhookSecret);
    
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('❌ Signature header:', sig);
    console.error('❌ Raw body length:', rawBody?.length || 'undefined');
    console.error('❌ Webhook secret configured:', !!webhookSecret);
    console.error('❌ Webhook secret length:', webhookSecret?.length);
    console.error('❌ Body preview for debugging:', rawBody?.toString('utf8', 0, 200) || 'no body');
    
    // Return the exact error message from Stripe for debugging
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`✅ Received verified event: ${event.type} (${event.id})`);

  // Handle the events you care about
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('💰 Checkout session completed:', session.id);
    
    // Process pass purchases and upgrades
    if (session.metadata?.type === 'pass_purchase') {
      await createSubscriptionFromSession(session);
    } else if (session.metadata?.type === 'pass_upgrade') {
      await handlePassUpgrade(session);
    } else {
      console.log('ℹ️ Skipping non-pass purchase/upgrade session');
    }
  }

  // Handle charge.succeeded events
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object;
    console.log('💳 Charge succeeded:', charge.id);
    await handleChargeSucceeded(charge);
  }

  return new NextResponse(null, { status: 200 });
}

async function createSubscriptionFromSession(session) {
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
    let endDate;

    // Determine end date based on pass configuration
    if (pass.validityType === 'date' && pass.expiryDate) {
      // Use fixed expiry date
      endDate = new Date(pass.expiryDate);
      console.log('✅ Using fixed expiry date:', endDate.toISOString());
    } else if (pass.validityType === 'days' && pass.validityDays) {
      // Calculate from validity days
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('✅ Calculated expiry from validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else if (pass.validityDays) {
      // Fallback to validityDays for passes without validityType
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('⚠️ Using fallback validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else {
      console.error('❌ Pass has no valid expiry configuration:', { validityType: pass.validityType, validityDays: pass.validityDays, expiryDate: pass.expiryDate });
      return;
    }

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

async function handlePassUpgrade(session) {
  try {
    console.log('🔄 Processing pass upgrade from session:', session.id);
    
    // Extract metadata
    const { 
      passId, 
      userId, 
      tenantId, 
      upgradeFromSubscriptionId,
      originalPassPrice,
      newPassPrice,
      upgradeCost
    } = session.metadata || {};
    
    if (!passId || !userId || !tenantId || !upgradeFromSubscriptionId) {
      console.error('❌ Missing required upgrade metadata:', { passId, userId, tenantId, upgradeFromSubscriptionId });
      return;
    }

    console.log('📋 Upgrade details:');
    console.log('   From subscription:', upgradeFromSubscriptionId);
    console.log('   To pass:', passId);
    console.log('   Original price:', originalPassPrice, 'NOK');
    console.log('   New price:', newPassPrice, 'NOK');
    console.log('   Upgrade cost:', upgradeCost, 'NOK');

    // Get the current subscription
    const currentSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && _id == $subscriptionId][0]`,
      { subscriptionId: upgradeFromSubscriptionId }
    );

    if (!currentSubscription) {
      console.error('❌ Current subscription not found:', upgradeFromSubscriptionId);
      return;
    }

    // Get the new pass details
    const newPass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
      }`,
      { passId }
    );

    if (!newPass) {
      console.error('❌ New pass not found:', passId);
      return;
    }

    console.log('✅ Found new pass:', newPass.name, '(' + newPass.type + ')');

    // Calculate new subscription details
    const now = new Date();
    let endDate;

    // Determine end date based on new pass configuration
    if (newPass.validityType === 'date' && newPass.expiryDate) {
      endDate = new Date(newPass.expiryDate);
      console.log('✅ Using fixed expiry date:', endDate.toISOString());
    } else if (newPass.validityType === 'days' && newPass.validityDays) {
      endDate = new Date(now.getTime() + newPass.validityDays * 24 * 60 * 60 * 1000);
      console.log('✅ Calculated expiry from validityDays:', newPass.validityDays, 'days ->', endDate.toISOString());
    } else if (newPass.validityDays) {
      endDate = new Date(now.getTime() + newPass.validityDays * 24 * 60 * 60 * 1000);
      console.log('⚠️ Using fallback validityDays:', newPass.validityDays, 'days ->', endDate.toISOString());
    } else {
      console.error('❌ New pass has no valid expiry configuration');
      return;
    }

    let subscriptionType;
    let remainingClips;

    switch (newPass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = newPass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = newPass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        console.error('❌ Invalid new pass type:', newPass.type);
        return;
    }

    // Deactivate the old subscription
    await sanityClient
      .patch(upgradeFromSubscriptionId)
      .set({ 
        isActive: false,
        upgradedAt: now.toISOString(),
        upgradedToPassId: newPass._id,
        upgradedToPassName: newPass.name
      })
      .commit();

    console.log('✅ Deactivated old subscription:', upgradeFromSubscriptionId);

    // Create new subscription with upgraded pass
    const newSubscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: currentSubscription.user._ref,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: subscriptionType,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: newPass._id,
      passName: newPass.name,
      purchasePrice: parseFloat(newPassPrice) || newPass.price,
      stripePaymentId: session.payment_intent,
      stripeSessionId: session.id,
      isActive: true,
      isUpgrade: true,
      upgradedFromSubscriptionId: upgradeFromSubscriptionId,
      upgradeCost: parseFloat(upgradeCost) || 0,
    };

    console.log('📝 Creating upgraded subscription:');
    console.log('   Pass:', newPass.name, '(' + subscriptionType + ')');
    console.log('   Classes:', remainingClips || 'Unlimited');
    console.log('   Valid until:', endDate.toLocaleDateString());

    const createdSubscription = await sanityClient.create(newSubscriptionData);
    console.log('🎉 SUCCESS! Created upgraded subscription:', createdSubscription._id);
    console.log('✅ Pass upgrade completed successfully');

  } catch (error) {
    console.error('❌ Error handling pass upgrade:', error);
  }
}

async function handleChargeSucceeded(charge) {
  try {
    console.log('💳 Processing charge.succeeded event:', charge.id);
    console.log('   Amount:', charge.amount / 100, charge.currency.toUpperCase());
    console.log('   Customer:', charge.customer);
    console.log('   Payment Intent:', charge.payment_intent);
    
    // Log the charge for debugging
    console.log('✅ Charge processed successfully');
    
  } catch (error) {
    console.error('❌ Error handling charge.succeeded:', error);
  }
}
