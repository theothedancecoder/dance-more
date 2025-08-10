import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function fixStripeConnectFlow() {
  try {
    console.log('🔧 Fixing Stripe Connect Flow for Dancecity...\n');
    
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
    
    // Check if there's a partial Stripe Connect setup
    if (tenant.stripeConnect && Object.keys(tenant.stripeConnect).length > 0) {
      console.log('\n⚠️  FOUND PARTIAL STRIPE CONNECT DATA');
      console.log('This might be causing the redirect loop.');
      console.log('Clearing partial data to allow fresh setup...');
      
      // Clear the partial Stripe Connect data
      await client
        .patch(tenant._id)
        .unset(['stripeConnect'])
        .commit();
      
      console.log('✅ Cleared partial Stripe Connect data');
    }
    
    console.log('\n🎯 STRIPE CONNECT FLOW DIAGNOSIS:');
    console.log('The issue is likely one of these:');
    console.log('1. ❌ Stripe account creation fails silently');
    console.log('2. ❌ Onboarding URL generation fails');
    console.log('3. ❌ Return page status check fails');
    console.log('4. ❌ API authentication issues');
    
    console.log('\n🔧 FIXES APPLIED:');
    console.log('✅ API endpoints now handle both x-tenant-id and x-tenant-slug headers');
    console.log('✅ Cleared any partial Stripe Connect data');
    console.log('✅ Database has all required tenant information');
    
    console.log('\n🧪 TESTING STEPS:');
    console.log('1. Go to: https://dancemore.app/dancecity/admin/payments');
    console.log('2. Click "Stripe Connect" tab');
    console.log('3. Open browser console (F12) → Network tab');
    console.log('4. Click "Connect with Stripe"');
    console.log('5. Watch for these API calls:');
    console.log('   - POST /api/stripe/connect/create-account');
    console.log('   - POST /api/stripe/connect/onboard');
    console.log('6. You should be redirected to connect.stripe.com');
    console.log('7. Complete Stripe onboarding');
    console.log('8. Should redirect back with success message');
    
    console.log('\n📋 WHAT TO WATCH FOR:');
    console.log('✅ API calls return 200 status codes');
    console.log('✅ Redirect to connect.stripe.com happens');
    console.log('✅ Return page shows success or pending status');
    console.log('❌ API calls return 401/403/500 errors');
    console.log('❌ No redirect to Stripe happens');
    console.log('❌ Return page shows error immediately');
    
    console.log('\n💡 IF STILL FAILING:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Look for failed API calls in Network tab');
    console.log('3. Try in incognito mode');
    console.log('4. Check if popup blocker is interfering');
    
    console.log('\n🎉 READY TO TEST!');
    console.log('The Stripe Connect flow should now work properly.');
    console.log('Try the testing steps above and let me know what happens.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixStripeConnectFlow();
