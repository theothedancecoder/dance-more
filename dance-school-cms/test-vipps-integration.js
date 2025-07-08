const fetch = require('node-fetch');

// Test Vipps integration
async function testVippsIntegration() {
  console.log('🧪 Testing Vipps Integration...\n');

  // Test 1: Check if Vipps access token can be obtained
  console.log('1. Testing Vipps Access Token...');
  try {
    const clientId = process.env.VIPPS_CLIENT_ID;
    const clientSecret = process.env.VIPPS_CLIENT_SECRET;
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;

    if (!clientId || !clientSecret || !subscriptionKey) {
      console.log('⚠️  Vipps credentials not found in environment variables');
      console.log('   Please set VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, and VIPPS_SUBSCRIPTION_KEY\n');
      return;
    }

    const response = await fetch('https://apitest.vipps.no/accesstoken/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': clientId,
        'client_secret': clientSecret,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Vipps access token obtained successfully');
      console.log(`   Token type: ${data.token_type}`);
      console.log(`   Expires in: ${data.expires_in} seconds\n`);
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to get Vipps access token');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}\n`);
    }
  } catch (error) {
    console.log('❌ Error testing Vipps access token:', error.message, '\n');
  }

  // Test 2: Check if local Vipps checkout API endpoint is accessible
  console.log('2. Testing Local Vipps Checkout API...');
  try {
    const response = await fetch('http://localhost:3001/api/vipps/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        classId: 'test-class-id',
        successUrl: 'http://localhost:3001/payment/success',
        cancelUrl: 'http://localhost:3001/classes/test-class-id',
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Vipps checkout API endpoint is working');
      console.log(`   Order ID: ${data.orderId}`);
      console.log(`   Payment URL: ${data.url}\n`);
    } else {
      console.log('⚠️  Vipps checkout API returned an error (expected without authentication)');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}\n`);
    }
  } catch (error) {
    console.log('❌ Error testing local Vipps checkout API:', error.message, '\n');
  }

  // Test 3: Check if webhook endpoint is accessible
  console.log('3. Testing Vipps Webhook Endpoint...');
  try {
    const response = await fetch('http://localhost:3001/api/vipps/webhook', {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Vipps webhook endpoint is accessible');
      console.log(`   Message: ${data.message}\n`);
    } else {
      console.log('❌ Vipps webhook endpoint is not accessible');
      console.log(`   Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log('❌ Error testing Vipps webhook endpoint:', error.message, '\n');
  }

  console.log('🎉 Vipps integration test completed!');
}

// Run the test
testVippsIntegration().catch(console.error);
