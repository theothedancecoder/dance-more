#!/usr/bin/env node

/**
 * Recover All Missing Passes
 * Automatically creates subscriptions for all students who paid but don't have them
 */

import { createClient } from '@sanity/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔧 Recovering All Missing Passes\n');
console.log('═══════════════════════════════════════\n');

async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`  ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

async function createSubscriptionFromSession(session) {
  try {
    console.log(`\n📝 Processing session: ${session.id}`);
    
    // Check if subscription already exists
    const existingSubscription = await retryOperation(async () => {
      return await sanityClient.fetch(
        `*[_type == "subscription" && (stripeSessionId == $sessionId || stripePaymentId == $paymentId)][0]`,
        { sessionId: session.id, paymentId: session.payment_intent }
      );
    });

    if (existingSubscription) {
      console.log(`  ℹ️  Subscription already exists: ${existingSubscription._id}`);
      return { success: true, subscriptionId: existingSubscription._id, duplicate: true };
    }

    // Extract metadata
    const { passId, userId, tenantId } = session.metadata || {};
    
    if (!passId || !userId || !tenantId) {
      console.error(`  ❌ Missing metadata: passId=${passId}, userId=${userId}, tenantId=${tenantId}`);
      return { success: false, error: 'Missing metadata' };
    }

    // Get pass details
    const pass = await retryOperation(async () => {
      return await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId][0] {
          _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
        }`,
        { passId }
      );
    });

    if (!pass) {
      console.error(`  ❌ Pass not found: ${passId}`);
      return { success: false, error: 'Pass not found' };
    }

    console.log(`  ✅ Found pass: ${pass.name}`);

    // Ensure user exists
    let user = await retryOperation(async () => {
      return await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId][0]`,
        { userId }
      );
    });

    if (!user) {
      console.log(`  👤 Creating user with Clerk ID: ${userId}`);
      user = await retryOperation(async () => {
        return await sanityClient.create({
          _type: 'user',
          clerkId: userId,
          name: session.customer_details?.name || 'Customer',
          email: session.customer_details?.email || session.customer_email || '',
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      console.log(`  ✅ User created: ${user._id}`);
    } else {
      console.log(`  ✅ User exists: ${user.name} (${user._id})`);
    }

    // Calculate subscription details
    const now = new Date();
    let endDate;

    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
    } else if (pass.validityType === 'days' && pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
    } else if (pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
    } else {
      console.error(`  ❌ Pass has no valid expiry configuration`);
      return { success: false, error: 'Invalid pass configuration' };
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
        console.error(`  ❌ Invalid pass type: ${pass.type}`);
        return { success: false, error: 'Invalid pass type' };
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
      createdViaRecovery: true,
      recoveredAt: new Date().toISOString(),
    };

    console.log(`  📝 Creating subscription:`);
    console.log(`     User: ${user.name}`);
    console.log(`     Pass: ${pass.name} (${subscriptionType})`);
    console.log(`     Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`     Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await retryOperation(async () => {
      return await sanityClient.create(subscriptionData);
    });
    
    console.log(`  🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);

    return { 
      success: true, 
      subscriptionId: createdSubscription._id, 
      duplicate: false,
      userName: user.name,
      userEmail: user.email,
      passName: pass.name
    };

  } catch (error) {
    console.error(`  ❌ Error creating subscription:`, error.message);
    return { success: false, error: error.message };
  }
}

async function recoverAllMissingPasses() {
  try {
    // Get all successful checkout sessions from the last 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    console.log('📊 Fetching Stripe checkout sessions from last 7 days...\n');
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    });

    // Filter for completed pass purchases
    const completedPurchases = sessions.data.filter(session => 
      session.payment_status === 'paid' && 
      session.metadata?.type === 'pass_purchase'
    );

    console.log(`✅ Found ${completedPurchases.length} completed pass purchases\n`);

    if (completedPurchases.length === 0) {
      console.log('ℹ️  No pass purchases found in the last 7 days.');
      return;
    }

    console.log('🔄 Processing purchases...\n');
    console.log('═══════════════════════════════════════');

    const results = {
      created: [],
      duplicates: [],
      errors: [],
    };

    for (const session of completedPurchases) {
      const result = await createSubscriptionFromSession(session);
      
      if (result.success) {
        if (result.duplicate) {
          results.duplicates.push({
            email: session.customer_details?.email || session.customer_email,
            subscriptionId: result.subscriptionId,
          });
        } else {
          results.created.push({
            userName: result.userName,
            userEmail: result.userEmail,
            passName: result.passName,
            subscriptionId: result.subscriptionId,
          });
        }
      } else {
        results.errors.push({
          email: session.customer_details?.email || session.customer_email,
          sessionId: session.id,
          error: result.error,
        });
      }
    }

    // Display results
    console.log('\n═══════════════════════════════════════');
    console.log('📊 RECOVERY RESULTS');
    console.log('═══════════════════════════════════════\n');

    if (results.created.length > 0) {
      console.log(`✅ Created ${results.created.length} new subscriptions:\n`);
      results.created.forEach((item, index) => {
        console.log(`${index + 1}. ${item.userName} (${item.userEmail})`);
        console.log(`   Pass: ${item.passName}`);
        console.log(`   Subscription ID: ${item.subscriptionId}`);
        console.log('');
      });
    }

    if (results.duplicates.length > 0) {
      console.log(`ℹ️  Skipped ${results.duplicates.length} existing subscriptions:\n`);
      results.duplicates.forEach((item, index) => {
        console.log(`${index + 1}. ${item.email}`);
        console.log(`   Already has subscription: ${item.subscriptionId}`);
        console.log('');
      });
    }

    if (results.errors.length > 0) {
      console.log(`❌ Failed to create ${results.errors.length} subscriptions:\n`);
      results.errors.forEach((item, index) => {
        console.log(`${index + 1}. ${item.email}`);
        console.log(`   Session: ${item.sessionId}`);
        console.log(`   Error: ${item.error}`);
        console.log('');
      });
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📈 SUMMARY');
    console.log('═══════════════════════════════════════\n');
    console.log(`Total purchases processed: ${completedPurchases.length}`);
    console.log(`New subscriptions created: ${results.created.length}`);
    console.log(`Already existed: ${results.duplicates.length}`);
    console.log(`Errors: ${results.errors.length}\n`);

    if (results.created.length > 0) {
      console.log('🎉 SUCCESS! All missing passes have been recovered.\n');
      console.log('📧 Next steps:');
      console.log('1. Notify affected students that their passes are now active');
      console.log('2. Ask them to refresh their browser');
      console.log('3. They should see their passes at /subscriptions\n');
    } else if (results.duplicates.length > 0 && results.errors.length === 0) {
      console.log('✅ All purchases already have subscriptions!\n');
      console.log('If students still report missing passes:');
      console.log('1. Ask them to click "Missing Pass?" button');
      console.log('2. Ask them to refresh their browser');
      console.log('3. Check if they\'re signed in with the correct account\n');
    }

    if (results.errors.length > 0) {
      console.log('⚠️  Some subscriptions could not be created.');
      console.log('Please review the errors above and fix manually.\n');
    }

  } catch (error) {
    console.error('❌ Error during recovery:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

recoverAllMissingPasses();
