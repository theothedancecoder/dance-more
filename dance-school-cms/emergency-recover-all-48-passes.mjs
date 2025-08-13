import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

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

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function emergencyRecoverAll48Passes() {
  console.log('🚨 EMERGENCY RECOVERY: All 48 DanceCity Passes');
  console.log('===============================================\n');

  try {
    // Get ALL successful checkout sessions from Stripe (last 90 days to be safe)
    console.log('📋 Fetching ALL recent Stripe checkout sessions...');
    
    let allSessions = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created: {
          gte: Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000), // 90 days ago
        },
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const sessions = await stripe.checkout.sessions.list(params);
      allSessions = allSessions.concat(sessions.data);
      
      hasMore = sessions.has_more;
      if (hasMore && sessions.data.length > 0) {
        startingAfter = sessions.data[sessions.data.length - 1].id;
      }
    }

    console.log(`📋 Found ${allSessions.length} total Stripe checkout sessions\n`);

    // Filter for DanceCity purchases
    const danceCitySessions = allSessions.filter(session => {
      if (session.payment_status !== 'paid') return false;
      
      const metadata = session.metadata || {};
      const isDanceCity = metadata.tenantId === DANCECITY_TENANT_ID || 
                         metadata.type === 'pass_purchase' ||
                         (session.customer_details?.email && 
                          session.customer_details.email.includes('dancecity'));
      
      return isDanceCity;
    });

    console.log(`🎯 Found ${danceCitySessions.length} DanceCity purchases\n`);

    let recoveredCount = 0;
    let alreadyExistsCount = 0;
    let failedCount = 0;

    for (let i = 0; i < danceCitySessions.length; i++) {
      const session = danceCitySessions[i];
      
      console.log(`💳 [${i + 1}/${danceCitySessions.length}] Processing: ${session.id}`);
      console.log(`   Customer: ${session.customer_details?.name || 'Unknown'} (${session.customer_details?.email})`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency.toUpperCase()}`);
      console.log(`   Date: ${new Date(session.created * 1000).toLocaleDateString()}`);
      console.log(`   Metadata:`, session.metadata);

      // Check if subscription already exists
      const existingSubscription = await sanityClient.fetch(
        `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
        { sessionId: session.id }
      );

      if (existingSubscription) {
        console.log(`   ✅ Already exists: ${existingSubscription._id}`);
        alreadyExistsCount++;
      } else {
        console.log(`   🔧 Creating missing subscription...`);
        
        const success = await createSubscriptionFromSession(session);
        if (success) {
          recoveredCount++;
          console.log(`   🎉 SUCCESS!`);
        } else {
          failedCount++;
          console.log(`   ❌ FAILED`);
        }
      }
      console.log('');
    }

    console.log('🚨 EMERGENCY RECOVERY COMPLETE');
    console.log('==============================');
    console.log(`Total DanceCity Sessions Found: ${danceCitySessions.length}`);
    console.log(`Subscriptions Recovered: ${recoveredCount}`);
    console.log(`Already Existed: ${alreadyExistsCount}`);
    console.log(`Failed to Recover: ${failedCount}`);
    console.log(`Expected Total: 48 passes`);

    if (recoveredCount + alreadyExistsCount >= 48) {
      console.log(`\n🎉 SUCCESS! All 48 passes should now be recovered!`);
    } else {
      console.log(`\n⚠️  Still missing ${48 - (recoveredCount + alreadyExistsCount)} passes`);
      console.log(`   This might be due to older purchases or different metadata`);
    }

    // Run final verification
    console.log('\n🔍 Running final verification...');
    await verifyAllSubscriptions();

  } catch (error) {
    console.error('❌ Emergency recovery error:', error);
  }
}

async function createSubscriptionFromSession(session) {
  try {
    // Extract metadata - try different approaches
    let { passId, userId, tenantId, type } = session.metadata || {};
    
    // If no metadata, try to infer from session data
    if (!passId || !userId || !tenantId) {
      console.log('     ⚠️  Missing metadata, attempting to infer...');
      
      // Try to find user by email
      if (session.customer_details?.email) {
        const user = await sanityClient.fetch(
          `*[_type == "user" && email == $email && tenant._ref == $tenantId][0]`,
          { email: session.customer_details.email, tenantId: DANCECITY_TENANT_ID }
        );
        
        if (user) {
          userId = user.clerkId;
          tenantId = DANCECITY_TENANT_ID;
          console.log('     ✅ Found user by email:', user.name);
        }
      }
      
      // Try to infer pass from amount
      if (!passId && session.amount_total) {
        const amount = session.amount_total / 100;
        const pass = await sanityClient.fetch(
          `*[_type == "pass" && tenant._ref == $tenantId && price == $amount][0]`,
          { tenantId: DANCECITY_TENANT_ID, amount }
        );
        
        if (pass) {
          passId = pass._id;
          console.log('     ✅ Inferred pass from amount:', pass.name);
        }
      }
    }

    if (!passId || !userId || !tenantId) {
      console.log('     ❌ Still missing required data:', { passId, userId, tenantId });
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
      console.log('     ❌ Pass not found:', passId);
      return false;
    }

    // Ensure user exists
    let user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log('     👤 Creating user...');
      user = await writeClient.create({
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
    const purchaseDate = new Date(session.created * 1000);
    const endDate = new Date(purchaseDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

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
        subscriptionType = 'clipcard';
        remainingClips = pass.classesLimit || 1;
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
      startDate: purchaseDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
      stripePaymentId: session.payment_intent,
      stripeSessionId: session.id,
      isActive: true,
    };

    const createdSubscription = await writeClient.create(subscriptionData);
    console.log(`     ✅ Created: ${pass.name} for ${user.name}`);

    return true;
  } catch (error) {
    console.log('     ❌ Error:', error.message);
    return false;
  }
}

async function verifyAllSubscriptions() {
  const totalSubscriptions = await sanityClient.fetch(
    `count(*[_type == "subscription" && tenant._ref == $tenantId])`,
    { tenantId: DANCECITY_TENANT_ID }
  );

  const activeSubscriptions = await sanityClient.fetch(
    `count(*[_type == "subscription" && tenant._ref == $tenantId && isActive == true && dateTime(endDate) > dateTime(now())])`,
    { tenantId: DANCECITY_TENANT_ID }
  );

  console.log(`📊 Final Count:`);
  console.log(`   Total Subscriptions: ${totalSubscriptions}`);
  console.log(`   Currently Active: ${activeSubscriptions}`);
  
  if (totalSubscriptions >= 48) {
    console.log(`   🎉 SUCCESS! All 48+ passes recovered!`);
  } else {
    console.log(`   ⚠️  Still missing ${48 - totalSubscriptions} subscriptions`);
  }
}

emergencyRecoverAll48Passes().catch(console.error);
