import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function testStripeConnectCreation() {
  console.log('🧪 Testing Stripe Connect Account Creation...\n');

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables...');
    const requiredVars = [
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'SANITY_API_TOKEN'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        console.log(`❌ Missing: ${varName}`);
      } else {
        console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '***' : value.substring(0, 10)}...`);
      }
    }

    // 2. Test Stripe API connection
    console.log('\n2. Testing Stripe API connection...');
    try {
      const account = await stripe.accounts.retrieve();
      console.log(`✅ Stripe API connected. Account ID: ${account.id}`);
      console.log(`   Business type: ${account.business_type || 'Not set'}`);
      console.log(`   Country: ${account.country}`);
      console.log(`   Charges enabled: ${account.charges_enabled}`);
      console.log(`   Payouts enabled: ${account.payouts_enabled}`);
    } catch (stripeError) {
      console.log(`❌ Stripe API error: ${stripeError.message}`);
      return;
    }

    // 3. Get a test tenant
    console.log('\n3. Getting test tenant...');
    const tenants = await sanityClient.fetch(`
      *[_type == "tenant" && status == "active"] | order(_createdAt desc) [0..2] {
        _id,
        schoolName,
        slug,
        stripeConnectAccountId,
        stripeConnectStatus
      }
    `);

    if (tenants.length === 0) {
      console.log('❌ No active tenants found');
      return;
    }

    const testTenant = tenants[0];
    console.log(`✅ Using tenant: ${testTenant.schoolName} (${testTenant.slug?.current})`);
    console.log(`   Current Stripe status: ${testTenant.stripeConnectStatus || 'not_connected'}`);
    console.log(`   Current Account ID: ${testTenant.stripeConnectAccountId || 'None'}`);

    // 4. Test Stripe Express account creation
    console.log('\n4. Testing Stripe Express account creation...');
    try {
      const expressAccount = await stripe.accounts.create({
        type: 'express',
        country: 'NO', // Norway
        email: 'test@example.com',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          tenant_id: testTenant._id,
          tenant_slug: testTenant.slug?.current || 'unknown',
          platform: 'dance-more'
        }
      });

      console.log(`✅ Express account created successfully!`);
      console.log(`   Account ID: ${expressAccount.id}`);
      console.log(`   Type: ${expressAccount.type}`);
      console.log(`   Country: ${expressAccount.country}`);
      console.log(`   Charges enabled: ${expressAccount.charges_enabled}`);
      console.log(`   Details submitted: ${expressAccount.details_submitted}`);

      // 5. Test account link creation
      console.log('\n5. Testing account link creation...');
      try {
        const accountLink = await stripe.accountLinks.create({
          account: expressAccount.id,
          refresh_url: 'http://localhost:3000/dance-with-dancecity/admin/payments',
          return_url: 'http://localhost:3000/dance-with-dancecity/admin/payments/stripe/return',
          type: 'account_onboarding',
        });

        console.log(`✅ Account link created successfully!`);
        console.log(`   URL: ${accountLink.url.substring(0, 50)}...`);
        console.log(`   Expires at: ${new Date(accountLink.expires_at * 1000).toISOString()}`);

      } catch (linkError) {
        console.log(`❌ Account link creation failed: ${linkError.message}`);
        console.log(`   Error type: ${linkError.type}`);
        console.log(`   Error code: ${linkError.code}`);
      }

      // 6. Clean up test account
      console.log('\n6. Cleaning up test account...');
      try {
        await stripe.accounts.del(expressAccount.id);
        console.log(`✅ Test account deleted successfully`);
      } catch (deleteError) {
        console.log(`⚠️  Could not delete test account: ${deleteError.message}`);
      }

    } catch (accountError) {
      console.log(`❌ Express account creation failed: ${accountError.message}`);
      console.log(`   Error type: ${accountError.type}`);
      console.log(`   Error code: ${accountError.code}`);
      
      if (accountError.type === 'StripeInvalidRequestError') {
        console.log('\n🔍 Common causes:');
        console.log('   - Stripe Connect not enabled on your account');
        console.log('   - Invalid country code');
        console.log('   - Missing required capabilities');
        console.log('   - Account limits reached');
      }
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testStripeConnectCreation().catch(console.error);
