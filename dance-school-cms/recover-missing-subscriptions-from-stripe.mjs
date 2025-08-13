import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

console.log('🚨 EMERGENCY: RECOVERING MISSING SUBSCRIPTIONS FROM STRIPE');
console.log('=========================================================');

async function recoverMissingSubscriptions() {
  try {
    console.log('🔍 Step 1: Fetching successful Stripe payments from last 30 days...');
    
    // Get all successful checkout sessions from the last 30 days
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      status: 'complete',
      limit: 100, // Adjust if you have more than 100 payments
    });

    console.log(`✅ Found ${sessions.data.length} successful Stripe payments`);
    
    // Filter for pass purchases only
    const passPurchases = sessions.data.filter(session => 
      session.metadata?.type === 'pass_purchase'
    );
    
    console.log(`🎫 Found ${passPurchases.length} pass purchases`);
    
    if (passPurchases.length === 0) {
      console.log('❌ No pass purchases found. Check if metadata.type is set correctly.');
      return;
    }

    console.log('🔍 Step 2: Checking which payments are missing subscriptions...');
    
    const missingSubscriptions = [];
    
    for (const session of passPurchases) {
      // Check if subscription already exists for this session
      const existingSubscription = await sanityClient.fetch(
        `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
        { sessionId: session.id }
      );
      
      if (!existingSubscription) {
        missingSubscriptions.push(session);
        console.log(`❌ Missing subscription for session: ${session.id} (${session.customer_details?.email})`);
      } else {
        console.log(`✅ Subscription exists for session: ${session.id}`);
      }
    }
    
    console.log(`\n📊 RECOVERY SUMMARY:`);
    console.log(`   Total pass purchases: ${passPurchases.length}`);
    console.log(`   Missing subscriptions: ${missingSubscriptions.length}`);
    console.log(`   Already have subscriptions: ${passPurchases.length - missingSubscriptions.length}`);
    
    if (missingSubscriptions.length === 0) {
      console.log('🎉 All payments already have subscriptions! No recovery needed.');
      return;
    }
    
    console.log('\n🔧 Step 3: Creating missing subscriptions...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const session of missingSubscriptions) {
      try {
        console.log(`\n🔄 Processing session: ${session.id}`);
        console.log(`   Customer: ${session.customer_details?.email || 'Unknown'}`);
        console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
        
        const success = await createSubscriptionFromSession(session);
        if (success) {
          successCount++;
          console.log(`   ✅ SUCCESS: Subscription created`);
        } else {
          errorCount++;
          console.log(`   ❌ FAILED: Could not create subscription`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        errorCount++;
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }
    
    console.log('\n🎉 RECOVERY COMPLETE!');
    console.log('====================');
    console.log(`✅ Successfully recovered: ${successCount} subscriptions`);
    console.log(`❌ Failed to recover: ${errorCount} subscriptions`);
    console.log(`📊 Success rate: ${Math.round((successCount / missingSubscriptions.length) * 100)}%`);
    
    if (successCount > 0) {
      console.log('\n💡 NEXT STEPS:');
      console.log('1. Check that customers can now see their passes');
      console.log('2. Send email to recovered customers explaining the fix');
      console.log('3. Monitor for any remaining customer complaints');
    }
    
    if (errorCount > 0) {
      console.log('\n⚠️ MANUAL INTERVENTION NEEDED:');
      console.log(`${errorCount} subscriptions could not be automatically recovered.`);
      console.log('These may need manual creation or have data issues.');
    }
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR during recovery:', error);
  }
}

async function createSubscriptionFromSession(session) {
  try {
    // Extract metadata
    const { passId, userId, tenantId } = session.metadata || {};
    
    if (!passId || !userId || !tenantId) {
      console.log(`   ❌ Missing metadata: passId=${passId}, userId=${userId}, tenantId=${tenantId}`);
      return false;
    }

    // Get pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { passId }
    );

    if (!pass) {
      console.log(`   ❌ Pass not found: ${passId}`);
      return false;
    }

    // Ensure user exists - userId from metadata is the Clerk ID
    let user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log(`   👤 Creating user with Clerk ID: ${userId}`);
      user = await sanityClient.create({
        _type: 'user',
        clerkId: userId,
        name: session.customer_details?.name || 'Customer',
        email: session.customer_details?.email || session.customer_email || '',
        role: 'student',
        isActive: true,
        tenant: {
          _type: 'reference',
          _ref: tenantId,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
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
        console.log(`   ❌ Invalid pass type: ${pass.type}`);
        return false;
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log(`   📝 Created subscription: ${createdSubscription._id}`);
    console.log(`   🎫 Pass: ${pass.name} (${subscriptionType})`);
    console.log(`   👤 User: ${user.name || user.email}`);

    return true;
  } catch (error) {
    console.log(`   ❌ Error creating subscription: ${error.message}`);
    return false;
  }
}

// Run the recovery
recoverMissingSubscriptions();
