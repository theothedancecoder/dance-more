import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🎯 Creating Open week Trial Pass for lynex80@hotmail.com\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const userEmail = 'lynex80@hotmail.com';
const passName = 'Open week Trial Pass';
const purchaseDate = '2025-08-11';

async function createSubscription() {
  try {
    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email: userEmail }
    );

    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      return false;
    }

    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`);

    // Find pass by name and tenant
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && name match $passName && tenant._ref == $tenantId][0]`,
      { passName: passName + '*', tenantId: DANCECITY_TENANT_ID }
    );

    if (!pass) {
      console.log(`❌ Pass not found: ${passName}`);
      return false;
    }

    console.log(`✅ Found pass: ${pass.name} (${pass.type}) - ${pass.price} NOK`);

    // Check if subscription already exists
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && passId == $passId][0]`,
      { userId: user._id, passId: pass._id }
    );

    if (existingSubscription) {
      console.log(`✅ Subscription already exists: ${existingSubscription._id}`);
      return true;
    }

    // Calculate subscription details
    const startDate = new Date(purchaseDate);
    const endDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

    let subscriptionType;
    let remainingClips;

    switch (pass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = pass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = pass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        console.log(`❌ Invalid pass type: ${pass.type}`);
        return false;
    }

    // Create subscription
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: DANCECITY_TENANT_ID,
      },
      type: subscriptionType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: pass.price,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`📝 Creating subscription:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Pass: ${pass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`   Valid from: ${startDate.toLocaleDateString()}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);
    console.log(`   Price: ${pass.price} NOK`);

    const createdSubscription = await writeClient.create(subscriptionData);
    
    console.log(`\n🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.email} can now see their ${pass.name} in "Your Active Passes"`);
    console.log(`\n🔔 Tell Evelyn Faarlund to refresh her browser and check her account!`);

    return true;
  } catch (error) {
    console.log(`❌ Error creating subscription:`, error.message);
    return false;
  }
}

createSubscription();
