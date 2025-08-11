import fetch from 'node-fetch';

console.log('🔍 TESTING WEBHOOK ENDPOINT DIRECTLY');

async function testWebhookEndpoint() {
  try {
    console.log('\n🌐 Testing webhook endpoint accessibility...');
    
    // Test if the webhook endpoint is reachable
    const response = await fetch('https://dancemore.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Webhook-Test/1.0)'
      },
      body: JSON.stringify({
        test: 'webhook-accessibility-test'
      })
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.status === 400) {
      console.log('✅ Webhook endpoint is accessible (400 = bad request expected for test data)');
    } else if (response.status === 200) {
      console.log('✅ Webhook endpoint is working');
    } else if (response.status === 404) {
      console.log('❌ Webhook endpoint not found - routing issue');
    } else if (response.status === 500) {
      console.log('❌ Webhook endpoint has server error');
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
    }

    console.log('\n🔍 NEXT STEPS:');
    console.log('1. Check Stripe Dashboard → Webhooks');
    console.log('2. Verify webhook URL: https://dancemore.app/api/stripe/webhook');
    console.log('3. Check webhook events: checkout.session.completed');
    console.log('4. Look at recent webhook delivery attempts');
    console.log('5. Check if webhook secret matches environment variable');

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
    console.log('\n🔍 This could indicate:');
    console.log('   - Network connectivity issues');
    console.log('   - Webhook endpoint not deployed');
    console.log('   - DNS/routing problems');
  }
}

testWebhookEndpoint();
