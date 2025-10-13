import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables from the parent directory
dotenv.config({ path: '../.env.local' });

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

console.log('🔍 Investigating Stripe Payment: pi_3S5q2PL8HTHT1SQN09SFY5Li');
console.log('Customer: marek.lukacovic.mail@gmail.com\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const userEmail = 'marek.lukacovic.mail@gmail.com';
const stripePaymentIntentId = 'pi_3S5q2PL8HTHT1SQN09SFY5Li';

async function investigateStripePayment() {
  try {
    // 1. Find user
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User: ${user.name} (${user.email})`);

    // 2. Search for payment records with this Stripe Payment Intent ID
    const paymentRecords = await sanityClient.fetch(
      `*[_type == "payment" && stripePaymentIntentId == $paymentId] {
        _id, amount, status, stripePaymentIntentId, customerEmail, createdAt, metadata, tenant
      }`,
      { paymentId: stripePaymentIntentId }
    );

    console.log(`\n💳 Payment records found: ${paymentRecords.length}`);
    
    if (paymentRecords.length > 0) {
      paymentRecords.forEach((payment, index) => {
        console.log(`   ${index + 1}. Amount: ${payment.amount} NOK`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Customer: ${payment.customerEmail}`);
        console.log(`      Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
        console.log(`      Tenant: ${payment.tenant?._ref || 'No tenant'}`);
        console.log(`      Metadata: ${JSON.stringify(payment.metadata || {}, null, 2)}`);
      });
    }

    // 3. Search for any subscriptions with this Stripe Payment Intent ID
    const subscriptionsWithStripeId = await sanityClient.fetch(
      `*[_type == "subscription" && stripePaymentId == $paymentId] {
        _id, passName, type, startDate, endDate, isActive, user, tenant
      }`,
      { paymentId: stripePaymentIntentId }
    );

    console.log(`\n📋 Subscriptions with this Stripe ID: ${subscriptionsWithStripeId.length}`);
    
    if (subscriptionsWithStripeId.length > 0) {
      subscriptionsWithStripeId.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} (${sub.type})`);
        console.log(`      Active: ${sub.isActive}`);
        console.log(`      User: ${sub.user?._ref}`);
        console.log(`      Tenant: ${sub.tenant?._ref}`);
        console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
      });
    }

    // 4. Search for Stripe sessions with this payment intent
    const stripeSessions = await sanityClient.fetch(
      `*[_type == "subscription" && stripeSessionId match "*${stripePaymentIntentId}*"] {
        _id, passName, type, startDate, endDate, isActive, stripeSessionId, user, tenant
      }`
    );

    console.log(`\n🔗 Subscriptions with related Stripe session: ${stripeSessions.length}`);
    
    if (stripeSessions.length > 0) {
      stripeSessions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} (${sub.type})`);
        console.log(`      Session ID: ${sub.stripeSessionId}`);
        console.log(`      Active: ${sub.isActive}`);
        console.log(`      User: ${sub.user?._ref}`);
        console.log(`      Tenant: ${sub.tenant?._ref}`);
      });
    }

    // 5. Check all recent subscriptions for this user
    const userSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, isActive, stripeSessionId, stripePaymentId, purchasePrice, _createdAt
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`\n📋 All user subscriptions: ${userSubscriptions.length}`);
    
    userSubscriptions.forEach((sub, index) => {
      const isActive = sub.isActive && new Date(sub.endDate) > new Date();
      console.log(`   ${index + 1}. ${sub.passName} - ${isActive ? '🟢 ACTIVE' : '🔴 EXPIRED'}`);
      console.log(`      Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
      console.log(`      Price: ${sub.purchasePrice} NOK`);
      console.log(`      Stripe Payment: ${sub.stripePaymentId || 'None'}`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`      Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
      console.log('');
    });

    // 6. Check webhook logs or recent activity
    console.log('🔍 Checking for recent webhook activity...');
    
    // Look for any webhook-related documents
    const webhookLogs = await sanityClient.fetch(
      `*[_type == "webhookLog" && stripePaymentIntentId == $paymentId] {
        _id, event, status, createdAt, error
      } | order(_createdAt desc)[0...5]`,
      { paymentId: stripePaymentIntentId }
    );

    if (webhookLogs.length > 0) {
      console.log(`   ✅ Found ${webhookLogs.length} webhook log(s):`);
      webhookLogs.forEach((log, index) => {
        console.log(`      ${index + 1}. Event: ${log.event} - Status: ${log.status}`);
        console.log(`         Date: ${new Date(log.createdAt).toLocaleDateString()}`);
        if (log.error) {
          console.log(`         Error: ${log.error}`);
        }
      });
    } else {
      console.log('   ❌ No webhook logs found for this payment');
    }

    // 7. Summary and recommendations
    console.log('\n📊 INVESTIGATION SUMMARY');
    console.log('========================');
    
    const hasPaymentRecord = paymentRecords.length > 0;
    const hasMatchingSubscription = subscriptionsWithStripeId.length > 0;
    const hasActiveSubscription = userSubscriptions.some(sub => 
      sub.isActive && new Date(sub.endDate) > new Date()
    );

    if (!hasPaymentRecord) {
      console.log('🚨 No payment record found for this Stripe Payment Intent');
      console.log('   This suggests the webhook may not have processed correctly');
    }

    if (!hasMatchingSubscription) {
      console.log('🚨 No subscription found with this Stripe Payment Intent ID');
      console.log('   This suggests the subscription creation failed');
    }

    if (!hasActiveSubscription) {
      console.log('🚨 User has no active subscriptions');
      console.log('   Customer cannot see any active passes');
    }

    // 8. Provide solutions
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    
    if (hasPaymentRecord && !hasMatchingSubscription) {
      console.log('1. Create missing subscription based on payment record');
    } else if (!hasPaymentRecord) {
      console.log('1. Investigate Stripe directly for payment details');
      console.log('2. Manually create subscription if payment was successful');
    }
    
    if (!hasActiveSubscription) {
      console.log('3. Extend or create active subscription for customer');
    }

    console.log('\n💡 Available functions:');
    console.log('- createSubscriptionFromPayment() - Create subscription from payment data');
    console.log('- extendUserSubscription(subscriptionId, newEndDate) - Extend existing subscription');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Function to create subscription from payment data
async function createSubscriptionFromPayment() {
  try {
    console.log('\n🔧 Creating subscription from payment data...');
    
    // This would need to be implemented based on the payment details found
    console.log('This function needs to be implemented based on payment investigation results');
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

// Function to extend existing subscription
async function extendUserSubscription(subscriptionId, newEndDate) {
  try {
    console.log(`\n🔧 Extending subscription ${subscriptionId} to ${newEndDate}...`);
    
    const result = await writeClient
      .patch(subscriptionId)
      .set({
        endDate: new Date(newEndDate).toISOString(),
        isActive: true,
        updatedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ Subscription extended successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error extending subscription:', error);
    return false;
  }
}

// Export functions
global.createSubscriptionFromPayment = createSubscriptionFromPayment;
global.extendUserSubscription = extendUserSubscription;

investigateStripePayment();
