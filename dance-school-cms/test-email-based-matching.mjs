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

async function testEmailBasedMatching() {
  console.log('🧪 Testing Email-Based User Matching...\n');

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

    // Simulate the new API logic
    const charges = await stripe.charges.list({
      limit: 3,
    }, {
      stripeAccount: stripeAccountId,
    });

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

    // Get user data by email (new approach)
    const emails = Array.from(new Set(
      charges.data
        .map(charge => charge.billing_details?.email || charge.receipt_email)
        .filter(Boolean)
    ));

    console.log(`📧 Emails found in charges: [${emails.join(', ')}]`);

    let userMapByEmail = new Map();
    if (emails.length > 0) {
      const usersByEmail = await sanityClient.fetch(
        `*[_type == "user" && email in $emails] {
          clerkId,
          name,
          firstName,
          lastName,
          email
        }`,
        { emails }
      );
      
      console.log(`👥 Found ${usersByEmail.length} users by email:`);
      usersByEmail.forEach((user) => {
        userMapByEmail.set(user.email, user);
        console.log(`   ${user.email} -> ${user.name || `${user.firstName} ${user.lastName}`}`);
      });
    }

    // Test the new matching logic
    console.log('\n🔍 Testing New Matching Logic:\n');

    charges.data.forEach((charge, index) => {
      console.log(`💳 Charge ${index + 1}: ${charge.id}`);
      
      const sessionData = sessionDataMap.get(charge.payment_intent) || { metadata: {}, lineItems: [] };
      const sessionMetadata = sessionData.metadata;
      const lineItems = sessionData.lineItems;
      
      let studentName = 'Unknown Student';
      let foundUser = null;
      
      // First, try to match by email (most reliable)
      const customerEmail = charge.billing_details?.email || 
                          charge.metadata?.customerEmail || 
                          sessionMetadata?.customerEmail ||
                          charge.receipt_email;
      
      console.log(`   📧 Customer email: ${customerEmail}`);
      
      if (customerEmail) {
        foundUser = userMapByEmail.get(customerEmail);
        if (foundUser) {
          studentName = foundUser.name || 
                       (foundUser.firstName && foundUser.lastName ? `${foundUser.firstName} ${foundUser.lastName}` : '') ||
                       'Unknown Student';
          console.log(`   ✅ Found user by email: ${studentName} (${foundUser.clerkId})`);
        } else {
          console.log(`   ❌ No user found for email: ${customerEmail}`);
        }
      }
      
      // Final fallback to Stripe billing details if no user found in Sanity
      if (!foundUser) {
        studentName = charge.billing_details?.name || 
                     charge.metadata?.customerName || 
                     sessionMetadata?.customerName ||
                     'Unknown Student';
        console.log(`   🔄 Using Stripe billing name: ${studentName}`);
      }
      
      // Extract pass name
      let passName = 'Unknown Pass';
      if (lineItems.length > 0) {
        passName = lineItems[0].description || 'Unknown Pass';
      }
      
      console.log(`   🎯 Final result: "${studentName}" purchased "${passName}"`);
      console.log(`   ---`);
    });

    console.log('\n🎉 Expected Results:');
    console.log('   - mollergata9@gmail.com charges should show "Theodore Awadzi"');
    console.log('   - dancewithdancecity@gmail.com charges should show "Theodore Awadzi"');
    console.log('   - dance@gmail.com charges should show Stripe billing name (no Sanity user)');

  } catch (error) {
    console.error('❌ Error testing email-based matching:', error);
  }
}

// Run the test
testEmailBasedMatching();
