import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function checkDancecityStripe() {
  try {
    console.log('🔍 Checking Stripe Connect for Dancecity tenant...\n');
    
    const tenant = await client.fetch('*[_type == "tenant" && slug.current == "dancecity"][0]{_id, schoolName, stripeConnect}');
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('🏫 Dancecity tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.schoolName}`);
    console.log(`   Stripe Connect: ${JSON.stringify(tenant.stripeConnect || {}, null, 2)}`);
    
    if (!tenant.stripeConnect?.accountId) {
      console.log('\n❌ No Stripe Connect account found for Dancecity');
      console.log('This is why the Stripe Connect button redirects immediately back.');
      console.log('The system needs to create a Stripe Connect account first.');
      
      console.log('\n🔧 SOLUTION:');
      console.log('1. The Stripe Connect flow should first call /api/stripe/connect/create-account');
      console.log('2. Then call /api/stripe/connect/onboard to get the onboarding URL');
      console.log('3. The frontend might be skipping step 1');
      
    } else {
      console.log('\n✅ Stripe Connect account exists');
      console.log(`   Account ID: ${tenant.stripeConnect.accountId}`);
      console.log(`   Status: ${tenant.stripeConnect.accountStatus || 'unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDancecityStripe();
