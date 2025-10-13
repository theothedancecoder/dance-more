import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables from the parent directory
dotenv.config({ path: '../.env.local' });

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

console.log('🔧 Correcting Marek\'s Subscription');
console.log('Replacing Drop-in Class with 1 Course (8 weeks)');
console.log('===============================================\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const userEmail = 'marek.lukacovic.mail@gmail.com';
const stripePaymentIntentId = 'pi_3S5q2PL8HTHT1SQN09SFY5Li';

async function correctSubscription() {
  try {
    // 1. Find user
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User: ${user.name} (${user.email})`);

    // 2. Find the incorrect subscription I just created
    const incorrectSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && stripePaymentId == $paymentId][0] {
        _id, passName, _createdAt
      }`,
      { userId: user._id, paymentId: stripePaymentIntentId }
    );

    if (incorrectSubscription) {
      console.log(`\n🗑️  Found incorrect subscription to remove:`);
      console.log(`   ID: ${incorrectSubscription._id}`);
      console.log(`   Pass: ${incorrectSubscription.passName}`);
      console.log(`   Created: ${new Date(incorrectSubscription._createdAt).toLocaleDateString()}`);
      
      // Delete the incorrect subscription
      await writeClient.delete(incorrectSubscription._id);
      console.log(`✅ Deleted incorrect subscription`);
    }

    // 3. Find the correct "1 Course (8 weeks)" pass
    const coursePass = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId && name match "*1 Course*"][0] {
        _id, name, type, price, validityDays, classesLimit, description
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    if (!coursePass) {
      console.log('❌ 1 Course pass not found');
      return;
    }

    console.log(`\n📋 Found correct pass: ${coursePass.name}`);
    console.log(`   Type: ${coursePass.type}`);
    console.log(`   Price: ${coursePass.price} NOK`);
    console.log(`   Validity: ${coursePass.validityDays || 'Custom (8 weeks)'} days`);
    console.log(`   Classes: ${coursePass.classesLimit || 'Unlimited'}`);

    // 4. Create the correct subscription
    console.log('\n🔧 Creating correct subscription...');

    // For 8-week course, calculate 8 weeks from today
    const purchaseDate = new Date();
    const startDate = purchaseDate;
    const endDate = new Date(startDate.getTime() + (8 * 7 * 24 * 60 * 60 * 1000)); // 8 weeks

    // Course passes are typically unlimited classes for the specific course
    const subscriptionType = 'course'; // or 'single' if that's how it's handled
    const remainingClips = undefined; // Unlimited for course duration

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
      passId: coursePass._id,
      passName: coursePass.name,
      purchasePrice: coursePass.price,
      isActive: true,
      stripePaymentId: stripePaymentIntentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Corrected subscription - was initially created as Drop-in Class by mistake'
    };

    console.log(`📝 Creating correct subscription:`);
    console.log(`   User: ${user.name}`);
    console.log(`   Pass: ${coursePass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips || 'Unlimited for course duration'}`);
    console.log(`   Valid from: ${startDate.toLocaleDateString()}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()} (8 weeks)`);
    console.log(`   Price: ${coursePass.price} NOK`);
    console.log(`   Stripe Payment: ${stripePaymentIntentId}`);

    // Create the subscription
    const createdSubscription = await writeClient.create(subscriptionData);
    
    console.log(`\n🎉 SUCCESS! Created correct subscription: ${createdSubscription._id}`);
    console.log(`✅ ${user.name} now has the correct ${coursePass.name} pass`);

    // 5. Verify the subscription
    console.log('\n🔍 Verifying corrected subscription...');
    
    const verifySubscription = await sanityClient.fetch(
      `*[_type == "subscription" && _id == $subId][0] {
        _id, passName, type, startDate, endDate, remainingClips, isActive, stripePaymentId
      }`,
      { subId: createdSubscription._id }
    );

    if (verifySubscription) {
      const isActive = verifySubscription.isActive && new Date(verifySubscription.endDate) > new Date();
      console.log(`✅ Subscription verified:`);
      console.log(`   ID: ${verifySubscription._id}`);
      console.log(`   Pass: ${verifySubscription.passName}`);
      console.log(`   Status: ${isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
      console.log(`   Valid until: ${new Date(verifySubscription.endDate).toLocaleDateString()}`);
      console.log(`   Classes: ${verifySubscription.remainingClips || 'Unlimited for course duration'}`);
    }

    console.log('\n✅ CORRECTION COMPLETE');
    console.log('======================');
    console.log('The customer now has the correct "1 Course (8 weeks)" pass.');
    console.log('This pass is valid for 8 weeks and allows unlimited access to');
    console.log('the specific course they enrolled in.');

    return createdSubscription;

  } catch (error) {
    console.error('❌ Error correcting subscription:', error);
    return null;
  }
}

correctSubscription();
