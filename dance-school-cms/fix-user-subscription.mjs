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

async function fixUserSubscription() {
  console.log('🔧 Fixing subscription for kruczku@pm.me - replacing Drop-in Class with Open week Trial Pass...\n');

  try {
    // 1. Get the tenant and user
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0] {
        _id,
        schoolName
      }
    `);

    const user = await sanityClient.fetch(`
      *[_type == "user" && email == "kruczku@pm.me"][0] {
        _id,
        name,
        email
      }
    `);

    if (!tenant || !user) {
      console.error('❌ Tenant or user not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName}`);
    console.log(`✅ Found user: ${user.email}`);

    // 2. Find the incorrect subscription we just created
    const incorrectSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId && passName == "Drop-in Class"][0] {
        _id,
        passName,
        type,
        _createdAt
      }
    `, { userId: user._id, tenantId: tenant._id });

    if (incorrectSubscription) {
      console.log(`🗑️ Found incorrect subscription to remove: ${incorrectSubscription._id} (${incorrectSubscription.passName})`);
      
      // Delete the incorrect subscription
      await sanityClient.delete(incorrectSubscription._id);
      console.log(`✅ Deleted incorrect subscription`);
    }

    // 3. Get the correct pass (Open week Trial Pass)
    const correctPass = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && name == "Open week Trial Pass"][0] {
        _id,
        name,
        type,
        price,
        validityDays,
        classesLimit
      }
    `, { tenantId: tenant._id });

    if (!correctPass) {
      console.error('❌ Open week Trial Pass not found');
      return;
    }

    console.log(`✅ Found correct pass: ${correctPass.name} (${correctPass.type})`);
    console.log(`   Price: ${correctPass.price} NOK`);
    console.log(`   Classes: ${correctPass.classesLimit}`);
    console.log(`   Valid for: ${correctPass.validityDays || 'Not specified'} days`);

    // 4. Create the correct subscription
    const now = new Date();
    // Since validityDays is null, let's assume a reasonable period for trial pass (e.g., 30 days)
    const validityDays = correctPass.validityDays || 30;
    const endDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    let subscriptionType;
    let remainingClips;

    switch (correctPass.type) {
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = correctPass.classesLimit;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = correctPass.classesLimit;
        break;
      default:
        subscriptionType = 'clipcard'; // Default for multi-class passes
        remainingClips = correctPass.classesLimit;
        break;
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
      passId: correctPass._id,
      passName: correctPass.name,
      purchasePrice: correctPass.price,
      stripePaymentId: 'manual_correction_' + Date.now(),
      stripeSessionId: 'manual_correction_session_' + Date.now(),
      isActive: true,
    };

    console.log(`📝 Creating correct subscription:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Pass: ${correctPass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await sanityClient.create(subscriptionData);
    
    console.log(`\n🎉 SUCCESS! Created correct subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.email} now has their ${correctPass.name} with ${remainingClips} classes`);

    console.log(`\n📱 IMMEDIATE ACTION REQUIRED:`);
    console.log(`1. Contact the student (kruczku@pm.me) and ask them to:`);
    console.log(`   - Refresh their browser`);
    console.log(`   - Check their subscriptions/passes page`);
    console.log(`   - They should now see "Open week Trial Pass" with 10 classes`);
    console.log(`2. Apologize for the initial confusion`);
    console.log(`3. Confirm they can now book classes with their trial pass`);

  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the script
fixUserSubscription();
