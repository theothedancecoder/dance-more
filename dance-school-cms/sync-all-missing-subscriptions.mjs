import { config } from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

// Load environment variables
config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
});

async function syncAllMissingSubscriptions() {
  console.log('🔄 Syncing all missing subscriptions...\n');

  try {
    // Get recent checkout sessions from Stripe
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      status: 'complete'
    });

    console.log(`📋 Found ${sessions.data.length} completed checkout sessions\n`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const session of sessions.data) {
      const { passId, userId, tenantId, type } = session.metadata || {};
      
      if (type !== 'pass_purchase' || !passId || !userId || !tenantId) {
        console.log(`⏭️  Skipping session ${session.id} - not a pass purchase or missing metadata`);
        skippedCount++;
        continue;
      }

      console.log(`\n🔍 Processing session: ${session.id}`);
      console.log(`   Customer: ${session.customer_email || 'No email'}`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      console.log(`   Pass ID: ${passId}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Tenant ID: ${tenantId}`);

      // Check if subscription already exists
      const existingSubscription = await sanityClient.fetch(
        `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
        { sessionId: session.id }
      );

      if (existingSubscription) {
        console.log(`   ✅ Subscription already exists: ${existingSubscription._id}`);
        skippedCount++;
        continue;
      }

      // Get pass details
      const pass = await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId][0]`,
        { passId }
      );

      if (!pass) {
        console.log(`   ❌ Pass not found: ${passId}`);
        errorCount++;
        continue;
      }

      console.log(`   📋 Pass: ${pass.name} (${pass.type})`);

      // Ensure user exists
      let user = await sanityClient.fetch(
        `*[_type == "user" && _id == $userId][0]`,
        { userId }
      );

      if (!user) {
        console.log(`   👤 Creating user: ${userId}`);
        try {
          user = await sanityClient.create({
            _type: 'user',
            _id: userId,
            name: session.customer_details?.name || 'Customer',
            email: session.customer_email || '',
            role: 'student',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log(`   ✅ User created: ${user._id}`);
        } catch (userError) {
          console.log(`   ⚠️  User creation failed, continuing: ${userError.message}`);
        }
      } else {
        console.log(`   ✅ User exists: ${user.name || user._id}`);
      }

      // Calculate subscription details
      const now = new Date(session.created * 1000); // Use session creation time
      const endDate = new Date(now.getTime() + (pass.validityDays || 30) * 24 * 60 * 60 * 1000);

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
          subscriptionType = 'single';
          remainingClips = 1;
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
        startDate: now.toISOString(),
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

      try {
        const createdSubscription = await sanityClient.create(subscriptionData);
        console.log(`   🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
        console.log(`   📅 Valid until: ${endDate.toLocaleDateString()}`);
        console.log(`   🎫 Type: ${subscriptionType} (${remainingClips || 'unlimited'} classes)`);
        createdCount++;
      } catch (error) {
        console.log(`   ❌ Failed to create subscription: ${error.message}`);
        
        if (error.message.includes('permission') || error.message.includes('Insufficient')) {
          console.log(`   🔒 PERMISSIONS ERROR: Update SANITY_API_TOKEN to have Editor permissions`);
        }
        errorCount++;
      }
    }

    console.log('\n📊 SYNC SUMMARY:');
    console.log(`   ✅ Created: ${createdCount} subscriptions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} (already exist or invalid)`);
    console.log(`   ❌ Errors: ${errorCount} (permissions or other issues)`);
    
    if (createdCount > 0) {
      console.log('\n🎉 SUCCESS! Missing subscriptions have been created.');
      console.log('   Customers should now see their passes in "Your Active Passes"');
    }
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some subscriptions could not be created due to permissions.');
      console.log('   Update your SANITY_API_TOKEN to have Editor permissions.');
    }

  } catch (error) {
    console.error('❌ Error syncing subscriptions:', error);
  }
}

syncAllMissingSubscriptions().catch(console.error);
