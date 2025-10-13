import { createClient } from '@sanity/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 COMPREHENSIVE INVESTIGATION: giljefamily@gmail.com');
console.log('Issue: User has a pass but no payment record found\n');

const userEmail = 'giljefamily@gmail.com';

async function investigateGiljeFamily() {
  try {
    console.log('=' .repeat(60));
    console.log('STEP 1: USER DATA INVESTIGATION');
    console.log('=' .repeat(60));

    // 1. Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt, tenant->{_id, schoolName, slug}
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found in database');
      console.log('💡 This means they may have never signed up, or the email is incorrect');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId || 'Not set'}`);
    console.log(`   Role: ${user.role || 'Not set'}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
    console.log(`   Tenant: ${user.tenant?.schoolName || 'Not associated with any school'} (${user.tenant?.slug || 'N/A'})`);

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 2: SUBSCRIPTION/PASS INVESTIGATION');
    console.log('=' .repeat(60));

    // 2. Check for existing subscriptions/passes
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, 
        passName, 
        type, 
        startDate, 
        endDate, 
        remainingClips, 
        isActive,
        stripePaymentId,
        stripeSessionId,
        purchasePrice,
        _createdAt,
        tenant->{_id, schoolName, slug}
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`\n📋 Total subscriptions found: ${subscriptions.length}`);
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions found for this user');
      console.log('💡 This explains why there might be confusion about having a pass');
    } else {
      subscriptions.forEach((sub, index) => {
        const isCurrentlyActive = sub.isActive && new Date(sub.endDate) > new Date();
        const status = isCurrentlyActive ? '🟢 ACTIVE' : '🔴 EXPIRED/INACTIVE';
        
        console.log(`\n   ${index + 1}. ${sub.passName} - ${status}`);
        console.log(`      Type: ${sub.type}`);
        console.log(`      Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
        console.log(`      Remaining: ${sub.remainingClips || 'Unlimited'}`);
        console.log(`      Price: ${sub.purchasePrice || 'Not set'} NOK`);
        console.log(`      Stripe Payment ID: ${sub.stripePaymentId || '❌ MISSING'}`);
        console.log(`      Stripe Session ID: ${sub.stripeSessionId || '❌ MISSING'}`);
        console.log(`      School: ${sub.tenant?.schoolName || 'Not set'}`);
        console.log(`      Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
        
        if (!sub.stripePaymentId && !sub.stripeSessionId) {
          console.log('      🚨 NO STRIPE PAYMENT DATA - This is the issue!');
        }
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 3: STRIPE PAYMENT INVESTIGATION');
    console.log('=' .repeat(60));

    // 3. Search for Stripe customers with this email
    console.log('\n🔍 Searching Stripe for customers with this email...');
    
    try {
      const stripeCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 10
      });

      if (stripeCustomers.data.length === 0) {
        console.log('❌ No Stripe customers found with this email');
        console.log('💡 This suggests they never completed a payment through Stripe');
      } else {
        console.log(`✅ Found ${stripeCustomers.data.length} Stripe customer(s):`);
        
        for (const customer of stripeCustomers.data) {
          console.log(`\n   Customer ID: ${customer.id}`);
          console.log(`   Name: ${customer.name || 'Not set'}`);
          console.log(`   Email: ${customer.email}`);
          console.log(`   Created: ${new Date(customer.created * 1000).toLocaleDateString()}`);
          
          // Get payment intents for this customer
          console.log('\n   🔍 Checking payment intents...');
          const paymentIntents = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 10
          });

          if (paymentIntents.data.length === 0) {
            console.log('   ❌ No payment intents found for this customer');
          } else {
            console.log(`   ✅ Found ${paymentIntents.data.length} payment intent(s):`);
            
            paymentIntents.data.forEach((pi, index) => {
              console.log(`\n      ${index + 1}. Payment Intent: ${pi.id}`);
              console.log(`         Amount: ${pi.amount / 100} ${pi.currency.toUpperCase()}`);
              console.log(`         Status: ${pi.status}`);
              console.log(`         Created: ${new Date(pi.created * 1000).toLocaleDateString()}`);
              console.log(`         Description: ${pi.description || 'None'}`);
              
              if (pi.metadata && Object.keys(pi.metadata).length > 0) {
                console.log(`         Metadata: ${JSON.stringify(pi.metadata, null, 10)}`);
              }
            });
          }

          // Get checkout sessions for this customer
          console.log('\n   🔍 Checking checkout sessions...');
          const checkoutSessions = await stripe.checkout.sessions.list({
            customer: customer.id,
            limit: 10
          });

          if (checkoutSessions.data.length === 0) {
            console.log('   ❌ No checkout sessions found for this customer');
          } else {
            console.log(`   ✅ Found ${checkoutSessions.data.length} checkout session(s):`);
            
            checkoutSessions.data.forEach((session, index) => {
              console.log(`\n      ${index + 1}. Session: ${session.id}`);
              console.log(`         Amount: ${session.amount_total / 100} ${session.currency.toUpperCase()}`);
              console.log(`         Status: ${session.status}`);
              console.log(`         Payment Status: ${session.payment_status}`);
              console.log(`         Created: ${new Date(session.created * 1000).toLocaleDateString()}`);
              console.log(`         Payment Intent: ${session.payment_intent || 'None'}`);
              
              if (session.metadata && Object.keys(session.metadata).length > 0) {
                console.log(`         Metadata: ${JSON.stringify(session.metadata, null, 10)}`);
              }
            });
          }
        }
      }
    } catch (stripeError) {
      console.log('❌ Error accessing Stripe:', stripeError.message);
      console.log('💡 This might be due to API key issues or network problems');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 4: SANITY PAYMENT RECORDS INVESTIGATION');
    console.log('=' .repeat(60));

    // 4. Search for any payment records in Sanity with this email
    const paymentRecords = await sanityClient.fetch(
      `*[_type == "payment" && customerEmail == $email] {
        _id, 
        amount, 
        status, 
        stripePaymentIntentId, 
        customerEmail, 
        createdAt, 
        metadata, 
        tenant->{_id, schoolName}
      } | order(_createdAt desc)`,
      { email: userEmail }
    );

    console.log(`\n💳 Payment records in Sanity: ${paymentRecords.length}`);
    
    if (paymentRecords.length === 0) {
      console.log('❌ No payment records found in Sanity database');
      console.log('💡 This confirms no successful payment was recorded');
    } else {
      paymentRecords.forEach((payment, index) => {
        console.log(`\n   ${index + 1}. Payment ID: ${payment._id}`);
        console.log(`      Amount: ${payment.amount} NOK`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Stripe Payment Intent: ${payment.stripePaymentIntentId}`);
        console.log(`      Customer: ${payment.customerEmail}`);
        console.log(`      Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
        console.log(`      School: ${payment.tenant?.schoolName || 'Not set'}`);
        
        if (payment.metadata) {
          console.log(`      Metadata: ${JSON.stringify(payment.metadata, null, 8)}`);
        }
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 5: WEBHOOK LOGS INVESTIGATION');
    console.log('=' .repeat(60));

    // 5. Check for webhook logs related to this user
    const webhookLogs = await sanityClient.fetch(
      `*[_type == "webhookLog" && (customerEmail == $email || metadata.customer_email == $email)] {
        _id, 
        event, 
        status, 
        createdAt, 
        error,
        stripePaymentIntentId,
        customerEmail
      } | order(_createdAt desc)[0...10]`,
      { email: userEmail }
    );

    console.log(`\n📋 Webhook logs found: ${webhookLogs.length}`);
    
    if (webhookLogs.length === 0) {
      console.log('❌ No webhook logs found for this email');
      console.log('💡 This suggests no webhook events were processed for this user');
    } else {
      webhookLogs.forEach((log, index) => {
        console.log(`\n   ${index + 1}. Event: ${log.event}`);
        console.log(`      Status: ${log.status}`);
        console.log(`      Date: ${new Date(log.createdAt).toLocaleDateString()}`);
        console.log(`      Payment Intent: ${log.stripePaymentIntentId || 'None'}`);
        console.log(`      Customer Email: ${log.customerEmail || 'None'}`);
        
        if (log.error) {
          console.log(`      Error: ${log.error}`);
        }
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 6: ANALYSIS & DIAGNOSIS');
    console.log('=' .repeat(60));

    // 6. Analyze the situation
    const hasUser = !!user;
    const hasSubscriptions = subscriptions.length > 0;
    const hasActiveSubscriptions = subscriptions.some(sub => 
      sub.isActive && new Date(sub.endDate) > new Date()
    );
    const hasStripePaymentData = subscriptions.some(sub => 
      sub.stripePaymentId || sub.stripeSessionId
    );
    const hasPaymentRecords = paymentRecords.length > 0;

    console.log('\n📊 SITUATION ANALYSIS:');
    console.log(`   User exists in database: ${hasUser ? '✅' : '❌'}`);
    console.log(`   Has subscriptions: ${hasSubscriptions ? '✅' : '❌'}`);
    console.log(`   Has active subscriptions: ${hasActiveSubscriptions ? '✅' : '❌'}`);
    console.log(`   Subscriptions have Stripe data: ${hasStripePaymentData ? '✅' : '❌'}`);
    console.log(`   Has payment records: ${hasPaymentRecords ? '✅' : '❌'}`);

    console.log('\n🔍 POSSIBLE SCENARIOS:');
    
    if (hasUser && hasSubscriptions && !hasStripePaymentData) {
      console.log('🎯 SCENARIO A: Manual subscription created without payment');
      console.log('   - Someone manually created a subscription for this user');
      console.log('   - No actual payment was processed through Stripe');
      console.log('   - This could be intentional (free pass, admin action) or an error');
    }
    
    if (hasUser && !hasSubscriptions) {
      console.log('🎯 SCENARIO B: User exists but no subscriptions');
      console.log('   - User signed up but never purchased anything');
      console.log('   - Or purchase failed and subscription was never created');
    }
    
    if (!hasUser) {
      console.log('🎯 SCENARIO C: User does not exist');
      console.log('   - Email might be incorrect');
      console.log('   - User never completed signup process');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('STEP 7: RECOMMENDED ACTIONS');
    console.log('=' .repeat(60));

    console.log('\n🔧 IMMEDIATE ACTIONS TO TAKE:');
    
    if (hasUser && hasActiveSubscriptions && !hasStripePaymentData) {
      console.log('\n1. 🚨 URGENT: Verify if this was intentional');
      console.log('   - Check with admin if this was a free pass or promotional offer');
      console.log('   - If not intentional, this user is using services without payment');
      console.log('   - Consider deactivating the subscription until payment is resolved');
    }
    
    if (hasUser && hasSubscriptions && !hasActiveSubscriptions) {
      console.log('\n2. 📅 Check subscription dates');
      console.log('   - Subscriptions may have expired naturally');
      console.log('   - User might need to purchase a new pass');
    }
    
    console.log('\n3. 🔍 Further investigation needed:');
    console.log('   - Contact the user directly to understand their situation');
    console.log('   - Check if they believe they paid for something');
    console.log('   - Verify if this was a test account or promotional access');
    console.log('   - Review admin logs for manual subscription creation');

    console.log('\n4. 🛠️ Technical actions:');
    console.log('   - If payment should exist: Search Stripe more thoroughly');
    console.log('   - If subscription should not exist: Deactivate unauthorized access');
    console.log('   - If this was intentional: Add proper documentation/metadata');

    console.log('\n💡 AVAILABLE FUNCTIONS:');
    console.log('   - deactivateSubscription(subscriptionId) - Deactivate a subscription');
    console.log('   - addPaymentToSubscription(subscriptionId, paymentId) - Link payment to subscription');
    console.log('   - createPaymentRecord(amount, email, description) - Create manual payment record');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Helper function to deactivate a subscription
async function deactivateSubscription(subscriptionId) {
  try {
    console.log(`\n🔧 Deactivating subscription: ${subscriptionId}`);
    
    const result = await sanityClient
      .patch(subscriptionId)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
        deactivationReason: 'No payment record found - manual deactivation'
      })
      .commit();

    console.log('✅ Subscription deactivated successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Error deactivating subscription:', error);
    return null;
  }
}

// Helper function to add payment data to subscription
async function addPaymentToSubscription(subscriptionId, stripePaymentId, amount) {
  try {
    console.log(`\n🔧 Adding payment data to subscription: ${subscriptionId}`);
    
    const result = await sanityClient
      .patch(subscriptionId)
      .set({
        stripePaymentId: stripePaymentId,
        purchasePrice: amount,
        updatedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ Payment data added to subscription successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Error adding payment data:', error);
    return null;
  }
}

// Export functions for manual use
global.deactivateSubscription = deactivateSubscription;
global.addPaymentToSubscription = addPaymentToSubscription;

// Run the investigation
investigateGiljeFamily();
