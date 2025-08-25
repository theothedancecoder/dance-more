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

console.log('🔍 Webhook Monitoring & Recovery System');
console.log('======================================');

async function monitorAndRecover() {
  try {
    // 1. Check for recent successful payments without subscriptions
    console.log('\n💳 Checking for orphaned payments (last 7 days)...');
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    });

    console.log(`Found ${sessions.data.length} recent Stripe sessions`);

    const orphanedSessions = [];
    
    for (const session of sessions.data) {
      if (session.status === 'complete' && session.payment_status === 'paid') {
        // Check if subscription exists
        const hasSubscription = await sanityClient.fetch(`
          count(*[_type == "subscription" && stripeSessionId == $sessionId])
        `, { sessionId: session.id });

        // Check if booking exists
        const hasBooking = await sanityClient.fetch(`
          count(*[_type == "booking" && paymentId == $paymentId])
        `, { paymentId: session.payment_intent });

        if (hasSubscription === 0 && hasBooking === 0) {
          orphanedSessions.push(session);
        }
      }
    }

    console.log(`\n🚨 Found ${orphanedSessions.length} orphaned sessions (payments without subscriptions/bookings):`);

    for (const session of orphanedSessions) {
      console.log(`\n💳 Orphaned Session: ${session.id}`);
      console.log(`   Email: ${session.customer_details?.email}`);
      console.log(`   Name: ${session.customer_details?.name}`);
      console.log(`   Amount: ${(session.amount_total / 100)} ${session.currency?.toUpperCase()}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log(`   Metadata:`, session.metadata);

      // Attempt to recover this session
      if (session.metadata?.type === 'pass_purchase') {
        console.log(`   🔧 Attempting to recover pass purchase...`);
        await recoverPassPurchase(session);
      } else if (session.metadata?.classId) {
        console.log(`   🔧 Attempting to recover class booking...`);
        await recoverClassBooking(session);
      } else {
        console.log(`   ⚠️ Unknown purchase type - manual intervention needed`);
      }
    }

    // 2. Check webhook endpoint health
    console.log('\n🔗 Checking webhook endpoint health...');
    
    try {
      const webhooks = await stripe.webhookEndpoints.list();
      console.log(`Found ${webhooks.data.length} webhook endpoints:`);
      
      for (const webhook of webhooks.data) {
        console.log(`\n🔗 Webhook: ${webhook.id}`);
        console.log(`   URL: ${webhook.url}`);
        console.log(`   Status: ${webhook.status}`);
        console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
        
        if (webhook.status !== 'enabled') {
          console.log(`   ⚠️ Webhook is not enabled!`);
        }
        
        if (!webhook.enabled_events.includes('checkout.session.completed')) {
          console.log(`   ⚠️ Missing checkout.session.completed event!`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking webhooks:', error.message);
    }

    // 3. Generate monitoring report
    console.log('\n📊 MONITORING REPORT:');
    console.log('====================');
    console.log(`Total recent sessions: ${sessions.data.length}`);
    console.log(`Orphaned sessions: ${orphanedSessions.length}`);
    console.log(`Success rate: ${((sessions.data.length - orphanedSessions.length) / sessions.data.length * 100).toFixed(1)}%`);

    if (orphanedSessions.length > 0) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('- Webhook failures detected');
      console.log('- Check webhook endpoint configuration');
      console.log('- Verify webhook secret is correct');
      console.log('- Monitor server logs for webhook errors');
    } else {
      console.log('\n✅ All payments processed successfully');
    }

  } catch (error) {
    console.error('❌ Error in monitoring:', error);
  }
}

async function recoverPassPurchase(session) {
  try {
    const { passId, userId, userEmail, tenantId } = session.metadata || {};
    
    if (!passId || !userId) {
      console.log('   ❌ Missing required metadata for recovery');
      return;
    }

    // Find or create user
    let user = await sanityClient.fetch(`
      *[_type == "user" && clerkId == $userId][0] {
        _id, name, email
      }
    `, { userId });

    if (!user) {
      user = await sanityClient.create({
        _type: 'user',
        clerkId: userId,
        email: userEmail || session.customer_email,
        name: session.customer_details?.name || 'Unknown User',
        role: 'student',
      });
      console.log('   ✅ Created user:', user._id);
    }

    // Get pass details
    const pass = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId][0] {
        _id, name, type, validityDays, validityType, expiryDate, classesLimit
      }
    `, { passId });

    if (!pass) {
      console.log('   ❌ Pass not found:', passId);
      return;
    }

    // Calculate expiry date
    const now = new Date(session.created * 1000);
    let endDate;

    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
    } else if (pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
    } else {
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Create subscription
    const subscription = await sanityClient.create({
      _type: 'subscription',
      passName: pass.name,
      passId: pass._id,
      type: pass.type,
      user: { _type: 'reference', _ref: user._id },
      tenant: tenantId ? { _type: 'reference', _ref: tenantId } : null,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      classesUsed: 0,
      classesLimit: pass.classesLimit || null,
      stripeSessionId: session.id,
      paymentId: session.payment_intent,
      paymentStatus: 'completed',
      amount: session.amount_total,
      currency: session.currency,
      recoveredAt: new Date().toISOString(),
    });

    console.log('   ✅ Recovered subscription:', subscription._id);

  } catch (error) {
    console.error('   ❌ Recovery failed:', error.message);
  }
}

async function recoverClassBooking(session) {
  try {
    const { classId, userId, userEmail } = session.metadata || {};
    
    if (!classId || !userId) {
      console.log('   ❌ Missing required metadata for recovery');
      return;
    }

    // Find or create user
    let user = await sanityClient.fetch(`
      *[_type == "user" && clerkId == $userId][0] {
        _id, name, email
      }
    `, { userId });

    if (!user) {
      user = await sanityClient.create({
        _type: 'user',
        clerkId: userId,
        email: userEmail || session.customer_email,
        name: session.customer_details?.name || 'Unknown User',
        role: 'student',
      });
      console.log('   ✅ Created user:', user._id);
    }

    // Create booking
    const booking = await sanityClient.create({
      _type: 'booking',
      class: { _type: 'reference', _ref: classId },
      user: { _type: 'reference', _ref: user._id },
      status: 'confirmed',
      paymentId: session.payment_intent,
      paymentStatus: 'completed',
      amount: session.amount_total,
      currency: session.currency,
      email: userEmail || session.customer_email,
      recoveredAt: new Date().toISOString(),
    });

    console.log('   ✅ Recovered booking:', booking._id);

  } catch (error) {
    console.error('   ❌ Recovery failed:', error.message);
  }
}

// Run monitoring
monitorAndRecover();
