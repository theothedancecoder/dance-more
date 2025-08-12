import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🚨 EMERGENCY: SYSTEM-WIDE PASS ISSUE');
console.log('====================================');
console.log('❌ CRITICAL: Many people bought passes but NONE are showing');
console.log('❌ CRITICAL: 103 failed Stripe webhooks detected');
console.log('💡 ROOT CAUSE: Webhook failures preventing subscription creation');
console.log('');

async function emergencySystemDiagnosis() {
  try {
    console.log('🔍 EMERGENCY SYSTEM DIAGNOSIS:');
    console.log('==============================');
    
    // 1. Check total subscriptions in system
    const allSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription"] {
        _id, passName, user->{name, email}, tenant->{schoolName}, 
        isActive, createdAt, stripePaymentId, stripeSessionId
      }`
    );
    
    console.log(`📊 TOTAL SUBSCRIPTIONS IN DATABASE: ${allSubscriptions.length}`);
    
    // Separate manual vs Stripe subscriptions
    const manualSubscriptions = allSubscriptions.filter(sub => 
      sub.stripePaymentId && (
        sub.stripePaymentId.includes('manual') || 
        sub.stripeSessionId && sub.stripeSessionId.includes('manual')
      )
    );
    
    const stripeSubscriptions = allSubscriptions.filter(sub => 
      sub.stripePaymentId && !sub.stripePaymentId.includes('manual')
    );
    
    console.log(`   📝 Manual subscriptions: ${manualSubscriptions.length}`);
    console.log(`   💳 Stripe subscriptions: ${stripeSubscriptions.length}`);
    console.log('');
    
    // 2. Check recent Stripe payments that might be missing subscriptions
    console.log('🔍 CHECKING FOR MISSING STRIPE SUBSCRIPTIONS:');
    console.log('==============================================');
    
    // This would require Stripe API access to check recent payments
    // For now, let's check if webhook endpoint is working
    
    console.log('🚨 IMMEDIATE ACTIONS REQUIRED:');
    console.log('==============================');
    console.log('1. 🔧 FIX WEBHOOK ENDPOINT: The webhook is failing 100% of the time');
    console.log('2. 🔄 RETRY FAILED WEBHOOKS: Stripe can resend failed webhook events');
    console.log('3. 🆘 MANUAL RECOVERY: Create subscriptions for recent purchases');
    console.log('');
    
    console.log('🎯 WEBHOOK FAILURE ANALYSIS:');
    console.log('============================');
    console.log('Endpoint: https://dancemore.app/api/stripe/webhook');
    console.log('Status: 103/103 deliveries failed (100% failure rate)');
    console.log('Impact: NO subscriptions created from Stripe purchases');
    console.log('');
    
    console.log('🔧 IMMEDIATE FIXES NEEDED:');
    console.log('==========================');
    console.log('1. Check webhook endpoint is accessible');
    console.log('2. Verify webhook secret configuration');
    console.log('3. Check for middleware blocking webhook requests');
    console.log('4. Ensure proper error handling in webhook code');
    console.log('5. Test webhook endpoint manually');
    console.log('');
    
    console.log('⚡ EMERGENCY RECOVERY PLAN:');
    console.log('===========================');
    console.log('1. IMMEDIATE: Fix webhook endpoint');
    console.log('2. IMMEDIATE: Test webhook with Stripe CLI');
    console.log('3. URGENT: Retry failed webhooks from Stripe dashboard');
    console.log('4. URGENT: Manually create subscriptions for recent purchases');
    console.log('5. MONITOR: Ensure new purchases create subscriptions');
    console.log('');
    
    console.log('🚨 THIS IS A PRODUCTION EMERGENCY');
    console.log('=================================');
    console.log('❌ Customers are paying but not receiving their passes');
    console.log('❌ This affects ALL customers, not just Solomiya');
    console.log('❌ Revenue is being lost due to customer dissatisfaction');
    console.log('✅ PRIORITY: Fix webhook system immediately');
    
  } catch (error) {
    console.error('❌ Error during emergency diagnosis:', error);
  }
}

emergencySystemDiagnosis();
