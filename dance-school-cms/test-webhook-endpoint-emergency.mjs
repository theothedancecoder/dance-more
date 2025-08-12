import fetch from 'node-fetch';

console.log('🚨 EMERGENCY WEBHOOK ENDPOINT TEST');
console.log('==================================');

async function testWebhookEndpoint() {
  try {
    console.log('🔍 Testing webhook endpoint accessibility...');
    console.log('URL: https://dancemore.app/api/stripe/webhook');
    console.log('');

    // Test basic connectivity
    const response = await fetch('https://dancemore.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature',
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      body: JSON.stringify({
        id: 'evt_test',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            payment_status: 'paid'
          }
        }
      })
    });

    console.log(`HTTP Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log('');

    const responseText = await response.text();
    console.log('Response body:');
    console.log(responseText.substring(0, 1000));
    console.log('');

    // Analyze the response
    if (response.status === 400) {
      console.log('✅ GOOD: Endpoint exists and responds (400 = bad signature, expected)');
      console.log('💡 This means the webhook endpoint is accessible');
      console.log('❌ ISSUE: Likely webhook signature verification failing');
    } else if (response.status === 404) {
      console.log('❌ CRITICAL: Webhook endpoint not found (404)');
      console.log('💡 The endpoint might not be deployed or route is wrong');
    } else if (response.status === 500) {
      console.log('❌ CRITICAL: Server error in webhook endpoint (500)');
      console.log('💡 There\'s a bug in the webhook code causing crashes');
    } else if (response.status === 405) {
      console.log('❌ ISSUE: Method not allowed (405)');
      console.log('💡 Webhook endpoint might not accept POST requests');
    } else {
      console.log(`❓ UNEXPECTED: Status ${response.status}`);
    }

    console.log('');
    console.log('🔧 NEXT STEPS BASED ON RESULT:');
    console.log('==============================');
    
    if (response.status === 400) {
      console.log('1. ✅ Endpoint is working - signature verification issue');
      console.log('2. 🔑 Check STRIPE_WEBHOOK_SECRET environment variable');
      console.log('3. 🔄 Verify webhook secret matches Stripe dashboard');
      console.log('4. 🧪 Test with correct signature');
    } else if (response.status === 404) {
      console.log('1. ❌ Endpoint missing - deployment issue');
      console.log('2. 🚀 Check if webhook route is properly deployed');
      console.log('3. 📁 Verify file exists: src/app/api/stripe/webhook/route.ts');
      console.log('4. 🔄 Redeploy the application');
    } else if (response.status === 500) {
      console.log('1. ❌ Code error - webhook crashes on execution');
      console.log('2. 🐛 Check webhook code for bugs');
      console.log('3. 📝 Check server logs for error details');
      console.log('4. 🔧 Fix the bug and redeploy');
    }

    console.log('');
    console.log('⚡ IMMEDIATE ACTION REQUIRED:');
    console.log('============================');
    console.log('1. Fix the webhook endpoint issue identified above');
    console.log('2. Test webhook with Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('3. Retry failed webhooks from Stripe dashboard');
    console.log('4. Monitor new webhook deliveries');
    console.log('');
    console.log('🚨 CUSTOMERS ARE WAITING FOR THEIR PASSES!');

  } catch (error) {
    console.error('❌ CRITICAL: Cannot reach webhook endpoint at all');
    console.error('Error:', error.message);
    console.log('');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('- Domain/DNS issues');
    console.log('- Server completely down');
    console.log('- Network connectivity problems');
    console.log('- SSL/TLS certificate issues');
    console.log('');
    console.log('🚨 THIS IS A CRITICAL INFRASTRUCTURE ISSUE');
  }
}

testWebhookEndpoint();
