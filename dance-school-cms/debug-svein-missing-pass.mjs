import { createClient } from '@sanity/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function debugSveinMissingPass() {
  const email = 'svein.h.aaberge@gmail.com';
  
  console.log('🔍 Investigating missing pass for:', email);
  console.log('=' .repeat(60));

  try {
    // 1. Check if user exists in Sanity
    console.log('\n1. Checking user in Sanity...');
    const users = await sanityClient.fetch(`
      *[_type == "user" && email == $email] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        _createdAt,
        _updatedAt
      }
    `, { email });

    if (users.length === 0) {
      console.log('❌ User not found in Sanity database');
      
      // Check Stripe for payments
      console.log('\n2. Checking Stripe for payments...');
      const customers = await stripe.customers.list({
        email: email,
        limit: 10
      });
      
      if (customers.data.length > 0) {
        console.log('✅ Found customer in Stripe:', customers.data[0].id);
        
        // Get payment intents for this customer
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customers.data[0].id,
          limit: 10
        });
        
        console.log(`📊 Found ${paymentIntents.data.length} payment intents`);
        paymentIntents.data.forEach((pi, index) => {
          console.log(`   ${index + 1}. ${pi.id} - ${pi.amount/100} ${pi.currency.toUpperCase()} - ${pi.status} - ${new Date(pi.created * 1000).toISOString()}`);
          if (pi.metadata) {
            console.log(`      Metadata:`, pi.metadata);
          }
        });
      } else {
        console.log('❌ No customer found in Stripe');
      }
      
      return;
    }

    const user = users[0];
    console.log('✅ User found in Sanity:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Created: ${user._createdAt}`);

    // 2. Check for subscriptions
    console.log('\n2. Checking subscriptions...');
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId] | order(_createdAt desc) {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { clerkId: user.clerkId });

    console.log(`📊 Found ${subscriptions.length} subscriptions`);
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions found for this user');
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`\n   Subscription ${index + 1}:`);
        console.log(`   - ID: ${sub._id}`);
        console.log(`   - Pass: ${sub.passName}`);
        console.log(`   - Type: ${sub.type}`);
        console.log(`   - Active: ${sub.isActive}`);
        console.log(`   - Expired: ${sub.isExpired}`);
        console.log(`   - Classes: ${sub.classesUsed}/${sub.classesLimit || '∞'}`);
        console.log(`   - Valid until: ${sub.endDate} (${sub.remainingDays} days)`);
        console.log(`   - Payment: ${sub.paymentStatus} - ${sub.amount/100} ${sub.currency?.toUpperCase()}`);
        console.log(`   - Stripe Session: ${sub.stripeSessionId}`);
        console.log(`   - Created: ${sub._createdAt}`);
      });
    }

    // 3. Check Stripe for this customer
    console.log('\n3. Checking Stripe customer data...');
    const customers = await stripe.customers.list({
      email: email,
      limit: 10
    });

    if (customers.data.length === 0) {
      console.log('❌ No customer found in Stripe');
    } else {
      const customer = customers.data[0];
      console.log('✅ Found customer in Stripe:');
      console.log(`   ID: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Name: ${customer.name}`);
      console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);

      // Get payment intents
      console.log('\n4. Checking payment intents...');
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 10
      });

      console.log(`📊 Found ${paymentIntents.data.length} payment intents`);
      
      for (const [index, pi] of paymentIntents.data.entries()) {
        console.log(`\n   Payment Intent ${index + 1}:`);
        console.log(`   - ID: ${pi.id}`);
        console.log(`   - Amount: ${pi.amount/100} ${pi.currency.toUpperCase()}`);
        console.log(`   - Status: ${pi.status}`);
        console.log(`   - Created: ${new Date(pi.created * 1000).toISOString()}`);
        console.log(`   - Description: ${pi.description || 'N/A'}`);
        
        if (pi.metadata && Object.keys(pi.metadata).length > 0) {
          console.log(`   - Metadata:`);
          Object.entries(pi.metadata).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
          });
        }

        // Check if there's a checkout session
        if (pi.metadata?.checkout_session_id) {
          try {
            const session = await stripe.checkout.sessions.retrieve(pi.metadata.checkout_session_id);
            console.log(`   - Checkout Session: ${session.id}`);
            console.log(`   - Session Status: ${session.status}`);
            console.log(`   - Payment Status: ${session.payment_status}`);
          } catch (error) {
            console.log(`   - Checkout Session: ${pi.metadata.checkout_session_id} (could not retrieve)`);
          }
        }
      }

      // Get checkout sessions directly
      console.log('\n5. Checking checkout sessions...');
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 10
      });

      console.log(`📊 Found ${sessions.data.length} checkout sessions`);
      
      for (const [index, session] of sessions.data.entries()) {
        console.log(`\n   Session ${index + 1}:`);
        console.log(`   - ID: ${session.id}`);
        console.log(`   - Status: ${session.status}`);
        console.log(`   - Payment Status: ${session.payment_status}`);
        console.log(`   - Amount Total: ${session.amount_total/100} ${session.currency?.toUpperCase()}`);
        console.log(`   - Created: ${new Date(session.created * 1000).toISOString()}`);
        
        if (session.metadata && Object.keys(session.metadata).length > 0) {
          console.log(`   - Metadata:`);
          Object.entries(session.metadata).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
          });
        }
      }
    }

    // 6. Check for recent webhook events
    console.log('\n6. Checking recent webhook events...');
    const events = await stripe.events.list({
      limit: 50,
      types: ['checkout.session.completed', 'payment_intent.succeeded']
    });

    const relevantEvents = events.data.filter(event => {
      if (event.type === 'checkout.session.completed') {
        return event.data.object.customer_email === email || 
               event.data.object.customer_details?.email === email;
      }
      if (event.type === 'payment_intent.succeeded') {
        return event.data.object.receipt_email === email;
      }
      return false;
    });

    console.log(`📊 Found ${relevantEvents.length} relevant webhook events`);
    
    relevantEvents.forEach((event, index) => {
      console.log(`\n   Event ${index + 1}:`);
      console.log(`   - ID: ${event.id}`);
      console.log(`   - Type: ${event.type}`);
      console.log(`   - Created: ${new Date(event.created * 1000).toISOString()}`);
      console.log(`   - Object ID: ${event.data.object.id}`);
      
      if (event.data.object.metadata) {
        console.log(`   - Metadata:`);
        Object.entries(event.data.object.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

debugSveinMissingPass();
