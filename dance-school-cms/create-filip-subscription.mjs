import { config } from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔧 Creating Filip\'s Missing Subscription');
console.log('=======================================');

async function createFilipSubscription() {
  try {
    // 1. Find Filip's user record
    console.log('\n👤 Looking for Filip...');
    let filip = await sanityClient.fetch(`
      *[_type == "user" && email == "fjmichalski@gmail.com"][0] {
        _id, name, email, clerkId, role, _createdAt
      }
    `);
    
    if (!filip) {
      console.log('❌ Filip not found, creating user...');
      filip = await sanityClient.create({
        _type: 'user',
        name: 'Filip Michalski',
        email: 'fjmichalski@gmail.com',
        role: 'student',
        clerkId: `manual_${Date.now()}`,
      });
      console.log('✅ Created Filip:', filip._id);
    } else {
      console.log('✅ Found Filip:', filip.name, '(' + filip.email + ')');
    }
    
    // 2. Find the pass for "1 Course (8 weeks)" with price 1290 NOK
    console.log('\n🎫 Looking for matching pass...');
    const passes = await sanityClient.fetch(`
      *[_type == "pass" && (
        name match "*Course*" || 
        name match "*8 weeks*" ||
        price == 1290
      )] {
        _id, name, type, price, validityDays, classesLimit, validityType, expiryDate, tenant->{_id, schoolName}
      }
    `);
    
    console.log(`Found ${passes.length} matching passes:`);
    for (const pass of passes) {
      console.log(`- ${pass.name} (${pass.type}) - ${pass.price} NOK - ${pass.tenant?.schoolName}`);
    }
    
    if (passes.length === 0) {
      console.log('❌ No matching pass found');
      return;
    }
    
    // Use the first matching pass or the one with exact price
    const selectedPass = passes.find(p => p.price === 1290) || passes[0];
    console.log(`🎯 Using pass: ${selectedPass.name}`);
    
    // 3. Check if subscription already exists
    console.log('\n🔍 Checking for existing subscription...');
    const existingSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId][0] {
        _id, passName, isActive, endDate
      }
    `, { userId: filip._id });
    
    if (existingSubscription) {
      console.log('✅ Subscription already exists:', existingSubscription._id);
      console.log('   Pass:', existingSubscription.passName);
      console.log('   Active:', existingSubscription.isActive);
      console.log('   Valid until:', new Date(existingSubscription.endDate).toLocaleDateString());
      return;
    }
    
    // 4. Create the subscription
    console.log('\n📝 Creating subscription...');
    const purchaseDate = new Date('2025-08-24T21:04:00'); // From transaction data
    
    // For 8-week course, calculate 8 weeks from purchase
    const endDate = new Date(purchaseDate.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);
    
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: filip._id,
      },
      tenant: {
        _type: 'reference',
        _ref: selectedPass.tenant._id,
      },
      type: 'single',
      startDate: purchaseDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips: 1,
      passId: selectedPass._id,
      passName: selectedPass.name,
      purchasePrice: 1290,
      stripePaymentId: 'ch_3RzjD2L8HTHT1SQN0', // Partial charge ID from transaction
      isActive: true,
    };
    
    console.log('📋 Subscription details:');
    console.log('   User:', filip.name);
    console.log('   Pass:', selectedPass.name);
    console.log('   Price: 1290 NOK');
    console.log('   Valid from:', purchaseDate.toLocaleDateString());
    console.log('   Valid until:', endDate.toLocaleDateString());
    console.log('   Tenant:', selectedPass.tenant?.schoolName);
    
    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log('\n🎉 SUCCESS! Created subscription:', createdSubscription._id);
    console.log('✅ Filip should now see his "1 Course (8 weeks)" pass in the app');
    console.log('✅ The pass will be valid until:', endDate.toLocaleDateString());
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFilipSubscription();
