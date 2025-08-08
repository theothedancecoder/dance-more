import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function forceUpdateStripeStatus() {
  try {
    console.log('🔄 Force updating Stripe Connect status display...');
    
    // Get the tenant
    const tenant = await writeClient.fetch(
      `*[_type == "tenant" && slug.current == "dance-with-dancecity"][0] {
        _id,
        schoolName,
        stripeConnect
      }`
    );
    
    if (!tenant) {
      console.error('❌ Tenant not found');
      return;
    }
    
    console.log('📋 Current tenant data:', JSON.stringify(tenant, null, 2));
    
    // Force update the status to ensure frontend displays correctly
    const updateData = {
      'stripeConnect.lastSyncAt': new Date().toISOString(),
      'stripeConnect.accountStatus': 'active',
      'stripeConnect.chargesEnabled': true,
      'stripeConnect.payoutsEnabled': true,
      'stripeConnect.onboardingCompleted': true,
      'stripeConnect.country': 'NO',
      'stripeConnect.email': 'dancewithdancecity@gmail.com',
      'stripeConnect.businessType': 'individual',
      'stripeConnect.currency': 'nok',
      'stripeConnect.detailsSubmitted': true,
    };
    
    console.log('📝 Updating tenant with forced status...');
    
    await writeClient
      .patch(tenant._id)
      .set(updateData)
      .commit();
    
    console.log('✅ Stripe Connect status forcefully updated!');
    console.log('📊 Updated status:', updateData);
    
    // Verify the update
    const updatedTenant = await writeClient.fetch(
      `*[_type == "tenant" && _id == $tenantId][0] {
        _id,
        schoolName,
        stripeConnect
      }`,
      { tenantId: tenant._id }
    );
    
    console.log('🔍 Verification - Updated tenant data:', JSON.stringify(updatedTenant, null, 2));
    
  } catch (error) {
    console.error('❌ Error updating Stripe status:', error);
  }
}

forceUpdateStripeStatus();
