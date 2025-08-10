import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function debugStripeConnectLive() {
  try {
    console.log('🔍 Live Stripe Connect Debug for Dancecity...\n');
    
    // Get current tenant state
    const tenant = await client.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0]{
        _id, 
        schoolName, 
        "slug": slug.current,
        contactEmail,
        ownerId,
        stripeConnect
      }
    `);
    
    console.log('🏫 Current Dancecity State:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Contact Email: ${tenant.contactEmail}`);
    console.log(`   Owner: ${tenant.ownerId}`);
    console.log(`   Stripe Connect: ${JSON.stringify(tenant.stripeConnect || {}, null, 2)}`);
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('When you click "Connect with Stripe":');
    console.log('1. Browser should call /api/stripe/connect/create-account');
    console.log('2. API creates Stripe account and saves accountId to database');
    console.log('3. Browser immediately calls /api/stripe/connect/onboard');
    console.log('4. API returns Stripe onboarding URL');
    console.log('5. Browser redirects to Stripe onboarding page');
    
    console.log('\n🔧 DEBUGGING STEPS:');
    console.log('1. Open browser console (F12) → Network tab');
    console.log('2. Click "Connect with Stripe"');
    console.log('3. Watch for API calls to:');
    console.log('   - /api/stripe/connect/create-account (POST)');
    console.log('   - /api/stripe/connect/onboard (POST)');
    console.log('4. Check if any API calls return errors');
    console.log('5. If successful, you should be redirected to connect.stripe.com');
    
    console.log('\n📋 COMMON ERROR PATTERNS:');
    console.log('❌ 401 Unauthorized → Clerk session issue');
    console.log('❌ 403 Forbidden → User permission issue');
    console.log('❌ 500 Internal Error → Stripe API key or server issue');
    console.log('❌ Network Error → CORS or connectivity issue');
    console.log('❌ No API calls → Frontend JavaScript error');
    
    console.log('\n💡 IF STRIPE CONNECT STILL FAILS:');
    console.log('Try these steps in order:');
    console.log('1. Refresh the page and try again');
    console.log('2. Clear browser cache and cookies for dancemore.app');
    console.log('3. Try in incognito/private browsing mode');
    console.log('4. Check if popup blocker is preventing Stripe redirect');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugStripeConnectLive();
