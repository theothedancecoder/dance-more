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

async function fixKariCorrectPass() {
  try {
    console.log('🔍 Looking for Kari Sandvand\'s existing subscription...');
    
    // Find Kari's user
    const user = await client.fetch(`
      *[_type == "user" && name == "Kari Sandvand"][0] {
        _id,
        name,
        email
      }
    `);
    
    if (!user) {
      console.log('❌ Kari Sandvand user not found');
      return;
    }
    
    console.log('✅ Found user:', user);
    
    // Find her existing subscription
    const existingSubscription = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) [0] {
        _id,
        passName,
        type,
        purchasePrice
      }
    `, { userId: user._id });
    
    if (existingSubscription) {
      console.log('📋 Found existing subscription:', existingSubscription);
      
      // Delete the incorrect subscription
      console.log('🗑️ Deleting incorrect subscription...');
      await client.delete(existingSubscription._id);
      console.log('✅ Deleted incorrect subscription');
    }
    
    // Find the correct pass: "1 Course (8 weeks)"
    const correctPass = await client.fetch(`
      *[_type == "pass" && name == "1 Course (8 weeks)"][0] {
        _id,
        name,
        type,
        price,
        validityDays,
        tenant
      }
    `);
    
    if (!correctPass) {
      console.log('❌ "1 Course (8 weeks)" pass not found');
      return;
    }
    
    console.log('🎫 Found correct pass:', correctPass);
    
    // Create new subscription with correct pass
    const startDate = new Date();
    const endDate = new Date();
    // For course passes, set a longer validity period (8 weeks = 56 days)
    endDate.setDate(startDate.getDate() + 56);
    
    const newSubscription = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id
      },
      tenant: {
        _type: 'reference',
        _ref: correctPass.tenant._ref
      },
      passId: correctPass._id,
      passName: correctPass.name,
      type: correctPass.type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      purchasePrice: correctPass.price,
      remainingClips: correctPass.type === 'multi' ? 10 : null,
      stripePaymentId: 'manual_creation_kari_correct_pass',
      stripeSessionId: 'manual_session_kari_correct_pass',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating correct subscription:', newSubscription);
    
    const result = await client.create(newSubscription);
    
    console.log('🎉 SUCCESS! Created correct subscription:', result._id);
    console.log('✅ Kari Sandvand now has the correct "1 Course (8 weeks)" pass');
    console.log('💰 Price: 1290 NOK');
    console.log('📅 Valid for 8 weeks (56 days)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixKariCorrectPass();
