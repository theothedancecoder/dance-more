#!/usr/bin/env node

import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = 'https://dancemore.com/api/stripe/webhook';

if (!WEBHOOK_SECRET) {
  console.error('❌ STRIPE_WEBHOOK_SECRET not found in environment');
  process.exit(1);
}

// Create a test payload
const testPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2025-06-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'ch_test_charge',
      object: 'charge',
      amount: 25000,
      currency: 'nok',
      status: 'succeeded',
      payment_intent: 'pi_test_payment_intent'
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null
  },
  type: 'charge.succeeded'
};

const payload = JSON.stringify(testPayload);
const timestamp = Math.floor(Date.now() / 1000);

// Create Stripe signature
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(signedPayload, 'utf8')
  .digest('hex');

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log('🔍 Testing Webhook with Valid Stripe Signature');
console.log('===============================================');
console.log('📡 URL:', WEBHOOK_URL);
console.log('🔑 Signature:', stripeSignature.substring(0, 50) + '...');
console.log('📦 Payload length:', payload.length);

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': stripeSignature,
      'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
    },
    body: payload
  });

  console.log('📊 Response status:', response.status);
  console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
  
  const responseText = await response.text();
  console.log('📊 Response body:', responseText);

  if (response.status === 200) {
    console.log('✅ Webhook test successful!');
  } else {
    console.log('⚠️ Webhook test failed with status:', response.status);
  }

} catch (error) {
  console.error('❌ Error testing webhook:', error.message);
}
