import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🚨 DEBUGGING WEBHOOK NOT TRIGGERING - CRITICAL ISSUE');

async function debugWebhookNotTriggering() {
  try {
    console.log('\n🔍 WEBHOOK CONFIGURATION CHECK:');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
    console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
    console.log('   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
    
    console.log('\n🌐 WEBHOOK ENDPOINT:');
    console.log('   Expected URL: https://dancemore.app/api/stripe/webhook');
    console.log('   Method: POST');
    console.log('   Events: checkout.session.completed');
    
    console.log('\n🔍 POSSIBLE ISSUES:');
    console.log('   1. Webhook not configured in Stripe Dashboard');
    console.log('   2. Wrong webhook URL in Stripe');
    console.log('   3. Webhook secret mismatch');
    console.log('   4. Webhook endpoint returning errors');
    console.log('   5. Stripe in test mode but webhook expects live mode');
    
    console.log('\n📊 RECENT PURCHASE TEST:');
    console.log('   You just bought a pass - check:');
    console.log('   1. Stripe Dashboard → Webhooks → Recent deliveries');
    console.log('   2. Look for checkout.session.completed events');
    console.log('   3. Check if webhook URL is being called');
    console.log('   4. Check response status (should be 200)');
    
    console.log('\n🔧 IMMEDIATE ACTIONS NEEDED:');
    console.log('   1. Check Stripe webhook configuration');
    console.log('   2. Verify webhook secret matches');
    console.log('   3. Test webhook endpoint manually');
    console.log('   4. Check Vercel function logs');
    
  } catch (error) {
    console.error('❌ Error debugging webhook:', error);
  }
}

debugWebhookNotTriggering();
