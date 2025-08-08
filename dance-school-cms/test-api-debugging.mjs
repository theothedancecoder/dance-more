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

async function testApiDebugging() {
  console.log('🔍 Testing API Debugging - Simulating the exact API logic...\n');

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

    // Simulate the exact API logic
    console.log('🔍 Fetching payments from Stripe Connect account:', stripeAccountId);

    // Fetch charges
    const charges = await stripe.charges.list({
      limit: 10,
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`✅ Found ${charges.data.length} charges from Stripe`);

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

    console.log(`✅ Found ${checkoutSessions.data.length} checkout sessions`);
    console.log(`✅ Created session data map with ${sessionDataMap.size} entries\n`);

    // Test the first few charges
    const testCharges = charges.data.slice(0, 3);
    
    testCharges.forEach((charge, index) => {
      console.log(`\n📋 Testing Charge ${index + 1}:`);
      console.log(`   Charge ID: ${charge.id}`);
      console.log(`   Payment Intent: ${charge.payment_intent}`);
      console.log(`   Amount: ${charge.amount / 100} ${charge.currency.toUpperCase()}`);
      
      // Get checkout session data if available
      const sessionData = sessionDataMap.get(charge.payment_intent) || { metadata: {}, lineItems: [] };
      const sessionMetadata = sessionData.metadata;
      const lineItems = sessionData.lineItems;
      
      console.log(`   Session Metadata Keys: [${Object.keys(sessionMetadata).join(', ')}]`);
      console.log(`   Line Items Count: ${lineItems.length}`);
      
      // Extract pass/product name from line items first, then fallback to metadata
      let passName = 'Unknown Pass';
      if (lineItems.length > 0) {
        passName = lineItems[0].description || 'Unknown Pass';
        console.log(`   ✅ Found Pass Name from Line Item: ${passName}`);

        // Show all items purchased in this session
        lineItems.forEach((item, itemIndex) => {
          console.log(`      Item ${itemIndex + 1}: ${item.description} (Qty: ${item.quantity})`);
        });
      } else {
        console.log(`   ❌ No line items found`);
        passName = charge.metadata?.passName || 
                  sessionMetadata?.passName ||
                  charge.description || 
                  'Unknown Pass';
        console.log(`   Fallback Pass Name: ${passName}`);
      }
      
      console.log(`   🎯 Final Pass Name: ${passName}`);
    });

    console.log('\n🎉 API debugging test completed!');

  } catch (error) {
    console.error('❌ Error testing API debugging:', error);
  }
}

// Run the test
testApiDebugging();
