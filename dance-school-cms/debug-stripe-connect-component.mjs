import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function debugStripeConnectComponent() {
  try {
    console.log('🔍 Debugging StripeConnectSetup Component Issues...\n');
    
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
    
    console.log('🏫 Tenant Data for StripeConnectSetup:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.schoolName}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Contact Email: ${tenant.contactEmail}`);
    console.log(`   Stripe Connect: ${JSON.stringify(tenant.stripeConnect || {}, null, 2)}`);
    
    console.log('\n🎯 EXPECTED COMPONENT BEHAVIOR:');
    console.log('When you click "Stripe Connect" tab:');
    console.log('1. StripeConnectSetup component should load');
    console.log('2. Component calls /api/stripe/connect/status with x-tenant-id header');
    console.log('3. Since no Stripe account exists, should show "Connect with Stripe" button');
    console.log('4. Button click should trigger createAccount() function');
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Click "Stripe Connect" tab');
    console.log('2. Look for these elements:');
    console.log('   - "Stripe Connect" heading');
    console.log('   - "Accept payments directly to your account" subtitle');
    console.log('   - "Connect with Stripe" button (blue button)');
    console.log('3. If you see "Loading..." or spinning animation, wait for it to finish');
    console.log('4. If you see error messages, note them down');
    
    console.log('\n📋 WHAT TO LOOK FOR:');
    console.log('✅ Component loads and shows "Connect Your Stripe Account" section');
    console.log('✅ Blue "Connect with Stripe" button is visible');
    console.log('❌ Component shows loading spinner indefinitely');
    console.log('❌ Component shows error message');
    console.log('❌ Component is blank/empty');
    
    console.log('\n🚨 COMMON ISSUES:');
    console.log('1. TenantContext not providing tenant._id');
    console.log('2. API call to /api/stripe/connect/status failing');
    console.log('3. Component JavaScript error preventing render');
    console.log('4. CSS/styling hiding the button');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Try clicking "Stripe Connect" tab');
    console.log('2. Take a screenshot of what you see');
    console.log('3. Check browser console for any error messages');
    console.log('4. Look in Network tab for any failed API calls');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugStripeConnectComponent();
