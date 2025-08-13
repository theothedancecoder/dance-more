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

console.log('🔍 Checking ALL DanceCity Users and Their Active Passes');
console.log('======================================================\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function checkAllUsers() {
  try {
    // Get all users for DanceCity tenant
    const users = await sanityClient.fetch(
      `*[_type == "user" && tenant._ref == $tenantId] {
        _id, name, email, clerkId, role, _createdAt
      } | order(_createdAt desc)`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log(`👥 Total DanceCity Users: ${users.length}\n`);

    let totalActiveSubscriptions = 0;
    let usersWithActivePasses = 0;

    for (const user of users) {
      console.log(`👤 ${user.name || 'No Name'} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Joined: ${new Date(user._createdAt).toLocaleDateString()}`);

      // Get all subscriptions for this user
      const subscriptions = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId] {
          _id, passName, type, startDate, endDate, remainingClips, isActive, purchasePrice, _createdAt
        } | order(_createdAt desc)`,
        { userId: user._id, tenantId: DANCECITY_TENANT_ID }
      );

      if (subscriptions.length === 0) {
        console.log('   📋 ❌ NO SUBSCRIPTIONS FOUND');
      } else {
        const activeSubscriptions = subscriptions.filter(sub => {
          const isActive = sub.isActive && new Date(sub.endDate) > new Date();
          return isActive;
        });

        if (activeSubscriptions.length > 0) {
          usersWithActivePasses++;
          totalActiveSubscriptions += activeSubscriptions.length;
          console.log(`   📋 ✅ ${activeSubscriptions.length} ACTIVE PASS(ES):`);
          
          activeSubscriptions.forEach((sub, index) => {
            console.log(`      ${index + 1}. ${sub.passName}`);
            console.log(`         Type: ${sub.type}`);
            console.log(`         Valid until: ${new Date(sub.endDate).toLocaleDateString()}`);
            console.log(`         Remaining: ${sub.remainingClips || 'Unlimited'} classes`);
            console.log(`         Price: ${sub.purchasePrice} NOK`);
            console.log(`         Purchased: ${new Date(sub._createdAt).toLocaleDateString()}`);
          });
        } else {
          console.log(`   📋 ⚠️  ${subscriptions.length} subscription(s) but NONE ACTIVE`);
          subscriptions.forEach((sub, index) => {
            const expired = new Date(sub.endDate) <= new Date();
            const reason = expired ? 'EXPIRED' : 'INACTIVE';
            console.log(`      ${index + 1}. ${sub.passName} - ${reason}`);
            console.log(`         Expired: ${new Date(sub.endDate).toLocaleDateString()}`);
          });
        }
      }
      console.log('');
    }

    console.log('📊 SUMMARY');
    console.log('==========');
    console.log(`Total Users: ${users.length}`);
    console.log(`Users with Active Passes: ${usersWithActivePasses}`);
    console.log(`Total Active Subscriptions: ${totalActiveSubscriptions}`);
    console.log(`Users WITHOUT Active Passes: ${users.length - usersWithActivePasses}`);

    if (usersWithActivePasses < users.length) {
      console.log(`\n⚠️  ${users.length - usersWithActivePasses} users don't have active passes!`);
    } else {
      console.log(`\n✅ All users have active passes!`);
    }

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

checkAllUsers();
