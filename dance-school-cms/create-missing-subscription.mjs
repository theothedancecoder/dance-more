import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createMissingSubscription() {
  console.log('🎫 Creating Missing Subscription for Recent Purchase...\n');

  try {
    // Get tenant
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && defined(stripeConnect.accountId)][0] {
        _id,
        schoolName,
        stripeConnect { accountId }
      }
    `);

    const stripeAccountId = tenant.stripeConnect.accountId;
    console.log(`✅ Found tenant: ${tenant.schoolName}`);

    // Find the most recent completed checkout session without a subscription
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`🔍 Checking ${checkoutSessions.data.length} recent sessions...`);

    let sessionToFix = null;
    for (const session of checkoutSessions.data) {
      if (session.metadata?.type === 'pass_purchase' && session.status === 'complete') {
        // Check if subscription already exists
        const existingSubscription = await sanityClient.fetch(
          `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
          { sessionId: session.id }
        );

        if (!existingSubscription) {
          sessionToFix = session;
          console.log(`❌ Found session without subscription: ${session.id}`);
          console.log(`   Customer: ${session.customer_details?.email || session.customer_email}`);
          console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
          console.log(`   Date: ${new Date(session.created * 1000).toISOString()}`);
          break;
        }
      }
    }

    if (!sessionToFix) {
      console.log(`✅ No missing subscriptions found in recent sessions`);
      console.log(`\nIf a customer is missing their pass, they may need to:`);
      console.log(`1. Wait a few minutes for webhook processing`);
      console.log(`2. Refresh their browser`);
      console.log(`3. Check if webhook URL is correctly set to: https://www.dancemore.app/api/stripe/webhook`);
      return;
    }

    // Create the missing subscription
    const { passId, userId, tenantId } = sessionToFix.metadata;

    // Get pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { passId }
    );

    if (!pass) {
      console.error(`❌ Pass not found: ${passId}`);
      return;
    }

    console.log(`✅ Found pass: ${pass.name} (${pass.type})`);

    // Ensure user exists
    let user = await sanityClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log(`👤 Creating user: ${userId}`);
      user = await sanityClient.create({
        _type: 'user',
        _id: userId,
        name: sessionToFix.customer_details?.name || 'Customer',
        email: sessionToFix.customer_details?.email || sessionToFix.customer_email || '',
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ User created: ${user._id}`);
    } else {
      console.log(`✅ User exists: ${user.name} (${user._id})`);
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
        console.error(`❌ Invalid pass type: ${pass.type}`);
        return;
    }

    // Create subscription
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: userId,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: subscriptionType,
      startDate: new Date(sessionToFix.created * 1000).toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: sessionToFix.amount_total ? sessionToFix.amount_total / 100 : pass.price,
      stripePaymentId: sessionToFix.payment_intent,
      stripeSessionId: sessionToFix.id,
      isActive: true,
    };

    console.log(`📝 Creating subscription for ${user.name}:`);
    console.log(`   Pass: ${pass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log(`\n🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.name} can now see their ${pass.name} pass in "Your Active Passes"`);

    console.log(`\n🔧 NEXT STEPS:`);
    console.log(`1. Update webhook URL in Stripe Dashboard to: https://www.dancemore.app/api/stripe/webhook`);
    console.log(`2. Test with a new purchase to ensure automatic subscription creation works`);

  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

// Run the script
createMissingSubscription();
