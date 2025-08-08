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

async function debugStripeDetailedData() {
  console.log('🔍 Debugging Stripe Detailed Data...\n');

  try {
    // Get tenant with Stripe Connect account
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && defined(stripeConnect.accountId)][0] {
        _id,
        schoolName,
        slug,
        stripeConnect {
          accountId,
          accountStatus
        }
      }
    `);

    if (!tenant) {
      console.log('❌ No tenant found with Stripe Connect account');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName}`);
    console.log(`   Stripe Account ID: ${tenant.stripeConnect.accountId}\n`);

    const stripeAccountId = tenant.stripeConnect.accountId;

    // 1. Fetch checkout sessions with expanded data
    console.log('1️⃣ Fetching checkout sessions with line items...');
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 5,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`✅ Found ${checkoutSessions.data.length} checkout sessions\n`);

    if (checkoutSessions.data.length > 0) {
      const session = checkoutSessions.data[0];
      console.log('📋 Sample Checkout Session:');
      console.log(`   ID: ${session.id}`);
      console.log(`   Customer Email: ${session.customer_details?.email || 'Not provided'}`);
      console.log(`   Customer Name: ${session.customer_details?.name || 'Not provided'}`);
      console.log(`   Payment Intent: ${session.payment_intent}`);
      console.log(`   Amount Total: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      
      if (session.metadata && Object.keys(session.metadata).length > 0) {
        console.log('   Session Metadata:');
        Object.entries(session.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }

      if (session.line_items && session.line_items.data.length > 0) {
        console.log('   Line Items:');
        session.line_items.data.forEach((item, index) => {
          console.log(`     Item ${index + 1}:`);
          console.log(`       Description: ${item.description || 'No description'}`);
          console.log(`       Quantity: ${item.quantity}`);
          console.log(`       Amount: ${item.amount_total / 100} ${session.currency?.toUpperCase()}`);
          
          if (item.price && item.price.product) {
            console.log(`       Product ID: ${item.price.product.id}`);
            console.log(`       Product Name: ${item.price.product.name || 'No name'}`);
            console.log(`       Product Description: ${item.price.product.description || 'No description'}`);
            
            if (item.price.product.metadata && Object.keys(item.price.product.metadata).length > 0) {
              console.log('       Product Metadata:');
              Object.entries(item.price.product.metadata).forEach(([key, value]) => {
                console.log(`         ${key}: ${value}`);
              });
            }
          }
        });
      }
      console.log('');
    }

    // 2. Fetch charges with expanded payment intent
    console.log('2️⃣ Fetching charges with expanded payment intents...');
    const charges = await stripe.charges.list({
      limit: 3,
      expand: ['data.payment_intent']
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`✅ Found ${charges.data.length} charges\n`);

    if (charges.data.length > 0) {
      const charge = charges.data[0];
      console.log('📋 Sample Charge with Payment Intent:');
      console.log(`   Charge ID: ${charge.id}`);
      console.log(`   Amount: ${charge.amount / 100} ${charge.currency.toUpperCase()}`);
      console.log(`   Customer Name: ${charge.billing_details?.name || 'Not provided'}`);
      console.log(`   Customer Email: ${charge.billing_details?.email || charge.receipt_email || 'Not provided'}`);
      console.log(`   Description: ${charge.description || 'No description'}`);
      
      if (charge.metadata && Object.keys(charge.metadata).length > 0) {
        console.log('   Charge Metadata:');
        Object.entries(charge.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }

      if (charge.payment_intent && typeof charge.payment_intent === 'object') {
        console.log(`   Payment Intent ID: ${charge.payment_intent.id}`);
        console.log(`   Payment Intent Description: ${charge.payment_intent.description || 'No description'}`);
        
        if (charge.payment_intent.metadata && Object.keys(charge.payment_intent.metadata).length > 0) {
          console.log('   Payment Intent Metadata:');
          Object.entries(charge.payment_intent.metadata).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
          });
        }
      }
      console.log('');
    }

    // 3. Check what user data we have in Sanity for correlation
    console.log('3️⃣ Checking Sanity user data for correlation...');
    const users = await sanityClient.fetch(`
      *[_type == "user" && defined(email)] | order(_createdAt desc) [0...5] {
        _id,
        name,
        firstName,
        lastName,
        email,
        clerkId,
        _createdAt
      }
    `);

    console.log(`✅ Found ${users.length} users in Sanity\n`);
    if (users.length > 0) {
      console.log('📋 Sample Users:');
      users.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     Name: ${user.name || 'No name'}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Clerk ID: ${user.clerkId || 'No Clerk ID'}`);
        console.log(`     Created: ${user._createdAt}`);
        console.log('');
      });
    }

    console.log('🎯 Key Findings Summary:');
    console.log('   • Customer email is available in both Stripe and Sanity');
    console.log('   • Product names should be available in checkout session line items');
    console.log('   • Student names should be matched via email between Stripe and Sanity');
    console.log('   • Metadata might contain additional useful information');

  } catch (error) {
    console.error('❌ Error debugging Stripe data:', error);
  }
}

// Run the debug
debugStripeDetailedData();
