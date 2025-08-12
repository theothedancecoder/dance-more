import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🚨 EMERGENCY WEBHOOK SECRET DIAGNOSIS');
console.log('====================================');

function checkWebhookSecrets() {
  console.log('🔍 Checking webhook secret configuration...');
  console.log('');
  
  const nodeEnv = process.env.NODE_ENV;
  const prodSecret = process.env.STRIPE_WEBHOOK_SECRET_PROD;
  const localSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL;
  
  console.log(`Environment: ${nodeEnv || 'undefined'}`);
  console.log(`Production secret exists: ${prodSecret ? '✅ YES' : '❌ NO'}`);
  console.log(`Local secret exists: ${localSecret ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  if (prodSecret) {
    console.log(`Production secret preview: ${prodSecret.substring(0, 10)}...`);
  }
  if (localSecret) {
    console.log(`Local secret preview: ${localSecret.substring(0, 10)}...`);
  }
  console.log('');
  
  // Determine which secret would be used
  const activeSecret = nodeEnv === 'production' ? prodSecret : localSecret;
  
  console.log('🎯 WEBHOOK SECRET ANALYSIS:');
  console.log('===========================');
  
  if (!activeSecret) {
    console.log('❌ CRITICAL: No webhook secret configured for current environment');
    console.log(`   Environment: ${nodeEnv || 'development'}`);
    console.log(`   Expected variable: ${nodeEnv === 'production' ? 'STRIPE_WEBHOOK_SECRET_PROD' : 'STRIPE_WEBHOOK_SECRET_LOCAL'}`);
    console.log('');
    console.log('🔧 IMMEDIATE FIX REQUIRED:');
    console.log('==========================');
    console.log('1. Go to Stripe Dashboard → Webhooks');
    console.log('2. Find the webhook endpoint: https://dancemore.app/api/stripe/webhook');
    console.log('3. Click "Reveal" on the signing secret');
    console.log('4. Copy the secret (starts with whsec_)');
    console.log('5. Add to environment variables:');
    if (nodeEnv === 'production') {
      console.log('   STRIPE_WEBHOOK_SECRET_PROD=whsec_your_secret_here');
    } else {
      console.log('   STRIPE_WEBHOOK_SECRET_LOCAL=whsec_your_secret_here');
    }
    console.log('6. Redeploy the application');
    console.log('');
  } else {
    console.log('✅ Webhook secret is configured');
    console.log(`   Using: ${nodeEnv === 'production' ? 'STRIPE_WEBHOOK_SECRET_PROD' : 'STRIPE_WEBHOOK_SECRET_LOCAL'}`);
    console.log(`   Preview: ${activeSecret.substring(0, 10)}...`);
    console.log('');
    
    if (!activeSecret.startsWith('whsec_')) {
      console.log('⚠️ WARNING: Secret doesn\'t start with "whsec_"');
      console.log('   This might not be a valid Stripe webhook secret');
      console.log('   Stripe webhook secrets always start with "whsec_"');
      console.log('');
    }
    
    console.log('🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Verify the secret matches Stripe dashboard exactly');
    console.log('2. Ensure no extra spaces or characters');
    console.log('3. Test webhook with Stripe CLI');
    console.log('4. Retry failed webhooks from Stripe dashboard');
  }
  
  console.log('');
  console.log('🚨 PRODUCTION IMPACT:');
  console.log('=====================');
  console.log('❌ 103 customers paid but received no passes');
  console.log('❌ All webhook deliveries failing (100% failure rate)');
  console.log('❌ Revenue loss due to customer dissatisfaction');
  console.log('✅ URGENT: Fix webhook secret to restore service');
  console.log('');
  
  console.log('📋 RECOVERY CHECKLIST:');
  console.log('======================');
  console.log('□ 1. Fix webhook secret configuration');
  console.log('□ 2. Test webhook endpoint manually');
  console.log('□ 3. Retry failed webhooks from Stripe dashboard');
  console.log('□ 4. Monitor new webhook deliveries');
  console.log('□ 5. Manually create subscriptions for recent purchases if needed');
  console.log('□ 6. Notify affected customers');
}

checkWebhookSecrets();
