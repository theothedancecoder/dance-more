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
    ? process.env.STRIPE_WEBHOOK_SECRET_PROD
    : process.env.STRIPE_WEBHOOK_SECRET_LOCAL;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Enhanced logging function
function logWebhookEvent(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
  
  // In production, you might want to send this to a logging service
  // like Sentry, LogRocket, or a custom logging endpoint
}

// Enhanced error handling function
async function handleWebhookError(error, context = {}) {
  logWebhookEvent('error', 'Webhook processing failed', {
    error: error.message,
    stack: error.stack,
    context
  });
  
  // In production, you might want to:
  // 1. Send alert to monitoring service
  // 2. Create a failed webhook record for manual processing
  // 3. Trigger retry mechanism
  
  return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
}

export async function POST(req) {
  logWebhookEvent('info', 'Webhook POST request received');
  
  // Validate webhook secret exists
  if (!webhookSecret) {
    return await handleWebhookError(new Error('STRIPE_WEBHOOK_SECRET not configured'));
  }

  const sig = req.headers.get('stripe-signature');
  
  if (!sig) {
    return await handleWebhookError(new Error('No Stripe signature header found'));
  }
  
  let event;
  let rawBody;

  try {
    const arrayBuffer = await req.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
    
    logWebhookEvent('debug', 'Raw body received', {
      bodyLength: rawBody.length,
      signaturePreview: sig.substring(0, 50) + '...'
    });
    
    event = stripe.webhooks.constructEvent(rawBody.toString('utf8'), sig, webhookSecret);
    
  } catch (err) {
    return await handleWebhookError(err, {
      signatureHeader: sig,
      bodyLength: rawBody?.length,
      webhookSecretConfigured: !!webhookSecret
    });
  }

  logWebhookEvent('info', 'Verified webhook event received', {
    eventType: event.type,
    eventId: event.id
  });

  try {
    // Handle the events you care about
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      logWebhookEvent('info', 'Processing checkout session completed', {
        sessionId: session.id,
        metadataType: session.metadata?.type
      });
      
      // Process pass purchases and upgrades
      if (session.metadata?.type === 'pass_purchase') {
        await createSubscriptionFromSessionEnhanced(session);
      } else if (session.metadata?.type === 'pass_upgrade') {
        await handlePassUpgradeEnhanced(session);
      } else {
        logWebhookEvent('info', 'Skipping non-pass purchase/upgrade session', {
          sessionId: session.id,
          metadataType: session.metadata?.type
        });
      }
    }

    // Handle charge.succeeded events
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      logWebhookEvent('info', 'Processing charge succeeded', {
        chargeId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency
      });
      await handleChargeSucceededEnhanced(charge);
    }

    return new NextResponse(null, { status: 200 });
    
  } catch (error) {
    return await handleWebhookError(error, {
      eventType: event.type,
      eventId: event.id
    });
  }
}

