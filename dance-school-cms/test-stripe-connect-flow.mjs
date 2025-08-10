import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function testStripeConnectFlow() {
  try {
    console.log('🧪 Testing Stripe Connect API Flow...\n');
    
    // Get Dancecity tenant info
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
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('🏫 Testing with Dancecity tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Contact Email: ${tenant.contactEmail || 'NOT SET'}`);
    console.log(`   Owner ID: ${tenant.ownerId || 'NOT SET'}`);
    console.log(`   Current Stripe Connect: ${JSON.stringify(tenant.stripeConnect || {}, null, 2)}`);
    
    // Test 1: Status API (should return not connected)
    console.log('\n🔍 Test 1: Checking /api/stripe/connect/status...');
    try {
      const statusResponse = await fetch('https://dancemore.app/api/stripe/connect/status', {
        headers: {
          'x-tenant-id': tenant._id,
          'Authorization': 'Bearer test', // This would normally be the Clerk token
        }
      });
      
      console.log(`   Status Code: ${statusResponse.status}`);
      const statusData = await statusResponse.text();
      console.log(`   Response: ${statusData}`);
      
      if (statusResponse.status === 401) {
        console.log('   ✅ Expected 401 (Unauthorized) - API is working, just needs auth');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 2: Check if tenant has contact email (required for Stripe account creation)
    console.log('\n📧 Test 2: Contact Email Check...');
    if (!tenant.contactEmail) {
      console.log('   ❌ No contact email set for tenant');
      console.log('   🔧 This will cause Stripe account creation to fail');
      console.log('   💡 Solution: Set contactEmail in tenant document or ensure user has email in Clerk');
    } else {
      console.log(`   ✅ Contact email found: ${tenant.contactEmail}`);
    }
    
    // Test 3: Check owner ID
    console.log('\n👤 Test 3: Owner ID Check...');
    if (!tenant.ownerId) {
      console.log('   ❌ No owner ID set for tenant');
      console.log('   🔧 This might cause permission issues');
    } else {
      console.log(`   ✅ Owner ID found: ${tenant.ownerId}`);
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('The Stripe Connect flow should work as follows:');
    console.log('1. User clicks "Connect with Stripe"');
    console.log('2. Frontend calls createAccount() which hits /api/stripe/connect/create-account');
    console.log('3. API creates Stripe account and saves to tenant.stripeConnect');
    console.log('4. Frontend immediately calls startOnboarding()');
    console.log('5. API generates Stripe onboarding URL and redirects user');
    console.log('6. User completes Stripe onboarding');
    console.log('7. Stripe redirects back to return page');
    console.log('8. Return page calls status API to verify setup');
    
    console.log('\n🔧 LIKELY ISSUES:');
    if (!tenant.contactEmail) {
      console.log('❌ Missing contact email - will cause account creation to fail');
    }
    console.log('❌ API authentication - frontend needs valid Clerk session');
    console.log('❌ CORS or network issues preventing API calls');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Ensure user has valid Clerk session when testing');
    console.log('2. Check browser console for API errors');
    console.log('3. Test API endpoints directly with proper auth headers');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStripeConnectFlow();
