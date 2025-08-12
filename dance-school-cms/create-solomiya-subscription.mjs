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

async function createSolomiyaSubscription() {
  try {
    console.log('🔍 Looking for Соломія Мерв\'як (Solomiya) user...');
    
    // First, find the user by name or email - search for various spellings
    const users = await client.fetch(`
      *[_type == "user" && (
        name match "*Соломія*" || 
        name match "*Solomiya*" || 
        name match "*Мерв'як*" || 
        name match "*Mervyak*" ||
        email match "*solomiya*" || 
        email match "*mervyak*"
      )] {
        _id,
        name,
        email,
        clerkId
      }
    `);
    
    console.log('👥 Found users:', users);
    
    if (users.length === 0) {
      console.log('❌ No user found with "Соломія", "Solomiya", "Мерв\'як", or "Mervyak" in name/email');
      console.log('💡 Please provide the exact email or clerkId for Соломія Мерв\'як');
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
    
    // Find the correct pass: "Open week Trial Pass"
    const correctPass = await client.fetch(`
      *[_type == "pass" && name == "Open week Trial Pass" && tenant._ref == $tenantId][0] {
        _id,
        name,
        type,
        price,
        validityDays
      }
    `, { tenantId: tenant._id });
    
    if (!correctPass) {
      console.log('❌ "Open week Trial Pass" pass not found for Dancecity');
      return;
    }
    
    console.log('🎫 Found correct pass:', correctPass);
    
    // Create subscription with correct pass
    const startDate = new Date();
    const endDate = new Date();
    // For trial passes, set a short validity period (1 week = 7 days)
    endDate.setDate(startDate.getDate() + 7);
    
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
      remainingClips: correctPass.type === 'multi' ? 10 : null, // Trial passes are usually multi-use
      stripePaymentId: 'manual_creation_solomiya_mervyak',
      stripeSessionId: 'manual_session_solomiya_mervyak',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating subscription:', subscription);
    
    const result = await client.create(subscription);
    
    console.log('🎉 SUCCESS! Created subscription:', result._id);
    console.log('✅ Соломія Мерв\'як now has the "Open week Trial Pass"');
    console.log('💰 Price: 250 NOK');
    console.log('📅 Valid for 1 week (7 days)');
    console.log('🎟️ Trial pass for open week');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSolomiyaSubscription();
