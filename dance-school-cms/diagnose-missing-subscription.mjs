import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function diagnoseMissingSubscription() {
  console.log('🔍 Diagnosing Missing Subscription Issue...\n');

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
    console.log(`✅ Found tenant: ${tenant.schoolName} (${tenant._id})`);

    // Get recent checkout sessions
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`\n📋 Found ${checkoutSessions.data.length} recent checkout sessions:`);

    // Analyze each session
    for (let i = 0; i < Math.min(5, checkoutSessions.data.length); i++) {
      const session = checkoutSessions.data[i];
      console.log(`\n🎫 Session ${i + 1}: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Customer Email: ${session.customer_details?.email || session.customer_email || 'N/A'}`);
      console.log(`   Created: ${new Date(session.created * 1000).toISOString()}`);
      
      if (session.metadata) {
        console.log(`   Metadata:`, JSON.stringify(session.metadata, null, 4));
        
        // Check if this should have created a subscription
        if (session.metadata.type === 'pass_purchase' && session.metadata.passId) {
          console.log(`   🎯 This is a pass purchase - should create subscription`);
          
          // Check if subscription exists in Sanity
          const subscription = await sanityClient.fetch(
            `*[_type == "subscription" && stripeSessionId == $sessionId][0] {
              _id,
              type,
              passName,
              isActive,
              user->{_id, name, email}
            }`,
            { sessionId: session.id }
          );
          
          if (subscription) {
            console.log(`   ✅ Subscription exists in Sanity:`, subscription);
          } else {
            console.log(`   ❌ NO SUBSCRIPTION FOUND IN SANITY for session ${session.id}`);
            console.log(`   🚨 This is the missing subscription issue!`);
            
            // Check if user exists
            if (session.metadata.userId) {
              const user = await sanityClient.fetch(
                `*[_type == "user" && _id == $userId][0]`,
                { userId: session.metadata.userId }
              );
              console.log(`   User exists: ${user ? `${user.name} (${user._id})` : 'NO'}`);
            }
            
            // Check if pass exists
            if (session.metadata.passId) {
              const pass = await sanityClient.fetch(
                `*[_type == "pass" && _id == $passId][0] {
                  _id, name, type, price, validityDays, classesLimit
                }`,
                { passId: session.metadata.passId }
              );
              console.log(`   Pass exists: ${pass ? `${pass.name} (${pass.type})` : 'NO'}`);
            }
          }
        }
      } else {
        console.log(`   ⚠️ No metadata found`);
      }
    }

    // Check webhook configuration
    console.log(`\n🔗 Checking Webhook Configuration:`);
    console.log(`   STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET'}`);
    
    // List webhooks for the Connect account
    try {
      const webhooks = await stripe.webhookEndpoints.list({}, {
        stripeAccount: stripeAccountId,
      });
      
      console.log(`   Connect Account Webhooks: ${webhooks.data.length}`);
      webhooks.data.forEach((webhook, index) => {
        console.log(`     ${index + 1}. ${webhook.url} (${webhook.status})`);
        console.log(`        Events: ${webhook.enabled_events.join(', ')}`);
      });
    } catch (error) {
      console.log(`   ❌ Could not fetch Connect account webhooks:`, error.message);
    }

    // Check main account webhooks
    try {
      const mainWebhooks = await stripe.webhookEndpoints.list();
      console.log(`   Main Account Webhooks: ${mainWebhooks.data.length}`);
      mainWebhooks.data.forEach((webhook, index) => {
        console.log(`     ${index + 1}. ${webhook.url} (${webhook.status})`);
        console.log(`        Events: ${webhook.enabled_events.join(', ')}`);
      });
    } catch (error) {
      console.log(`   ❌ Could not fetch main account webhooks:`, error.message);
    }

    // Check recent subscriptions in Sanity
    console.log(`\n📊 Recent Subscriptions in Sanity:`);
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription"] | order(_createdAt desc)[0...5] {
        _id,
        type,
        passName,
        isActive,
        stripeSessionId,
        _createdAt,
        user->{_id, name, email}
      }
    `);
    
    if (recentSubscriptions.length > 0) {
      recentSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} (${sub.type}) - ${sub.isActive ? 'Active' : 'Inactive'}`);
        console.log(`      User: ${sub.user?.name || 'Unknown'} (${sub.user?._id})`);
        console.log(`      Session: ${sub.stripeSessionId || 'N/A'}`);
        console.log(`      Created: ${sub._createdAt}`);
      });
    } else {
      console.log(`   ❌ No subscriptions found in Sanity`);
    }

    // Recommendations
    console.log(`\n💡 DIAGNOSIS RECOMMENDATIONS:`);
    console.log(`1. Check if webhooks are properly configured and receiving events`);
    console.log(`2. Verify STRIPE_WEBHOOK_SECRET is correct`);
    console.log(`3. Check Sanity permissions for subscription creation`);
    console.log(`4. Look for recent webhook delivery failures in Stripe Dashboard`);
    console.log(`5. Consider running sync-subscriptions API to catch missed subscriptions`);

  } catch (error) {
    console.error('❌ Error diagnosing missing subscription:', error);
  }
}

// Run the diagnosis
diagnoseMissingSubscription();
