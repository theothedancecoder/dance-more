#!/usr/bin/env node
import { config } from 'dotenv';

config({ path: './.env.local' });

console.log('🔧 STRIPE WEBHOOK LOCAL TESTING SETUP');
console.log('='.repeat(50));

console.log('The issue: No webhook endpoints are configured in Stripe!');
console.log('This is why new purchases don\'t create subscriptions automatically.\n');

console.log('🎯 SOLUTION: Set up Stripe CLI for local webhook testing\n');

console.log('📋 STEP-BY-STEP INSTRUCTIONS:');
console.log('='.repeat(30));

console.log('\n1. Install Stripe CLI:');
console.log('   macOS: brew install stripe/stripe-cli/stripe');
console.log('   Windows: Download from https://github.com/stripe/stripe-cli/releases');
console.log('   Linux: See https://stripe.com/docs/stripe-cli#install');

console.log('\n2. Login to Stripe CLI:');
console.log('   stripe login');

console.log('\n3. Start webhook forwarding (run this in a separate terminal):');
console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');

console.log('\n4. Copy the webhook signing secret from the CLI output and update .env.local:');
console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');

console.log('\n5. Test the webhook:');
console.log('   stripe trigger checkout.session.completed');

console.log('\n🔍 CURRENT STATUS:');
console.log('='.repeat(20));
console.log('Webhook secret in .env.local:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ SET' : '❌ MISSING');
console.log('Current value:', process.env.STRIPE_WEBHOOK_SECRET || 'UNDEFINED');

console.log('\n🚀 ALTERNATIVE: For production deployment');
console.log('='.repeat(40));
console.log('1. Deploy your app to a public URL (Vercel, Netlify, etc.)');
console.log('2. Go to Stripe Dashboard > Webhooks');
console.log('3. Add endpoint: https://your-domain.com/api/stripe/webhook');
console.log('4. Select events: checkout.session.completed');
console.log('5. Copy the webhook secret to your production environment variables');

console.log('\n💡 QUICK TEST:');
console.log('='.repeat(15));
console.log('After setting up Stripe CLI, make a test purchase and check if:');
console.log('1. The webhook receives the event (check terminal logs)');
console.log('2. A new subscription appears in your active passes');
console.log('3. The pass name is correct');

console.log('\n🔧 TROUBLESHOOTING:');
console.log('='.repeat(20));
console.log('If webhook still doesn\'t work after setup:');
console.log('1. Check server logs for errors');
console.log('2. Verify webhook secret matches');
console.log('3. Ensure Next.js dev server is running on port 3000');
console.log('4. Test webhook endpoint manually: curl -X POST localhost:3000/api/stripe/webhook');
