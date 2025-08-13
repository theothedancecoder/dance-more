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

async function fixSolomiyaWebhook() {
  try {
    console.log('🔍 FIXING SOLOMIYA\'S SPECIFIC WEBHOOK ISSUE');
    console.log('===============================================');
    
    // First, clean up any duplicate/test subscriptions
    console.log('🧹 Step 1: Cleaning up duplicate subscriptions...');
    
    const user = await client.fetch(`
      *[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId
      }
    `);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:', user.name, user.email);
    
    // Get all subscriptions for this user
    const allSubscriptions = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id, passName, stripePaymentId, stripeSessionId, createdAt, isActive
      }
    `, { userId: user._id });
    
    console.log(`📋 Found ${allSubscriptions.length} existing subscriptions:`);
    allSubscriptions.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName} - ${sub.stripePaymentId} - ${sub.createdAt}`);
    });
    
    // Delete manual/test subscriptions (those with manual_creation or manual_session)
    const manualSubs = allSubscriptions.filter(sub => 
      sub.stripePaymentId?.includes('manual_') || 
      sub.stripeSessionId?.includes('manual_')
    );
    
    console.log(`🗑️ Deleting ${manualSubs.length} manual/test subscriptions...`);
    for (const sub of manualSubs) {
      await client.delete(sub._id);
      console.log(`   ✅ Deleted: ${sub.passName} (${sub._id})`);
    }
    
    // Now create the proper subscription for her actual Stripe purchase
    console.log('🎫 Step 2: Creating proper subscription for actual purchase...');
    
    // Find the dancecity tenant
    const tenant = await client.fetch(`
      *[_type == "tenant" && schoolName == "Dancecity"][0] {
        _id, schoolName
      }
    `);
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    // Find the correct pass (250 NOK purchase)
    const pass = await client.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && price == 250][0] {
        _id, name, type, price, validityDays, classesLimit
      }
    `, { tenantId: tenant._id });
    
    if (!pass) {
      console.log('❌ 250 NOK pass not found');
      return;
    }
    
    console.log('✅ Found pass:', pass.name, pass.price, 'NOK');
    
    // Create the proper subscription based on her actual Stripe purchase
    const purchaseDate = new Date('2025-08-11T17:30:20Z'); // From Stripe data
    const endDate = new Date(purchaseDate.getTime() + (pass.validityDays || 7) * 24 * 60 * 60 * 1000);
    
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
      type: pass.type === 'multi' ? 'clipcard' : pass.type,
      startDate: purchaseDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      purchasePrice: 250,
      remainingClips: pass.type === 'multi' ? (pass.classesLimit || 10) : (pass.type === 'single' ? 1 : null),
      stripePaymentId: 'ch_3RuxfzL8HTHT1SQN1dOQxrhg', // From her actual Stripe charge
      stripeSessionId: 'cs_live_solomiya_actual_purchase', // Placeholder for actual session
      createdAt: purchaseDate.toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Creating subscription:', {
      pass: subscription.passName,
      price: subscription.purchasePrice,
      type: subscription.type,
      classes: subscription.remainingClips || 'Unlimited',
      validUntil: endDate.toLocaleDateString()
    });
    
    const result = await client.create(subscription);
    
    console.log('🎉 SUCCESS!');
    console.log('✅ Created proper subscription:', result._id);
    console.log('✅ Solomiya should now see her pass in the app');
    console.log(`💰 Pass: ${pass.name} (${pass.price} NOK)`);
    console.log(`🎟️ Classes: ${subscription.remainingClips || 'Unlimited'}`);
    console.log(`📅 Valid until: ${endDate.toLocaleDateString()}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixSolomiyaWebhook();
