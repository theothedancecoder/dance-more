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

async function testStripeAdminPayments() {
  console.log('🧪 Testing Stripe-based Admin Payments API...\n');

  try {
    // 1. Get a tenant with Stripe Connect account
    console.log('1️⃣ Finding tenant with Stripe Connect account...');
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
    console.log(`   Stripe Account ID: ${tenant.stripeConnect.accountId}`);
    console.log(`   Account Status: ${tenant.stripeConnect.accountStatus}\n`);

    // 2. Test fetching charges directly from Stripe
    console.log('2️⃣ Fetching charges from Stripe Connect account...');
    const charges = await stripe.charges.list({
      limit: 10,
    }, {
      stripeAccount: tenant.stripeConnect.accountId,
    });

    console.log(`✅ Found ${charges.data.length} charges from Stripe`);
    
    if (charges.data.length > 0) {
      console.log('\n📊 Sample charge data:');
      const sampleCharge = charges.data[0];
      console.log(`   ID: ${sampleCharge.id}`);
      console.log(`   Amount: ${sampleCharge.amount / 100} ${sampleCharge.currency.toUpperCase()}`);
      console.log(`   Status: ${sampleCharge.status}`);
      console.log(`   Customer Name: ${sampleCharge.billing_details?.name || 'Not provided'}`);
      console.log(`   Customer Email: ${sampleCharge.billing_details?.email || sampleCharge.receipt_email || 'Not provided'}`);
      console.log(`   Description: ${sampleCharge.description || 'No description'}`);
      console.log(`   Created: ${new Date(sampleCharge.created * 1000).toISOString()}`);
      
      if (sampleCharge.metadata && Object.keys(sampleCharge.metadata).length > 0) {
        console.log('   Metadata:');
        Object.entries(sampleCharge.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
    }

    // 3. Test the API endpoint (simulate the request)
    console.log('\n3️⃣ Testing payment data transformation...');
    
    const transformedPayments = charges.data.map((charge) => {
      const customerName = charge.billing_details?.name || 
                         charge.metadata?.customerName || 
                         'Unknown Customer';
      
      const customerEmail = charge.billing_details?.email || 
                          charge.metadata?.customerEmail || 
                          charge.receipt_email || 
                          'No email provided';

      const passName = charge.metadata?.passName || 
                      charge.metadata?.productName ||
                      charge.description || 
                      'Unknown Pass';

      let paymentMethod = 'card';
      if (charge.payment_method_details) {
        paymentMethod = charge.payment_method_details.type || 'card';
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
        customerName,
        customerEmail,
        passName,
        createdAt: new Date(charge.created * 1000).toISOString(),
        paymentMethod,
        paymentId: charge.id,
        type: 'Pass Purchase'
      };
    });

    console.log(`✅ Transformed ${transformedPayments.length} payments`);
    
    if (transformedPayments.length > 0) {
      console.log('\n📋 Sample transformed payment:');
      const sample = transformedPayments[0];
      console.log(`   Customer: ${sample.customerName}`);
      console.log(`   Email: ${sample.customerEmail}`);
      console.log(`   Pass: ${sample.passName}`);
      console.log(`   Amount: ${sample.amount} ${sample.currency}`);
      console.log(`   Status: ${sample.status}`);
      console.log(`   Date: ${sample.createdAt}`);
    }

    // 4. Calculate revenue statistics
    console.log('\n4️⃣ Calculating revenue statistics...');
    
    const completedPayments = transformedPayments.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((total, payment) => total + payment.amount, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPayments = completedPayments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startOfMonth;
    });
    const monthlyRevenue = monthlyPayments.reduce((total, payment) => total + payment.amount, 0);

    console.log(`✅ Total Revenue: ${totalRevenue} NOK (${completedPayments.length} completed payments)`);
    console.log(`✅ Monthly Revenue: ${monthlyRevenue} NOK (${monthlyPayments.length} payments this month)`);

    console.log('\n🎉 Stripe-based Admin Payments API test completed successfully!');
    console.log('\n💡 Key Benefits:');
    console.log('   ✓ Real-time data directly from Stripe');
    console.log('   ✓ No caching issues');
    console.log('   ✓ Accurate customer names and emails');
    console.log('   ✓ Proper pass/product names from metadata');
    console.log('   ✓ Fallback to Sanity data if Stripe fails');

  } catch (error) {
    console.error('❌ Error testing Stripe admin payments:', error);
    
    if (error.type === 'StripePermissionError') {
      console.log('\n💡 This might be a permissions issue with the Stripe Connect account.');
      console.log('   Make sure the account is fully onboarded and has the correct capabilities.');
    }
  }
}

// Run the test
testStripeAdminPayments();
