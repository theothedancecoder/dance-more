import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function createSubscriptionForUser() {
  console.log('🎫 Creating Subscription for kruczku@pm.me at dancecity...\n');

  try {
    // 1. Get the tenant
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0] {
        _id,
        schoolName
      }
    `);

    if (!tenant) {
      console.error('❌ Tenant "dancecity" not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName} (${tenant._id})`);

    // 2. Get the user
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == "kruczku@pm.me"][0] {
        _id,
        name,
        email
      }
    `);

    if (!user) {
      console.error('❌ User with email "kruczku@pm.me" not found');
      return;
    }

    console.log(`✅ Found user: ${user.name || 'Unnamed'} (${user._id})`);

    // 3. Get available passes for this tenant
    const passes = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && isActive == true] {
        _id,
        name,
        type,
        price,
        validityDays,
        classesLimit
      }
    `, { tenantId: tenant._id });

    if (passes.length === 0) {
      console.error('❌ No active passes found for this tenant');
      return;
    }

    console.log(`\n📋 Available passes for ${tenant.schoolName}:`);
    passes.forEach((pass, index) => {
      console.log(`   ${index + 1}. ${pass.name} (${pass.type}) - ${pass.price} NOK`);
      console.log(`      Valid for: ${pass.validityDays} days`);
      if (pass.classesLimit) {
        console.log(`      Classes: ${pass.classesLimit}`);
      }
    });

    // For now, let's assume they bought the most common pass (single class)
    // In a real scenario, you'd want to specify which pass they bought
    const selectedPass = passes.find(p => p.type === 'single') || passes[0];
    
    console.log(`\n🎯 Creating subscription for: ${selectedPass.name}`);

    // 4. Check if user already has an active subscription for this pass
    const existingSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId && isActive == true && endDate > now()][0]
    `, { userId: user._id, tenantId: tenant._id });

    if (existingSubscription) {
      console.log(`⚠️ User already has an active subscription: ${existingSubscription.passName}`);
      console.log(`   Valid until: ${existingSubscription.endDate}`);
      console.log(`   Remaining classes: ${existingSubscription.remainingClips || 'Unlimited'}`);
      return;
    }

    // 5. Create the subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + selectedPass.validityDays * 24 * 60 * 60 * 1000);

    let subscriptionType;
    let remainingClips;

    switch (selectedPass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = selectedPass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = selectedPass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        console.error('❌ Invalid pass type:', selectedPass.type);
        return;
    }

    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id,
      },
      type: subscriptionType,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: selectedPass._id,
      passName: selectedPass.name,
      purchasePrice: selectedPass.price,
      stripePaymentId: 'manual_creation_' + Date.now(), // Placeholder
      stripeSessionId: 'manual_session_' + Date.now(), // Placeholder
      isActive: true,
    };

    console.log(`📝 Creating subscription:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Pass: ${selectedPass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await sanityClient.create(subscriptionData);
    
    console.log(`\n🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.email} can now see their ${selectedPass.name} pass in "Your Active Passes"`);

    console.log(`\n📱 NEXT STEPS:`);
    console.log(`1. Ask the student to refresh their browser and check their subscriptions page`);
    console.log(`2. The pass should now appear in their "Active Passes" section`);
    console.log(`3. If this was a manual fix, investigate why the webhook didn't work originally`);

  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the script
createSubscriptionForUser();
