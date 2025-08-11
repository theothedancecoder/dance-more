import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🚨 EMERGENCY: Fixing missing subscriptions for Dancecity tenant...\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

try {
  // Get ALL recent completed checkout sessions from main account (last 30 days)
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    status: 'complete',
    created: {
      gte: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // Last 30 days
    },
  });

  console.log(`📋 Found ${sessions.data.length} completed checkout sessions in last 30 days\n`);
  
  // Filter for Dancecity tenant sessions
  const dancecitySessions = sessions.data.filter(session => 
    session.metadata && 
    session.metadata.tenantId === DANCECITY_TENANT_ID
  );
  
  console.log(`🎯 Found ${dancecitySessions.length} sessions for Dancecity tenant\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const session of dancecitySessions) {
    console.log(`\n🔍 Processing session: ${session.id}`);
    console.log(`   Customer: ${session.customer_details?.email || 'No email'}`);
    console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
    console.log(`   Date: ${new Date(session.created * 1000).toISOString()}`);
    console.log(`   Metadata:`, session.metadata);

    // Skip if no metadata or not a pass purchase
    if (!session.metadata || !session.metadata.type || session.metadata.type !== 'pass_purchase') {
      console.log(`   ⏭️  Skipping - not a pass purchase`);
      skippedCount++;
      continue;
    }

    const { passId, userId, tenantId } = session.metadata;
    
    if (!passId || !userId || !tenantId) {
      console.log(`   ⏭️  Skipping - missing required metadata`);
      skippedCount++;
      continue;
    }

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

    console.log(`   ❌ MISSING SUBSCRIPTION - Creating now...`);

    // Get pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0]`,
      { passId }
    );

    if (!pass) {
      console.log(`   ❌ Pass not found: ${passId}`);
      skippedCount++;
      continue;
    }

    console.log(`   ✅ Found pass: ${pass.name} (${pass.type})`);

    // Get user details
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log(`   ❌ User not found: ${userId}`);
      skippedCount++;
      continue;
    }

    console.log(`   ✅ User exists: ${user.name} (${user.clerkId})`);

    // Calculate expiry date
    let expiryDate;
    if (pass.validityType === 'days') {
      const purchaseDate = new Date(session.created * 1000);
      expiryDate = new Date(purchaseDate.getTime() + (pass.validityDays * 24 * 60 * 60 * 1000));
    } else if (pass.validityType === 'date') {
      expiryDate = new Date(pass.expiryDate);
    } else {
      // Default to 30 days
      const purchaseDate = new Date(session.created * 1000);
      expiryDate = new Date(purchaseDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // Create subscription
    const subscriptionDoc = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id
      },
      pass: {
        _type: 'reference',
        _ref: pass._id
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId
      },
      status: 'active',
      purchaseDate: new Date(session.created * 1000).toISOString(),
      expiryDate: expiryDate.toISOString(),
      classesUsed: 0,
      classesLimit: pass.classesLimit || (pass.type === 'single' ? 1 : 10),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      amount: session.amount_total,
      currency: session.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await writeClient.create(subscriptionDoc);
      console.log(`   🎉 SUCCESS! Created subscription: ${result._id}`);
      console.log(`   📝 Creating subscription for ${user.name}:`);
      console.log(`      Pass: ${pass.name} (${pass.type})`);
      console.log(`      Classes: ${subscriptionDoc.classesLimit}`);
      console.log(`      Valid until: ${expiryDate.toLocaleDateString()}`);
      fixedCount++;
    } catch (error) {
      console.log(`   ❌ Error creating subscription:`, error.message);
      skippedCount++;
    }
  }

  console.log(`\n📊 DANCECITY FIX SUMMARY:`);
  console.log(`   ✅ Created: ${fixedCount} subscriptions`);
  console.log(`   ⏭️  Skipped: ${skippedCount} (already exist or invalid)`);
  
  if (fixedCount > 0) {
    console.log(`\n🎉 SUCCESS! Fixed ${fixedCount} missing subscriptions for Dancecity students!`);
    console.log(`✅ Students can now see their passes in "Your Active Passes"`);
  } else {
    console.log(`\n✅ No missing subscriptions found for Dancecity tenant`);
  }

} catch (error) {
  console.error('❌ Error:', error);
}
