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

async function testApiResponseFormat() {
  console.log('🧪 Testing API Response Format - Simulating exact API logic...\n');

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

    // Fetch charges
    const charges = await stripe.charges.list({
      limit: 3, // Just test first 3
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

    // Get user data from Sanity for name matching
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
      
      users.forEach((user) => {
        userMap.set(user.clerkId, user);
      });
    }

    console.log('🔍 Testing Payment Data Structure:\n');

    // Test the first charge
    const testCharge = charges.data[0];
    if (testCharge) {
      const sessionData = sessionDataMap.get(testCharge.payment_intent) || { metadata: {}, lineItems: [] };
      const sessionMetadata = sessionData.metadata;
      const lineItems = sessionData.lineItems;
      
      // Get student name from Sanity user data using userId from session metadata
      let studentName = 'Unknown Student';
      if (sessionMetadata.userId) {
        const user = userMap.get(sessionMetadata.userId);
        if (user) {
          studentName = user.name || 
                       (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                       'Unknown Student';
        }
      }
      
      // Fallback to billing details if no user found
      if (studentName === 'Unknown Student') {
        studentName = testCharge.billing_details?.name || 
                     testCharge.metadata?.customerName || 
                     sessionMetadata?.customerName ||
                     'Unknown Student';
      }
      
      const customerEmail = testCharge.billing_details?.email || 
                          testCharge.metadata?.customerEmail || 
                          sessionMetadata?.customerEmail ||
                          testCharge.receipt_email || 
                          'No email provided';

      // Extract pass name from line items
      let passName = 'Unknown Pass';
      if (lineItems.length > 0) {
        passName = lineItems[0].description || 'Unknown Pass';
      } else {
        passName = testCharge.metadata?.passName || 
                  sessionMetadata?.passName ||
                  testCharge.description || 
                  'Unknown Pass';
      }

      let status = 'pending';
      if (testCharge.status === 'succeeded') {
        status = 'completed';
      } else if (testCharge.status === 'pending') {
        status = 'pending';
      } else if (testCharge.status === 'failed') {
        status = 'failed';
      }

      // Create the payment object in the new format
      const payment = {
        _id: testCharge.id,
        amount: testCharge.amount / 100,
        currency: testCharge.currency.toUpperCase(),
        status,
        paymentStatus: status,
        customerName: studentName,
        customerEmail,
        email: customerEmail,
        passName,
        createdAt: new Date(testCharge.created * 1000).toISOString(),
        paymentMethod: testCharge.payment_method_details?.type || 'card',
        paymentId: testCharge.id,
        type: 'subscription',
        // Add user object that PaymentsTable expects
        user: {
          _id: sessionMetadata.userId || testCharge.id,
          name: studentName,
          email: customerEmail
        },
        // Add pass object that PaymentsTable expects
        pass: {
          _id: sessionMetadata.passId || testCharge.id,
          name: passName,
          type: sessionMetadata.passType || 'pass'
        }
      };

      console.log('📋 Sample Payment Object:');
      console.log(JSON.stringify(payment, null, 2));
      
      console.log('\n🎯 Key Fields for PaymentsTable:');
      console.log(`   user.name: "${payment.user.name}"`);
      console.log(`   user.email: "${payment.user.email}"`);
      console.log(`   pass.name: "${payment.pass.name}"`);
      console.log(`   type: "${payment.type}"`);
      console.log(`   paymentStatus: "${payment.paymentStatus}"`);
      console.log(`   amount: ${payment.amount} ${payment.currency}`);
      
      console.log('\n✅ This should now display correctly in PaymentsTable!');
    }

  } catch (error) {
    console.error('❌ Error testing API response format:', error);
  }
}

// Run the test
testApiResponseFormat();
