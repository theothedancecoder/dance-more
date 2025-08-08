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

async function testImprovedAdminPayments() {
  console.log('🧪 Testing Improved Admin Payments API...\n');

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

    // Test the improved logic manually
    console.log('1️⃣ Testing improved payment data extraction...');

    // Fetch charges
    const charges = await stripe.charges.list({
      limit: 5,
    }, {
      stripeAccount: stripeAccountId,
    });

    // Fetch checkout sessions with line items
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    // Create session data map
    const sessionDataMap = new Map();
    checkoutSessions.data.forEach(session => {
      if (session.payment_intent) {
        sessionDataMap.set(session.payment_intent, {
          metadata: session.metadata || {},
          lineItems: session.line_items?.data || []
        });
      }
    });

    // Get user data from Sanity
    const userIds = Array.from(new Set(
      checkoutSessions.data
        .map(session => session.metadata?.userId)
        .filter(Boolean)
    ));

    let userMap = new Map();
    if (userIds.length > 0) {
      const users = await sanityClient.fetch(
        `*[_type == "user" && clerkId in $userIds] {
          clerkId,
          name,
          firstName,
          lastName,
          email
        }`,
        { userIds }
      );
      
      users.forEach(user => {
        userMap.set(user.clerkId, user);
      });
    }

    console.log(`✅ Found ${charges.data.length} charges`);
    console.log(`✅ Found ${checkoutSessions.data.length} checkout sessions`);
    console.log(`✅ Found ${userMap.size} users for matching\n`);

    // Test the transformation logic
    if (charges.data.length > 0) {
      const charge = charges.data[0];
      const sessionData = sessionDataMap.get(charge.payment_intent) || { metadata: {}, lineItems: [] };
      const sessionMetadata = sessionData.metadata;
      const lineItems = sessionData.lineItems;

      console.log('📋 Sample Payment Transformation:');
      console.log(`   Charge ID: ${charge.id}`);
      console.log(`   Payment Intent: ${charge.payment_intent}`);
      console.log(`   Billing Name: ${charge.billing_details?.name || 'Not provided'}`);
      console.log(`   Billing Email: ${charge.billing_details?.email || 'Not provided'}`);
      
      // Test student name extraction
      let studentName = 'Unknown Student';
      if (sessionMetadata.userId) {
        console.log(`   Session User ID: ${sessionMetadata.userId}`);
        const user = userMap.get(sessionMetadata.userId);
        if (user) {
          studentName = user.name || 
                       (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                       'Unknown Student';
          console.log(`   ✅ Found Student: ${studentName} (${user.email})`);
        } else {
          console.log(`   ❌ No user found for ID: ${sessionMetadata.userId}`);
        }
      } else {
        console.log(`   ❌ No userId in session metadata`);
      }

      // Test pass name extraction
      let passName = 'Unknown Pass';
      if (lineItems.length > 0) {
        passName = lineItems[0].description || 'Unknown Pass';
        console.log(`   ✅ Found Pass Name from Line Item: ${passName}`);
      } else {
        console.log(`   ❌ No line items found`);
        passName = charge.metadata?.passName || 
                  sessionMetadata?.passName ||
                  charge.description || 
                  'Unknown Pass';
        console.log(`   Fallback Pass Name: ${passName}`);
      }

      console.log('\n🎯 Final Result:');
      console.log(`   Student Name: ${studentName}`);
      console.log(`   Pass Name: ${passName}`);
      console.log(`   Amount: ${charge.amount / 100} ${charge.currency.toUpperCase()}`);
      console.log(`   Email: ${charge.billing_details?.email || charge.receipt_email || 'Not provided'}`);

      // Compare with old vs new
      console.log('\n📊 Comparison:');
      console.log(`   OLD - Customer: ${charge.billing_details?.name || 'Unknown User'}`);
      console.log(`   NEW - Student:  ${studentName}`);
      console.log(`   OLD - Pass:     ${charge.description || 'Unknown Pass'}`);
      console.log(`   NEW - Pass:     ${passName}`);
    }

    console.log('\n🎉 Improved Admin Payments test completed!');

  } catch (error) {
    console.error('❌ Error testing improved admin payments:', error);
  }
}

// Run the test
testImprovedAdminPayments();
