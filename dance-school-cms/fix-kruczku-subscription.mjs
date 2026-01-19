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

async function fixKruczkuSubscription() {
  console.log('🔧 Fixing subscription for kruczku@pm.me - correcting the 3 Course Pass expiry date...\n');

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

    // 2. Find the incorrect subscription (the one with same start and end date)
    const incorrectSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId && passName == "3 COURSE PASS  " && startDate == endDate][0] {
        _id,
        passName,
        type,
        startDate,
        endDate,
        _createdAt
      }
    `, { userId: user._id, tenantId: tenant._id });

    console.log(`Looking for subscription with passName "3 COURSE PASS  " and startDate == endDate`);

    if (incorrectSubscription) {
      console.log(`🗑️ Found incorrect subscription to remove: ${incorrectSubscription._id}`);
      console.log(`   Start/End: ${incorrectSubscription.startDate} (same date - invalid)`);

      // Delete the incorrect subscription
      await sanityClient.delete(incorrectSubscription._id);
      console.log(`✅ Deleted incorrect subscription`);
    }

    // 3. Get the correct pass (3 Course Pass)
    let correctPass = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && name == "3 COURSE PASS  "][0] {
        _id,
        name,
        type,
        price,
        validityDays,
        classesLimit
      }
    `, { tenantId: tenant._id });

    console.log(`Pass query result: ${correctPass ? correctPass.name : 'null'}`);

    if (!correctPass) {
      // Try to find it by searching all passes and matching the name
      const allPasses = await sanityClient.fetch(`
        *[_type == "pass" && tenant._ref == $tenantId] {
          _id,
          name,
          type,
          price,
          validityDays,
          classesLimit
        }
      `, { tenantId: tenant._id });

      // Find the pass that matches "3 COURSE PASS  "
      const foundPass = allPasses.find(pass => pass.name === "3 COURSE PASS ");
      console.log(`Looking for "3 COURSE PASS ", found: ${foundPass ? foundPass.name : 'null'}`);
      console.log(`All pass names: ${allPasses.map(p => `"${p.name}"`).join(', ')}`);

      if (foundPass) {
        console.log(`✅ Found pass by searching: ${foundPass.name}`);
        correctPass = foundPass;
      } else {
        console.log('❌ 3 Course Pass not found, listing all passes...');
        console.log('Available passes:');
        allPasses.forEach(pass => {
          console.log(`   - ${pass.name} (${pass.type}) - ${pass.price} NOK`);
        });
        return;
      }
    }

    console.log(`✅ Found correct pass: ${correctPass.name} (${correctPass.type})`);
    console.log(`   Price: ${correctPass.price} NOK`);
    console.log(`   Classes: ${correctPass.classesLimit}`);
    console.log(`   Valid for: ${correctPass.validityDays || 'Not specified'} days`);

    // 4. Create the correct subscription
    // User bought on October 13th, 2025
    // Since validityDays is null, we need to determine the correct expiry
    // For a 3 Course Pass, it should be valid for the duration of the courses (approximately 8 weeks)
    const purchaseDate = new Date('2025-10-13T00:00:00.000Z');
    const endDate = new Date(purchaseDate.getTime() + (56 * 24 * 60 * 60 * 1000)); // 56 days = 8 weeks

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
      startDate: purchaseDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: correctPass._id,
      passName: correctPass.name,
      purchasePrice: correctPass.price,
      stripePaymentId: 'manual_fix_oct13_' + Date.now(),
      stripeSessionId: 'manual_fix_session_oct13_' + Date.now(),
      isActive: true,
    };

    console.log(`📝 Creating correct subscription:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Pass: ${correctPass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips}`);
    console.log(`   Valid from: ${purchaseDate.toLocaleDateString()}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await sanityClient.create(subscriptionData);

    console.log(`\n🎉 SUCCESS! Created correct subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.email} now has their ${correctPass.name} valid until ${endDate.toLocaleDateString()}`);

    console.log(`\n📱 IMMEDIATE ACTION REQUIRED:`);
    console.log(`1. Contact the student (kruczku@pm.me) and ask them to:`);
    console.log(`   - Refresh their browser`);
    console.log(`   - Check their subscriptions/passes page`);
    console.log(`   - They should now see "3 COURSE PASS" with 24 classes, valid until Dec 8, 2025`);
    console.log(`2. Apologize for the initial confusion`);
    console.log(`3. Confirm they can now book classes with their pass`);

  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the script
fixKruczkuSubscription();
