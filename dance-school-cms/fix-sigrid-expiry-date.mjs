import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function fixSigridExpiryDate() {
  try {
    console.log('🔍 Looking for Sigrid Ekman\'s subscription...');
    
    // Find Sigrid's user
    const user = await client.fetch(`
      *[_type == "user" && name == "Sigrid Ekman"][0] {
        _id,
        name,
        email
      }
    `);
    
    if (!user) {
      console.log('❌ Sigrid Ekman user not found');
      return;
    }
    
    console.log('✅ Found user:', user);
    
    // Find her existing subscription
    const existingSubscription = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId && passName == "10 Single Clip Card"] | order(_createdAt desc) [0] {
        _id,
        passName,
        type,
        purchasePrice,
        endDate,
        remainingClips
      }
    `, { userId: user._id });
    
    if (!existingSubscription) {
      console.log('❌ No "10 Single Clip Card" subscription found for Sigrid');
      return;
    }
    
    console.log('📋 Found existing subscription:', existingSubscription);
    
    // Set the correct expiry date: 3/10/2025 (March 10, 2025)
    const correctEndDate = new Date('2025-03-10T23:59:59.999Z');
    
    console.log('📅 Updating expiry date to:', correctEndDate.toISOString());
    
    // Update the subscription with the correct end date
    const result = await client
      .patch(existingSubscription._id)
      .set({
        endDate: correctEndDate.toISOString(),
        updatedAt: new Date().toISOString()
      })
      .commit();
    
    console.log('🎉 SUCCESS! Updated subscription:', result._id);
    console.log('✅ Sigrid Ekman\'s "10 Single Clip Card" now expires on March 10, 2025');
    console.log('💰 Price: 2000 NOK');
    console.log('🎟️ Clips: 10 remaining');
    console.log('📅 Correct expiry: March 10, 2025');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixSigridExpiryDate();
