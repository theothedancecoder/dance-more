import { config } from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function diagnoseWebhookIssue() {
  console.log('🔍 Diagnosing webhook issue...\n');

  // 1. Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || '❌ Missing');
  console.log('');

  // 2. Check webhook endpoints in Stripe
  console.log('2️⃣ Checking Stripe webhook endpoints...');
  try {
    const endpoints = await stripe.webhookEndpoints.list();
    console.log(`   Found ${endpoints.data.length} webhook endpoint(s):`);
    
    endpoints.data.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. URL: ${endpoint.url}`);
      console.log(`      Status: ${endpoint.status}`);
      console.log(`      Events: ${endpoint.enabled_events.length} events`);
      console.log(`      Created: ${new Date(endpoint.created * 1000).toLocaleString()}`);
      
      // Check if it's listening to checkout.session.completed
      const hasCheckoutEvent = endpoint.enabled_events.includes('checkout.session.completed');
      console.log(`      Listening to checkout.session.completed: ${hasCheckoutEvent ? '✅' : '❌'}`);
      console.log('');
    });
  } catch (error) {
    console.error('   ❌ Error fetching webhook endpoints:', error.message);
  }

  // 3. Check recent webhook deliveries
  console.log('3️⃣ Checking recent webhook delivery attempts...');
  try {
    const events = await stripe.events.list({
      limit: 10,
      type: 'checkout.session.completed'
    });
    
    console.log(`   Found ${events.data.length} recent checkout.session.completed events:`);
    
    for (const event of events.data) {
      console.log(`   📅 ${new Date(event.created * 1000).toLocaleString()}`);
      console.log(`      Event ID: ${event.id}`);
      console.log(`      Session ID: ${event.data.object.id}`);
      console.log(`      Customer Email: ${event.data.object.customer_email}`);
      console.log(`      Amount: ${event.data.object.amount_total / 100} ${event.data.object.currency?.toUpperCase()}`);
      console.log(`      Metadata:`, event.data.object.metadata);
      
      // Check webhook delivery attempts for this event
      try {
        const deliveryAttempts = await stripe.events.listDeliveryAttempts(event.id);
        console.log(`      Delivery attempts: ${deliveryAttempts.data.length}`);
        
        deliveryAttempts.data.forEach((attempt, i) => {
          console.log(`        ${i + 1}. Status: ${attempt.response_status_code} at ${new Date(attempt.created * 1000).toLocaleString()}`);
          if (attempt.response_status_code !== 200) {
            console.log(`           Error: ${attempt.response_body}`);
          }
        });
      } catch (deliveryError) {
        console.log(`      ❌ Could not fetch delivery attempts: ${deliveryError.message}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('   ❌ Error fetching recent events:', error.message);
  }

  // 4. Test webhook endpoint accessibility
  console.log('4️⃣ Testing webhook endpoint accessibility...');
  const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/webhook`;
  console.log(`   Testing: ${webhookUrl}`);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`   Response status: ${response.status}`);
    console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 400) {
      console.log('   ✅ Endpoint is accessible (400 expected for invalid signature)');
    } else {
      const text = await response.text();
      console.log(`   Response body: ${text}`);
    }
  } catch (error) {
    console.error(`   ❌ Endpoint not accessible: ${error.message}`);
  }

  // 5. Check for recent purchases that should have triggered webhooks
  console.log('5️⃣ Recommendations:');
  console.log('   • Ensure webhook URL is exactly: https://www.dancemore.app/api/stripe/webhook');
  console.log('   • Verify webhook is listening to "checkout.session.completed" event');
  console.log('   • Check that STRIPE_WEBHOOK_SECRET matches the webhook endpoint secret');
  console.log('   • Look at Stripe Dashboard > Webhooks > [Your Endpoint] > Recent deliveries');
  console.log('   • If deliveries are failing, check the error messages in Stripe Dashboard');
  console.log('');
  
  console.log('6️⃣ Manual Fix Options:');
  console.log('   • Run sync-all-missing-subscriptions.mjs to create missing subscriptions');
  console.log('   • Use create-missing-subscription.mjs for specific customers');
  console.log('   • Check server logs during purchase attempts');
}

diagnoseWebhookIssue().catch(console.error);
