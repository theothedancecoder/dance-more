import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔧 WEBHOOK SECRET VERIFICATION & FIX GUIDE');

async function fixWebhookSecret() {
  try {
    console.log('\n📋 CURRENT ENVIRONMENT:');
    const currentSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (currentSecret) {
      console.log('✅ STRIPE_WEBHOOK_SECRET is set');
      console.log('   Current value:', currentSecret.substring(0, 10) + '...' + currentSecret.substring(currentSecret.length - 4));
      console.log('   Length:', currentSecret.length, 'characters');
      console.log('   Starts with:', currentSecret.startsWith('whsec_') ? '✅ whsec_' : '❌ Wrong format');
    } else {
      console.log('❌ STRIPE_WEBHOOK_SECRET is NOT set');
    }

    console.log('\n🔍 WEBHOOK SECRET TROUBLESHOOTING:');
    console.log('');
    console.log('📊 Your Stripe shows:');
    console.log('   - Total deliveries: 168');
    console.log('   - Failed deliveries: 168 (100%)');
    console.log('   - This indicates webhook secret mismatch');
    console.log('');
    
    console.log('🔧 TO FIX THIS:');
    console.log('');
    console.log('1. Go to Stripe Dashboard → Webhooks → "charming-euphoria"');
    console.log('2. Scroll down to "Signing secret"');
    console.log('3. Click "Reveal" to show the secret');
    console.log('4. Copy the entire secret (starts with whsec_)');
    console.log('');
    console.log('5. Update your .env.local file:');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_your_copied_secret_here');
    console.log('');
    console.log('6. If using Vercel, also update production environment:');
    console.log('   vercel env add STRIPE_WEBHOOK_SECRET');
    console.log('   (paste the secret when prompted)');
    console.log('');
    console.log('7. Redeploy:');
    console.log('   vercel --prod');
    console.log('');
    
    console.log('🎯 VERIFICATION:');
    console.log('After updating the secret:');
    console.log('1. Make a test purchase');
    console.log('2. Check Stripe webhook logs - should show successful delivery');
    console.log('3. Check Sanity - new subscription should appear');
    console.log('4. Check frontend - pass should show in account');
    console.log('');
    
    console.log('⚠️  COMMON MISTAKES:');
    console.log('- Using test mode secret in live mode (or vice versa)');
    console.log('- Copying only part of the secret');
    console.log('- Extra spaces or characters when copying');
    console.log('- Not redeploying after updating environment variable');
    console.log('');
    
    console.log('🚨 CRITICAL:');
    console.log('This webhook secret mismatch is the ONLY thing preventing');
    console.log('automatic subscription creation. Everything else is working!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixWebhookSecret();
