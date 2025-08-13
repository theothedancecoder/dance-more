import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('🔍 Testing Production Webhook Endpoint');
console.log('=====================================');

async function testWebhookEndpoint() {
  try {
    // Test the production webhook endpoint
    const webhookUrl = 'https://dance-school-cms.vercel.app/api/stripe/webhook';
    
    console.log('📡 Testing webhook endpoint:', webhookUrl);
    
    // Create a simple test payload (not a real Stripe event)
    const testPayload = JSON.stringify({
      test: true,
      message: 'Testing webhook endpoint availability'
    });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: testPayload
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    if (response.status === 400 && responseText.includes('Webhook Error')) {
      console.log('✅ Webhook endpoint is responding and attempting signature verification');
      console.log('   This confirms the endpoint is deployed and working');
    } else {
      console.log('⚠️ Unexpected response from webhook endpoint');
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error);
  }
}

// Test webhook secret configuration
console.log('\n🔑 Webhook Secret Configuration:');
console.log('STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
if (process.env.STRIPE_WEBHOOK_SECRET) {
  console.log('STRIPE_WEBHOOK_SECRET length:', process.env.STRIPE_WEBHOOK_SECRET.length);
  console.log('STRIPE_WEBHOOK_SECRET starts with:', process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...');
}

// Run the test
testWebhookEndpoint();
