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

async function createIdaSubscription() {
  try {
    console.log('🔍 Looking for Ida Gustavsson user...');
    
    // First, find the user by name or email
    const users = await client.fetch(`
      *[_type == "user" && (name match "*Ida*" || name match "*Gustavsson*" || email match "*ida*" || email match "*gustavsson*")] {
        _id,
        name,
        email,
        clerkId
      }
    `);
    
    console.log('👥 Found users:', users);
    
    if (users.length === 0) {
      console.log('❌ No user found with "Ida" or "Gustavsson" in name/email');
      console.log('💡 Please provide the exact email or clerkId for Ida Gustavsson');
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
    
    // Find the correct pass: "1 Course (8 weeks)"
    const correctPass = await client.fetch(`
      *[_type == "pass" && name == "1 Course (8 weeks)" && tenant._ref == $tenantId][0] {
        _id,
        name,
        type,
        price,
        validityDays
      }
    `, { tenantId: tenant._id });
    
    if (!correctPass) {
      console.log('❌ "1 Course (8 weeks)" pass not found for Dancecity');
      return;
    }
    
    console.log('🎫 Found correct pass:', correctPass);
    
    // Create subscription with correct pass
    const startDate = new Date();
    const endDate = new Date();
    // For course passes, set a longer validity period (8 weeks = 56 days)
    endDate.setDate(startDate.getDate() + 56);
    
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
      remainingClips: correctPass.type === 'multi' ? 10 : null,
      stripePaymentId: 'manual_creation_ida_gustavsson',
      stripeSessionId: 'manual_session_ida_gustavsson',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating subscription:', subscription);
    
    const result = await client.create(subscription);
    
    console.log('🎉 SUCCESS! Created subscription:', result._id);
    console.log('✅ Ida Gustavsson now has the "1 Course (8 weeks)" pass');
    console.log('💰 Price: 1290 NOK');
    console.log('📅 Valid for 8 weeks (56 days)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createIdaSubscription();
