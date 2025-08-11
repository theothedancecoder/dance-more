import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🔍 Checking user: trinemeretheryen@outlook.com\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const userEmail = 'trinemeretheryen@outlook.com';

async function checkUser() {
  try {
    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found in database');
      console.log('This means they need to sign up first before we can create a subscription');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);

    // Check for existing subscriptions
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, remainingClips, isActive
      }`,
      { userId: user._id }
    );

    console.log(`\n📋 Existing subscriptions: ${subscriptions.length}`);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} (${sub.type}) - Active: ${sub.isActive}`);
      console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
      console.log(`      Remaining: ${sub.remainingClips || 'Unlimited'}`);
    });

    // Get available passes for Dancecity
    const passes = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log(`\n🎫 Available passes for Dancecity:`);
    passes.forEach((pass, index) => {
      console.log(`   ${index + 1}. ${pass.name} (${pass.type}) - ${pass.price} NOK`);
    });

    console.log(`\n💡 To create a subscription for this user, run:`);
    console.log(`await createSubscriptionForUser('${userEmail}', 'Pass Name', '2025-08-11');`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Function to create subscription
async function createSubscriptionForUser(userEmail, passName, purchaseDate) {
  try {
    console.log(`\n🔍 Creating subscription for: ${userEmail} - ${passName}`);

    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email: userEmail }
    );

    if (!user) {
      console.log(`   ❌ User not found: ${userEmail}`);
      return false;
    }

    // Find pass by name and tenant
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && name match $passName && tenant._ref == $tenantId][0]`,
      { passName: passName + '*', tenantId: DANCECITY_TENANT_ID }
    );

    if (!pass) {
      console.log(`   ❌ Pass not found: ${passName}`);
      return false;
    }

    console.log(`   ✅ Found pass: ${pass.name} (${pass.type})`);

    // Check if subscription already exists
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && passId == $passId][0]`,
      { userId: user._id, passId: pass._id }
    );

    if (existingSubscription) {
      console.log(`   ✅ Subscription already exists: ${existingSubscription._id}`);
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
        console.log(`   ❌ Invalid pass type: ${pass.type}`);
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

    console.log(`   📝 Creating subscription for ${user.name}:`);
    console.log(`      Pass: ${pass.name} (${subscriptionType})`);
    console.log(`      Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`      Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await writeClient.create(subscriptionData);
    console.log(`   🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
    console.log(`   ✅ ${user.name} can now see their ${pass.name} pass in "Your Active Passes"`);

    return true;
  } catch (error) {
    console.log(`   ❌ Error creating subscription:`, error.message);
    return false;
  }
}

// Export the function so it can be used manually
global.createSubscriptionForUser = createSubscriptionForUser;

checkUser();