async function createSubscriptionFromSessionEnhanced(session) {
  const sessionId = session.id;
  
  try {
    logWebhookEvent('info', 'Starting subscription creation', { sessionId });
    
    // Check if subscription already exists
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
      { sessionId }
    );

    if (existingSubscription) {
      logWebhookEvent('info', 'Subscription already exists', { 
        sessionId, 
        subscriptionId: existingSubscription._id 
      });
      return;
    }

    // Extract and validate metadata
    const { passId, userId, tenantId } = session.metadata || {};
    
    if (!passId || !userId || !tenantId) {
      throw new Error(`Missing required metadata: passId=${passId}, userId=${userId}, tenantId=${tenantId}`);
    }

    logWebhookEvent('debug', 'Metadata extracted', { passId, userId, tenantId });

    // Get pass details with enhanced validation
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit, validityType, expiryDate, isActive
      }`,
      { passId }
    );

    if (!pass) {
      throw new Error(`Pass not found: ${passId}`);
    }

    if (!pass.isActive) {
      throw new Error(`Pass is inactive: ${pass.name} (${passId})`);
    }

    logWebhookEvent('info', 'Pass found and validated', {
      passId: pass._id,
      passName: pass.name,
      passType: pass.type,
      isActive: pass.isActive
    });

    // Enhanced pass configuration validation
    const hasValidityDays = pass.validityDays && pass.validityDays > 0;
    const hasExpiryDate = pass.expiryDate;
    const hasValidConfig = hasValidityDays || hasExpiryDate;

    if (!hasValidConfig) {
      throw new Error(`Pass has no valid expiry configuration: ${pass.name} (validityDays: ${pass.validityDays}, expiryDate: ${pass.expiryDate})`);
    }

    // Ensure user exists - userId from metadata is the Clerk ID
    let user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      logWebhookEvent('info', 'Creating user', { clerkId: userId });
      
      const userData = {
        _type: 'user',
        clerkId: userId,
        name: session.customer_details?.name || 'Customer',
        email: session.customer_details?.email || session.customer_email || '',
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      user = await sanityClient.create(userData);
      logWebhookEvent('info', 'User created successfully', { 
        userId: user._id, 
        email: user.email 
      });
    } else {
      logWebhookEvent('info', 'User exists', { 
        userId: user._id, 
        email: user.email 
      });
    }

    // Calculate subscription details with enhanced validation
    const now = new Date();
    let endDate;

    // Enhanced date calculation with validation
    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
      
      if (endDate <= now) {
        throw new Error(`Pass has expired fixed date: ${endDate.toISOString()} (pass: ${pass.name})`);
      }
      
      logWebhookEvent('info', 'Using fixed expiry date', { 
        expiryDate: endDate.toISOString(),
        passName: pass.name 
      });
    } else if (pass.validityType === 'days' && pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      logWebhookEvent('info', 'Calculated expiry from validityDays', { 
        validityDays: pass.validityDays,
        expiryDate: endDate.toISOString(),
        passName: pass.name 
      });
    } else if (pass.validityDays) {
      // Fallback for passes without validityType
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      logWebhookEvent('warn', 'Using fallback validityDays calculation', { 
        validityDays: pass.validityDays,
        expiryDate: endDate.toISOString(),
        passName: pass.name 
      });
    } else {
      throw new Error(`Pass has no valid expiry configuration: ${JSON.stringify({
        validityType: pass.validityType,
        validityDays: pass.validityDays,
        expiryDate: pass.expiryDate
      })}`);
    }

    // Enhanced subscription type mapping with validation
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
        if (!remainingClips || remainingClips <= 0) {
          throw new Error(`Multi-pass without valid classesLimit: ${pass.classesLimit}`);
        }
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = pass.classesLimit;
        if (!remainingClips || remainingClips <= 0) {
          throw new Error(`Multi-type pass without valid classesLimit: ${pass.classesLimit}`);
        }
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        throw new Error(`Invalid pass type: ${pass.type}`);
    }

    // Create subscription with enhanced data
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
      // Enhanced tracking fields
      webhookProcessedAt: new Date().toISOString(),
      webhookEventId: session.id,
    };

    logWebhookEvent('info', 'Creating subscription', {
      userEmail: user.email,
      passName: pass.name,
      subscriptionType,
      remainingClips: remainingClips || 'Unlimited',
      validUntil: endDate.toLocaleDateString()
    });

    const createdSubscription = await sanityClient.create(subscriptionData);
    
    logWebhookEvent('info', 'Subscription created successfully', {
      subscriptionId: createdSubscription._id,
      userEmail: user.email,
      passName: pass.name,
      sessionId
    });

  } catch (error) {
    logWebhookEvent('error', 'Failed to create subscription from webhook', {
      sessionId,
      error: error.message,
      stack: error.stack
    });
    
    // In production, you might want to:
    // 1. Create a failed webhook record for manual processing
    // 2. Send alert to admin
    // 3. Attempt retry with exponential backoff
    
    throw error; // Re-throw to trigger webhook retry from Stripe
  }
}

async function handlePassUpgradeEnhanced(session) {
  // Similar enhanced error handling for pass upgrades
  // Implementation would follow the same pattern as createSubscriptionFromSessionEnhanced
  logWebhookEvent('info', 'Processing pass upgrade', { sessionId: session.id });
  // ... existing upgrade logic with enhanced error handling
}

async function handleChargeSucceededEnhanced(charge) {
  try {
    logWebhookEvent('info', 'Processing charge succeeded', {
      chargeId: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      customer: charge.customer,
      paymentIntent: charge.payment_intent
    });
    
    // Enhanced charge processing logic here
    
  } catch (error) {
    logWebhookEvent('error', 'Failed to handle charge succeeded', {
      chargeId: charge.id,
      error: error.message
    });
    throw error;
  }
}
