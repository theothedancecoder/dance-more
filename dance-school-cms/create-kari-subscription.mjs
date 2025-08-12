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

async function createKariSubscription() {
  try {
    console.log('🔍 Looking for Kari Sandvand user...');
    
    // First, find the user by name or email
    const users = await client.fetch(`
      *[_type == "user" && (name match "*Kari*" || name match "*Sandvand*" || email match "*kari*" || email match "*sandvand*")] {
        _id,
        name,
        email,
        clerkId
      }
    `);
    
    console.log('👥 Found users:', users);
    
    if (users.length === 0) {
      console.log('❌ No user found with "Kari" or "Sandvand" in name/email');
      console.log('💡 Please provide the exact email or clerkId for Kari Sandvand');
      return;
    }
    
    const user = users[0];
    console.log('✅ Found user:', user);
    
    // Find the dancecity tenant (try multiple approaches)
    let tenant = await client.fetch(`
      *[_type == "tenant" && schoolName == "Dancecity"][0] {
        _id,
        schoolName
      }
    `);
    
    if (!tenant) {
      // Try "DANCE WITH DANCECITY" as backup
      tenant = await client.fetch(`
        *[_type == "tenant" && schoolName == "DANCE WITH DANCECITY"][0] {
          _id,
          schoolName
        }
      `);
    }
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant);
    
    // Find an active pass for this tenant
    const passes = await client.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && isActive == true] {
        _id,
        name,
        type,
        price,
        validityDays
      }
    `, { tenantId: tenant._id });
    
    console.log('📋 Available passes:', passes);
    
    if (passes.length === 0) {
      console.log('❌ No active passes found for dancecity');
      return;
    }
    
    // Use the first available pass
    const pass = passes[0];
    console.log('🎫 Using pass:', pass);
    
    // Create subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (pass.validityDays || 30));
    
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
      passId: pass._id,
      passName: pass.name,
      type: pass.type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      purchasePrice: pass.price,
      remainingClips: pass.type === 'multi' ? 10 : null,
      stripePaymentId: 'manual_creation_kari_sandvand',
      stripeSessionId: 'manual_session_kari_sandvand',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating subscription:', subscription);
    
    const result = await client.create(subscription);
    
    console.log('🎉 SUCCESS! Created subscription:', result._id);
    console.log('✅ Kari Sandvand should now see their pass in their account');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createKariSubscription();
