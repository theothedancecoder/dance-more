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

async function testSubscriptionsAPI() {
  const email = 'svein.h.aaberge@gmail.com';
  const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
  
  console.log('🔍 Testing /api/subscriptions endpoint logic...');
  console.log('Email:', email);
  console.log('Clerk ID:', clerkId);
  console.log('=' .repeat(60));

  try {
    // Step 1: Find user by clerkId (what the API does first)
    console.log('\n1. Finding user by clerkId...');
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id,
        name,
        email,
        clerkId
      }`,
      { clerkId }
    );

    if (!user) {
      console.log('❌ User not found by clerkId - this is the problem!');
      return;
    }

    console.log('✅ Found user:');
    console.log(`   - Sanity ID: ${user._id}`);
    console.log(`   - Clerk ID: ${user.clerkId}`);
    console.log(`   - Email: ${user.email}`);

    // Step 2: Query subscriptions using user._ref (what the API does)
    console.log('\n2. Querying subscriptions using user._ref...');
    const subscriptionsQuery1 = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`;
    
    console.log('Query:', subscriptionsQuery1);
    console.log('Parameters:', { sanityUserId: user._id });
    
    const subscriptions1 = await sanityClient.fetch(subscriptionsQuery1, { sanityUserId: user._id });
    
    console.log(`📊 Found ${subscriptions1.length} subscriptions with user._ref query`);

    // Step 3: Try alternative query using user->clerkId (what actually works)
    console.log('\n3. Trying alternative query using user->clerkId...');
    const subscriptionsQuery2 = `*[_type == "subscription" && user->clerkId == $clerkId && isActive == true] | order(_createdAt desc)`;
    
    console.log('Query:', subscriptionsQuery2);
    console.log('Parameters:', { clerkId });
    
    const subscriptions2 = await sanityClient.fetch(subscriptionsQuery2, { clerkId });
    
    console.log(`📊 Found ${subscriptions2.length} subscriptions with user->clerkId query`);

    // Step 4: Check the actual subscription structure
    console.log('\n4. Checking subscription structure...');
    const allSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription"] {
        _id,
        passName,
        isActive,
        "userRef": user._ref,
        "userClerkId": user->clerkId,
        "userEmail": user->email
      }[0..5]
    `);

    console.log('Sample subscriptions:');
    allSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - Active: ${sub.isActive}`);
      console.log(`      user._ref: ${sub.userRef}`);
      console.log(`      user->clerkId: ${sub.userClerkId}`);
      console.log(`      user->email: ${sub.userEmail}`);
    });

    // Step 5: Show the fix needed
    console.log('\n5. 🔧 SOLUTION:');
    if (subscriptions1.length === 0 && subscriptions2.length > 0) {
      console.log('✅ The API query needs to be changed from:');
      console.log('   user._ref == $sanityUserId');
      console.log('✅ To:');
      console.log('   user->clerkId == $clerkId');
      console.log('');
      console.log('This will make Svein\'s subscription show up in the student dashboard!');
    } else if (subscriptions1.length > 0) {
      console.log('✅ The current API query should work - there might be another issue');
    } else {
      console.log('❌ Neither query returns results - need to investigate further');
    }

  } catch (error) {
    console.error('❌ Error testing subscriptions API:', error);
  }
}

testSubscriptionsAPI();
