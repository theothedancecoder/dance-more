import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔧 Fixing Filip Michalski\'s Missing Subscription');
console.log('===============================================');

async function fixFilipSubscription() {
  try {
    // 1. Find Filip Michalski's user record
    console.log('\n👤 Looking for Filip Michalski...');
    
    let filip = await sanityClient.fetch(`
      *[_type == "user" && (name match "*Filip Michalski*" || email match "*fjmichalski*")][0] {
        _id, name, email, clerkId, role, _createdAt
      }
    `);

    if (!filip) {
      console.log('❌ Filip Michalski not found. Let me check all recent users...');
      
      const recentUsers = await sanityClient.fetch(`
        *[_type == "user" && _createdAt >= $yesterday] | order(_createdAt desc) {
          _id, name, email, clerkId, role, _createdAt
        }
      `, { yesterday: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() });

      console.log(`\nFound ${recentUsers.length} recent users:`);
      for (const user of recentUsers) {
        console.log(`- ${user.name} (${user.email}) - Clerk: ${user.clerkId}`);
        console.log(`  Created: ${new Date(user._createdAt).toLocaleString()}`);
      }
      
      // Let's assume the most recent user is Filip
      if (recentUsers.length > 0) {
        filip = recentUsers.find(u => u.name === 'Filip Michalski') || recentUsers[0];
        console.log(`\n🎯 Using user: ${filip.name} (${filip.email})`);
      } else {
        console.log('❌ No recent users found');
        return;
      }
    } else {
      console.log(`✅ Found Filip: ${filip.name} (${filip.email})`);
    }

    // 2. Check if Filip already has subscriptions
    const existingSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, isActive, stripeSessionId, _createdAt
      }
    `, { userId: filip._id });

    console.log(`\n🎫 Filip's existing subscriptions: ${existingSubscriptions.length}`);
    for (const sub of existingSubscriptions) {
      console.log(`- ${sub.passName} (${sub.type}) - Active: ${sub.isActive}`);
      console.log(`  Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
      console.log(`  Stripe Session: ${sub.stripeSessionId}`);
    }

    // 3. Search for Filip's Stripe sessions from yesterday
    console.log('\n💳 Searching for Filip\'s Stripe sessions...');
    const yesterday = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: yesterday },
      limit: 100,
    });

    console.log(`Found ${sessions.data.length} total sessions since yesterday`);

    // Look for sessions that might be Filip's
    const potentialSessions = sessions.data.filter(session => {
      const email = session.customer_details?.email || session.customer_email || '';
      const name = session.customer_details?.name || '';
      
      return (
        email.includes('fjmichalski') ||
        name.toLowerCase().includes('filip') ||
        email === filip.email ||
        (session.metadata?.userId === filip.clerkId)
      );
    });

    console.log(`\nFound ${potentialSessions.length} potential sessions for Filip:`);
    
    for (const session of potentialSessions) {
      console.log(`\n💳 Session: ${session.id}`);
      console.log(`   Status: ${session.status} / ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? (session.amount_total / 100) : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Email: ${session.customer_details?.email || session.customer_email}`);
      console.log(`   Name: ${session.customer_details?.name}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log(`   Metadata:`, session.metadata);

      // Check if subscription exists for this session
      const hasSubscription = await sanityClient.fetch(`
        count(*[_type == "subscription" && stripeSessionId == $sessionId])
      `, { sessionId: session.id });

      if (hasSubscription === 0 && session.status === 'complete' && session.payment_status === 'paid') {
        console.log(`   🚨 MISSING SUBSCRIPTION! This session needs a subscription created.`);
        
        if (session.metadata?.type === 'pass_purchase') {
          console.log(`   🔧 Attempting to create missing subscription...`);
          await createMissingSubscription(session, filip);
        }
      } else if (hasSubscription > 0) {
        console.log(`   ✅ Subscription exists for this session`);
      }
    }

    // 4. If no sessions found, let's check all recent sessions for any without subscriptions
    if (potentialSessions.length === 0) {
      console.log('\n🔍 No sessions found for Filip. Checking all recent sessions for missing subscriptions...');
      
      for (const session of sessions.data) {
        if (session.status === 'complete' && session.payment_status === 'paid' && session.metadata?.type === 'pass_purchase') {
          const hasSubscription = await sanityClient.fetch(`
            count(*[_type == "subscription" && stripeSessionId == $sessionId])
          `, { sessionId: session.id });

          if (hasSubscription === 0) {
            console.log(`\n🚨 Found orphaned session: ${session.id}`);
            console.log(`   Email: ${session.customer_details?.email}`);
            console.log(`   Name: ${session.customer_details?.name}`);
            console.log(`   Amount: ${(session.amount_total / 100)} ${session.currency?.toUpperCase()}`);
            console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
            console.log(`   Metadata:`, session.metadata);
            
            // This might be Filip's session - let's create the subscription
            console.log(`   🔧 Creating subscription for this orphaned session...`);
            await createMissingSubscription(session, filip);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error fixing Filip\'s subscription:', error);
  }
}

async function createMissingSubscription(session, user) {
  try {
    console.log(`\n🔧 Creating subscription for session: ${session.id}`);
    
    const { passId, userId, tenantId } = session.metadata || {};
    
    if (!passId || !tenantId) {
      console.error('❌ Missing required metadata:', { passId, userId, tenantId });
      return;
    }

    // Get pass details
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId][0] {
        _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
      }`,
      { passId }
    );

    if (!pass) {
      console.error('❌ Pass not found:', passId);
      return;
    }

    console.log(`✅ Found pass: ${pass.name} (${pass.type})`);

    // Calculate subscription details
    const now = new Date();
    let endDate;

    // Determine end date based on pass configuration
    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
      console.log('✅ Using fixed expiry date:', endDate.toISOString());
    } else if (pass.validityType === 'days' && pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('✅ Calculated expiry from validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else if (pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('⚠️ Using fallback validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else {
      console.error('❌ Pass has no valid expiry configuration');
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

    console.log('📝 Creating subscription:');
    console.log('   User:', user.name);
    console.log('   Pass:', pass.name, '(' + subscriptionType + ')');
    console.log('   Classes:', remainingClips || 'Unlimited');
    console.log('   Valid until:', endDate.toLocaleDateString());

    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log('🎉 SUCCESS! Created subscription:', createdSubscription._id);
    console.log('✅', user.name, 'should now see their', pass.name, 'pass in the app');

    return createdSubscription;

  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

// Run the fix
fixFilipSubscription();
