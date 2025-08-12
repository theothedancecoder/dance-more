import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 DEEP WEBHOOK DEBUGGING');
console.log('=========================');

async function deepWebhookDebug() {
  try {
    console.log('🧪 Testing webhook with proper Stripe signature...');
    
    // Create a test webhook payload
    const payload = JSON.stringify({
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          metadata: {
            type: 'pass_purchase',
            passId: 'test_pass_id',
            userId: 'test_user_id',
            tenantId: 'test_tenant_id'
          },
          customer_details: {
            name: 'Test Customer',
            email: 'test@example.com'
          },
          amount_total: 25000,
          created: Math.floor(Date.now() / 1000)
        }
      }
    });

    // Get the webhook secret (use local for testing)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL;
    
    if (!webhookSecret) {
      console.log('❌ No webhook secret found for testing');
      return;
    }

    // Create proper Stripe signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    console.log('📝 Test payload created with proper signature');
    console.log('🔐 Signature:', stripeSignature.substring(0, 50) + '...');
    console.log('');

    // Test the webhook endpoint
    const response = await fetch('https://dancemore.app/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      body: payload
    });

    console.log(`HTTP Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log('');

    const responseText = await response.text();
    console.log('Response body:');
    console.log(responseText);
    console.log('');

    // Analyze the response
    if (response.status === 200) {
      console.log('✅ SUCCESS: Webhook processed successfully!');
      console.log('💡 The webhook endpoint is working correctly');
      console.log('🔍 Issue might be with specific webhook events or metadata');
    } else if (response.status === 400) {
      console.log('❌ BAD REQUEST: Webhook rejected the request');
      if (responseText.includes('signature')) {
        console.log('💡 Still signature verification issues');
      } else if (responseText.includes('metadata')) {
        console.log('💡 Metadata validation issues');
      } else {
        console.log('💡 Other validation issues');
      }
    } else if (response.status === 500) {
      console.log('❌ SERVER ERROR: Webhook code crashed');
      console.log('💡 There\'s a bug in the webhook processing logic');
    }

    console.log('');
    console.log('🔍 ADDITIONAL DEBUGGING NEEDED:');
    console.log('===============================');
    console.log('1. Check webhook logs in production');
    console.log('2. Verify environment variables in production');
    console.log('3. Check if middleware is blocking webhook requests');
    console.log('4. Verify Sanity database connection in production');
    console.log('5. Check if Stripe API version matches');
    console.log('');
    
    console.log('🚨 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check production logs for webhook errors');
    console.log('2. Verify all environment variables are set correctly');
    console.log('3. Test webhook with actual Stripe CLI');
    console.log('4. Check if there are any middleware issues');
    console.log('5. Manually retry one failed webhook from Stripe dashboard');

  } catch (error) {
    console.error('❌ Error during deep webhook debug:', error.message);
    console.log('');
    console.log('💡 POSSIBLE ISSUES:');
    console.log('- Network connectivity problems');
    console.log('- SSL/TLS certificate issues');
    console.log('- Server infrastructure problems');
    console.log('- DNS resolution issues');
  }
}

deepWebhookDebug();
