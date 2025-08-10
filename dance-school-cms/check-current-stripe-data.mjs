import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function checkCurrentStripeData() {
  try {
    console.log('🔍 Checking Current Stripe Connect Data...\n');
    
    const tenant = await client.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0]{
        _id, 
        schoolName, 
        "slug": slug.current,
        stripeConnect
      }
    `);
    
    console.log('🏫 Tenant:', tenant.schoolName);
    console.log('📊 Stripe Connect Data:');
    console.log(JSON.stringify(tenant.stripeConnect || {}, null, 2));
    
    if (tenant.stripeConnect && Object.keys(tenant.stripeConnect).length > 0) {
      console.log('\n🚨 FOUND EXISTING STRIPE CONNECT DATA!');
      console.log('This explains the immediate redirect behavior.');
      console.log('The system thinks Stripe Connect is already set up.');
      
      if (tenant.stripeConnect.accountId) {
        console.log('\n✅ Account ID exists:', tenant.stripeConnect.accountId);
        console.log('Status:', tenant.stripeConnect.accountStatus || 'unknown');
        console.log('Onboarding completed:', tenant.stripeConnect.onboardingCompleted || false);
      }
      
      console.log('\n🔧 SOLUTION:');
      console.log('The StripeConnectSetup component is detecting existing data');
      console.log('and showing the "already connected" view instead of the setup view.');
      console.log('This is why you don\'t see the "Connect with Stripe" button.');
      
    } else {
      console.log('\n✅ No Stripe Connect data found.');
      console.log('The issue must be elsewhere in the component loading.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentStripeData();
