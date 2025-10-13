import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function fixSveinSubscriptionData() {
  const email = 'svein.h.aaberge@gmail.com';
  const subscriptionId = 'x55OSItMbFx92tINEDruzr';
  
  console.log('🔧 Fixing Svein\'s subscription data...');
  console.log('Email:', email);
  console.log('Subscription ID:', subscriptionId);
  console.log('=' .repeat(60));

  try {
    // First, let's get the pass details to understand what the subscription should have
    console.log('\n1. Getting pass details...');
    const passId = 'nP5GIt0J2mhTNRaq5gkAGs';
    
    const passDetails = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId][0] {
        _id,
        name,
        price,
        classesLimit,
        validityType,
        validityDays,
        type
      }
    `, { passId });

    if (!passDetails) {
      console.log('❌ Pass not found');
      return;
    }

    console.log('✅ Pass details:');
    console.log(`   - Name: ${passDetails.name}`);
    console.log(`   - Price: ${passDetails.price}`);
    console.log(`   - Classes Limit: ${passDetails.classesLimit}`);
    console.log(`   - Type: ${passDetails.type}`);
    console.log(`   - Validity: ${passDetails.validityDays} days`);

    // Get current subscription data
    console.log('\n2. Getting current subscription data...');
    const currentSub = await sanityClient.fetch(`
      *[_type == "subscription" && _id == $subscriptionId][0] {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt
      }
    `, { subscriptionId });

    if (!currentSub) {
      console.log('❌ Subscription not found');
      return;
    }

    console.log('✅ Current subscription data:');
    console.log(`   - Classes Used: ${currentSub.classesUsed}`);
    console.log(`   - Classes Limit: ${currentSub.classesLimit}`);
    console.log(`   - Payment Status: ${currentSub.paymentStatus}`);
    console.log(`   - Amount: ${currentSub.amount}`);
    console.log(`   - Currency: ${currentSub.currency}`);

    // Prepare the update data
    console.log('\n3. Preparing update data...');
    const updateData = {
      classesUsed: 0, // Start with 0 classes used
      classesLimit: passDetails.classesLimit || 2, // 2 Course Pass should have 2 classes
      paymentStatus: 'completed', // Assume completed since subscription was manually created
      amount: passDetails.price * 100, // Convert to cents (Stripe format)
      currency: 'nok', // Norwegian Kroner
      _updatedAt: new Date().toISOString()
    };

    console.log('✅ Update data:');
    console.log(`   - Classes Used: ${updateData.classesUsed}`);
    console.log(`   - Classes Limit: ${updateData.classesLimit}`);
    console.log(`   - Payment Status: ${updateData.paymentStatus}`);
    console.log(`   - Amount: ${updateData.amount} (${updateData.amount/100} ${updateData.currency.toUpperCase()})`);
    console.log(`   - Currency: ${updateData.currency}`);

    // Apply the update
    console.log('\n4. Applying update...');
    const result = await sanityClient
      .patch(subscriptionId)
      .set(updateData)
      .commit();

    console.log('✅ Subscription updated successfully!');
    console.log('Updated subscription ID:', result._id);

    // Verify the update
    console.log('\n5. Verifying update...');
    const updatedSub = await sanityClient.fetch(`
      *[_type == "subscription" && _id == $subscriptionId][0] {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { subscriptionId });

    console.log('✅ Updated subscription verification:');
    console.log(`   - Pass Name: ${updatedSub.passName}`);
    console.log(`   - Type: ${updatedSub.type}`);
    console.log(`   - Active: ${updatedSub.isActive}`);
    console.log(`   - Expired: ${updatedSub.isExpired}`);
    console.log(`   - Classes: ${updatedSub.classesUsed}/${updatedSub.classesLimit}`);
    console.log(`   - Valid until: ${updatedSub.endDate} (${updatedSub.remainingDays} days)`);
    console.log(`   - Payment: ${updatedSub.paymentStatus} - ${updatedSub.amount/100} ${updatedSub.currency?.toUpperCase()}`);
    console.log(`   - Updated: ${updatedSub._updatedAt}`);

    // Test the API query that the frontend uses
    console.log('\n6. Testing frontend API query...');
    const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
    
    const apiResult = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $userId] | order(_createdAt desc) {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { userId: clerkId });

    console.log(`✅ API query returns ${apiResult.length} subscriptions`);
    
    if (apiResult.length > 0) {
      const sub = apiResult[0];
      console.log('   - Subscription should now display correctly in frontend');
      console.log(`   - Classes display: ${sub.classesUsed}/${sub.classesLimit || '∞'}`);
      console.log(`   - Payment display: ${sub.paymentStatus} - ${sub.amount/100} ${sub.currency?.toUpperCase()}`);
    }

    console.log('\n🎉 Fix completed successfully!');
    console.log('Svein should now be able to see his 2 Course Pass in the app.');

  } catch (error) {
    console.error('❌ Error fixing subscription data:', error);
  }
}

fixSveinSubscriptionData();
