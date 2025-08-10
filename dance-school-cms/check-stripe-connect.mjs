import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function checkStripeConnect() {
  try {
    console.log('🔍 Checking Stripe Connect setup for DANCE WITH DANCECITY...\n');
    
    // Get the tenant with Stripe info
    const tenant = await client.fetch(`
      *[_type == "tenant" && slug.current == "dance-with-dancecity"][0]{
        _id, 
        schoolName, 
        stripeAccountId, 
        stripeConnectStatus, 
        stripeOnboardingCompleted,
        stripeConnectSetup
      }
    `);
    
    console.log('🏫 DANCE WITH DANCECITY Stripe status:');
    console.log(`   Stripe Account ID: ${tenant.stripeAccountId || 'NOT SET'}`);
    console.log(`   Connect Status: ${tenant.stripeConnectStatus || 'NOT SET'}`);
    console.log(`   Onboarding Completed: ${tenant.stripeOnboardingCompleted || 'false'}`);
    console.log(`   Connect Setup: ${JSON.stringify(tenant.stripeConnectSetup || {}, null, 2)}`);
    
    if (!tenant.stripeAccountId) {
      console.log('\n❌ ISSUE: No Stripe Account ID found');
      console.log('This means the Stripe Connect flow never completed successfully.');
    } else {
      console.log('\n✅ Stripe Account ID exists');
    }
    
    console.log('\n🔧 COMMON STRIPE CONNECT ISSUES:');
    console.log('1. Return URL misconfiguration');
    console.log('2. Webhook not receiving account.updated events');
    console.log('3. Stripe Connect onboarding incomplete');
    console.log('4. Browser blocking popups or redirects');
    
    console.log('\n💡 SOLUTIONS TO TRY:');
    console.log('1. Check browser console for errors during Stripe Connect');
    console.log('2. Ensure popups are allowed for dancemore.app');
    console.log('3. Try the Stripe Connect flow in incognito mode');
    console.log('4. Check if webhooks are properly configured');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStripeConnect();
