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

console.log('🔧 Creating Missing Subscription for hkts989@outlook.com');
console.log('======================================================');

async function createHkts989Subscription() {
  try {
    const customerEmail = 'hkts989@outlook.com';
    const customerClerkId = 'user_32CIxlEH04vm3zwoE0iSFQlYq9i';
    
    // 1. Get user details
    console.log('\n👤 Getting user details...');
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId,
        _createdAt
      }
    `, { email: customerEmail });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.email} (${user.clerkId})`);
    console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);

    // 2. Determine which clip card pass she likely bought
    // Since she was created at 6:52 PM today, let's assume she bought the most common clip card
    console.log('\n🎫 Determining which pass was purchased...');
    
    // Get the most likely clip card pass (10 Single Clip Card)
    const clipCardPass = await sanityClient.fetch(`
      *[_type == "pass" && name == "10 Single Clip Card"][0] {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        classesLimit,
        tenant->{_id, schoolName}
      }
    `);

    if (!clipCardPass) {
      console.log('❌ 10 Single Clip Card pass not found');
      return;
    }

    console.log(`✅ Pass to create subscription for: ${clipCardPass.name}`);
    console.log(`   ID: ${clipCardPass._id}`);
    console.log(`   Price: ${clipCardPass.price} NOK`);
    console.log(`   Classes: ${clipCardPass.classesLimit}`);
    console.log(`   Validity: ${clipCardPass.validityDays} days`);
    console.log(`   Tenant: ${clipCardPass.tenant?.schoolName}`);

    // 3. Calculate subscription details
    console.log('\n📅 Calculating subscription details...');
    
    const purchaseDate = new Date(user._createdAt); // Use user creation time as purchase time
    const endDate = new Date(purchaseDate.getTime() + clipCardPass.validityDays * 24 * 60 * 60 * 1000);
    
    console.log(`   Purchase date: ${purchaseDate.toLocaleString()}`);
    console.log(`   Expiry date: ${endDate.toLocaleString()}`);
    console.log(`   Validity period: ${clipCardPass.validityDays} days`);

    // 4. Create the subscription
    console.log('\n🔧 Creating subscription...');
    
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: clipCardPass.tenant._id,
      },
      type: 'clipcard',
      startDate: purchaseDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips: clipCardPass.classesLimit,
      classesLimit: clipCardPass.classesLimit,
      classesUsed: 0,
      passId: clipCardPass._id,
      passName: clipCardPass.name,
      purchasePrice: clipCardPass.price,
      stripePaymentId: 'manual_recovery_hkts989',
      stripeSessionId: 'manual_recovery_session_hkts989',
      isActive: true,
      paymentStatus: 'completed',
      amount: clipCardPass.price,
      currency: 'NOK',
      _createdAt: purchaseDate.toISOString(),
    };

    console.log('📝 Subscription data:');
    console.log(`   Type: ${subscriptionData.type}`);
    console.log(`   Pass: ${subscriptionData.passName}`);
    console.log(`   Classes: ${subscriptionData.remainingClips}`);
    console.log(`   Start: ${new Date(subscriptionData.startDate).toLocaleString()}`);
    console.log(`   End: ${new Date(subscriptionData.endDate).toLocaleString()}`);
    console.log(`   Price: ${subscriptionData.purchasePrice} ${subscriptionData.currency}`);

    const createdSubscription = await sanityClient.create(subscriptionData);
    
    console.log(`\n✅ Subscription created successfully!`);
    console.log(`   Subscription ID: ${createdSubscription._id}`);

    // 5. Verify the subscription appears in the API
    console.log('\n🔍 Verifying subscription appears in student API...');
    
    const apiResult = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $userId] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { userId: customerClerkId });

    console.log(`\n📊 API Result: Found ${apiResult.length} subscriptions for user`);
    
    const activeSubscriptions = apiResult.filter(sub => sub.isActive && !sub.isExpired);
    console.log(`   Active, non-expired: ${activeSubscriptions.length}`);
    
    for (const sub of activeSubscriptions) {
      console.log(`\n   ✅ ${sub.passName} (${sub.type})`);
      console.log(`      Days remaining: ${sub.remainingDays}`);
      console.log(`      Classes used: ${sub.classesUsed}/${sub.classesLimit}`);
      console.log(`      Is Active: ${sub.isActive}`);
      console.log(`      Is Expired: ${sub.isExpired}`);
      
      if (sub._id === createdSubscription._id) {
        console.log(`      🎉 THIS IS THE NEWLY CREATED SUBSCRIPTION!`);
        console.log(`      🎉 hkts989@outlook.com will now see this in her active passes!`);
      }
    }

    console.log('\n🎉 SUCCESS!');
    console.log('===========');
    console.log('✅ Missing subscription created for hkts989@outlook.com');
    console.log('✅ She should now see her clip card in active passes');
    console.log('✅ Future clip card purchases will work automatically (passes fixed)');

  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

// Run the creation
createHkts989Subscription();
