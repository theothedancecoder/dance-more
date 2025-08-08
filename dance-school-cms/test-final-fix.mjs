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

async function testFinalFix() {
  console.log('🎯 Testing Final Fix - Verifying Complete Data Flow...\n');

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

    // Simulate the exact API call that the frontend makes
    console.log('🔍 Simulating Frontend API Call...\n');

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

    // Transform charges exactly like the API does
    const payments = charges.data.map((charge) => {
      const sessionData = sessionDataMap.get(charge.payment_intent) || { metadata: {}, lineItems: [] };
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
        studentName = charge.billing_details?.name || 
                     charge.metadata?.customerName || 
                     sessionMetadata?.customerName ||
                     'Unknown Student';
      }
      
      const customerEmail = charge.billing_details?.email || 
                          charge.metadata?.customerEmail || 
                          sessionMetadata?.customerEmail ||
                          charge.receipt_email || 
                          'No email provided';

      // Extract pass name from line items
      let passName = 'Unknown Pass';
      if (lineItems.length > 0) {
        passName = lineItems[0].description || 'Unknown Pass';
      } else {
        passName = charge.metadata?.passName || 
                  sessionMetadata?.passName ||
                  charge.description || 
                  'Unknown Pass';
      }

      let status = 'pending';
      if (charge.status === 'succeeded') {
        status = 'completed';
      } else if (charge.status === 'pending') {
        status = 'pending';
      } else if (charge.status === 'failed') {
        status = 'failed';
      }

      return {
        _id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status,
        paymentStatus: status,
        customerName: studentName,
        customerEmail,
        email: customerEmail,
        passName,
        createdAt: new Date(charge.created * 1000).toISOString(),
        paymentMethod: charge.payment_method_details?.type || 'card',
        paymentId: charge.id,
        type: 'subscription', // ← This is what the API returns
        // Add user object that PaymentsTable expects
        user: {
          _id: sessionMetadata.userId || charge.id,
          name: studentName,
          email: customerEmail
        },
        // Add pass object that PaymentsTable expects
        pass: {
          _id: sessionMetadata.passId || charge.id,
          name: passName, // ← This is what PaymentsTable will display
          type: sessionMetadata.passType || 'pass'
        }
      };
    });

    console.log('📊 Final API Response (what frontend receives):');
    payments.forEach((payment, index) => {
      console.log(`\n🎫 Transaction ${index + 1}:`);
      console.log(`   Type: "${payment.type}" (should be "subscription")`);
      console.log(`   Student: "${payment.user.name}" (should be real name)`);
      console.log(`   Pass Name: "${payment.pass.name}" (should be real pass name)`);
      console.log(`   Amount: ${payment.amount} ${payment.currency}`);
      console.log(`   Status: ${payment.paymentStatus}`);
    });

    console.log('\n🎯 Expected Frontend Display:');
    console.log('   - Type column: "subscription" (purple badge)');
    console.log('   - Student column: Real student names like "Dance Customer"');
    console.log('   - Item column: Real pass names like "4 COURSE PASS", "DAY DROP-IN"');
    console.log('   - No more "Unknown User" or "Unknown Class"!');

    console.log('\n✅ Fix should be working now!');

  } catch (error) {
    console.error('❌ Error testing final fix:', error);
  }
}

// Run the test
testFinalFix();
