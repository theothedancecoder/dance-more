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

console.log('🚨 EMERGENCY: Fixing existing missing subscriptions for Dancecity students...\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function createSubscriptionForUser(userEmail, passName, purchaseDate) {
  try {
    console.log(`\n🔍 Processing: ${userEmail} - ${passName}`);

    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email: userEmail }
    );

    if (!user) {
      console.log(`   ❌ User not found: ${userEmail}`);
      return false;
    }

    console.log(`   ✅ Found user: ${user.name} (${user._id})`);

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

async function main() {
  try {
    console.log('🏫 Checking Dancecity tenant...');
    
    // Verify tenant exists
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId][0]`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName}`);

    // Get all users for this tenant
    const users = await sanityClient.fetch(
      `*[_type == "user" && role == "student"] {
        _id, name, email, clerkId
      }`
    );

    console.log(`\n👥 Found ${users.length} student users in system`);

    // Get all passes for this tenant
    const passes = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log(`🎫 Found ${passes.length} passes for Dancecity:`);
    passes.forEach(pass => {
      console.log(`   - ${pass.name} (${pass.type}) - ${pass.price} NOK`);
    });

    console.log(`\n📋 MANUAL SUBSCRIPTION CREATION`);
    console.log(`Since we can't access the Stripe Connect transactions directly,`);
    console.log(`please provide the student details who are missing passes:`);
    console.log(`\nExample usage:`);
    console.log(`await createSubscriptionForUser('student@email.com', 'Pass Name', '2025-08-10');`);
    
    // Example - you can uncomment and modify these when you have the actual student data:
    /*
    let fixedCount = 0;
    
    // Add the actual student data here:
    const studentsToFix = [
      { email: 'student1@email.com', passName: 'Single Class', purchaseDate: '2025-08-10' },
      { email: 'student2@email.com', passName: '10 Class Pass', purchaseDate: '2025-08-09' },
      // ... add more students
    ];

    for (const student of studentsToFix) {
      const success = await createSubscriptionForUser(student.email, student.passName, student.purchaseDate);
      if (success) fixedCount++;
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Fixed: ${fixedCount} subscriptions`);
    console.log(`   ❌ Failed: ${studentsToFix.length - fixedCount} subscriptions`);
    */

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Export the function so it can be used manually
global.createSubscriptionForUser = createSubscriptionForUser;

main();
