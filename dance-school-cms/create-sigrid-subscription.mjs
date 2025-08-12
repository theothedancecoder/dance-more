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

async function createSigridSubscription() {
  try {
    console.log('🔍 Looking for Sigrid Ekman user...');
    
    // First, find the user by name or email
    const users = await client.fetch(`
      *[_type == "user" && (name match "*Sigrid*" || name match "*Ekman*" || email match "*sigrid*" || email match "*ekman*")] {
        _id,
        name,
        email,
        clerkId
      }
    `);
    
    console.log('👥 Found users:', users);
    
    if (users.length === 0) {
      console.log('❌ No user found with "Sigrid" or "Ekman" in name/email');
      console.log('💡 Please provide the exact email or clerkId for Sigrid Ekman');
      return;
    }
    
    const user = users[0];
    console.log('✅ Found user:', user);
    
    // Find the dancecity tenant
    const tenant = await client.fetch(`
      *[_type == "tenant" && schoolName == "Dancecity"][0] {
        _id,
        schoolName
      }
    `);
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant);
    
    // Find the correct pass: "10 Single Clip Card"
    const correctPass = await client.fetch(`
      *[_type == "pass" && name == "10 Single Clip Card" && tenant._ref == $tenantId][0] {
        _id,
        name,
        type,
        price,
        validityDays
      }
    `, { tenantId: tenant._id });
    
    if (!correctPass) {
      console.log('❌ "10 Single Clip Card" pass not found for Dancecity');
      return;
    }
    
    console.log('🎫 Found correct pass:', correctPass);
    
    // Create subscription with correct pass
    const startDate = new Date();
    const endDate = new Date();
    // For clip cards, set a reasonable validity period (6 months = 180 days)
    endDate.setDate(startDate.getDate() + 180);
    
    const subscription = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id
      },
      passId: correctPass._id,
      passName: correctPass.name,
      type: correctPass.type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      purchasePrice: correctPass.price,
      remainingClips: 10, // 10 clips for the clip card
      stripePaymentId: 'manual_creation_sigrid_ekman',
      stripeSessionId: 'manual_session_sigrid_ekman',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating subscription:', subscription);
    
    const result = await client.create(subscription);
    
    console.log('🎉 SUCCESS! Created subscription:', result._id);
    console.log('✅ Sigrid Ekman now has the "10 Single Clip Card" pass');
    console.log('💰 Price: 2000 NOK');
    console.log('🎟️ Clips: 10 remaining');
    console.log('📅 Valid for 6 months (180 days)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSigridSubscription();
