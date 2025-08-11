import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔍 TESTING JAYSON SPECIFIC SUBSCRIPTION');

async function testJaysonSpecific() {
  try {
    const userEmail = 'jayson.ang12@gmail.com';
    
    // 1. Find Jayson's user record
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId
      }`,
      { email: userEmail }
    );

    console.log('\n👤 Jayson\'s user record:', user);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // 2. Find his subscription (the one you see in Sanity)
    const subscription = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId][0] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        passId,
        purchasePrice,
        tenant->{
          _id,
          schoolName,
          "subdomain": subdomain.current
        }
      }`,
      { userId: user._id }
    );

    console.log('\n📋 Jayson\'s subscription:', subscription);

    // 3. Test the API logic that should find this subscription
    console.log('\n🔍 Testing API logic...');
    
    if (user.clerkId) {
      // This is what the API does
      const apiUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $clerkId][0] {
          _id,
          name,
          email,
          clerkId
        }`,
        { clerkId: user.clerkId }
      );

      console.log('✅ API finds user by clerkId:', !!apiUser);

      if (apiUser) {
        const apiSubscriptions = await sanityClient.fetch(
          `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`,
          { sanityUserId: apiUser._id }
        );

        console.log('📊 API finds subscriptions:', apiSubscriptions.length);

        // Check date filtering
        const now = new Date();
        const activeSubscriptions = apiSubscriptions.filter((sub) => 
          new Date(sub.endDate) > now
        );

        console.log('📋 Active after date filtering:', activeSubscriptions.length);

        if (activeSubscriptions.length > 0) {
          console.log('✅ JAYSON SHOULD SEE HIS PASS!');
          activeSubscriptions.forEach((sub, index) => {
            console.log(`   ${index + 1}. ${sub.passName || sub.type} - expires ${sub.endDate}`);
          });
        } else {
          console.log('❌ No active subscriptions after filtering');
          apiSubscriptions.forEach((sub, index) => {
            const endDate = new Date(sub.endDate);
            const isExpired = endDate < now;
            console.log(`   ${index + 1}. ${sub.passName || sub.type}`);
            console.log(`      End: ${sub.endDate} (${isExpired ? 'EXPIRED' : 'ACTIVE'})`);
          });
        }
      }
    }

    // 4. Test tenant lookup specifically
    console.log('\n🏢 Testing tenant lookup for "dancecity"...');
    
    // Try all the methods our fixed API uses
    let tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current
      }`
    );

    if (!tenant) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && subdomain.current == "dancecity"][0] {
          _id,
          schoolName,
          "subdomain": subdomain.current
        }`
      );
    }

    if (!tenant) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && lower(schoolName) match "dancecity*"][0] {
          _id,
          schoolName,
          "subdomain": subdomain.current
        }`
      );
    }

    console.log('🏢 Tenant found:', tenant);

    if (tenant && subscription) {
      console.log('🔗 Subscription tenant matches:', subscription.tenant?._id === tenant._id);
    }

  } catch (error) {
    console.error('❌ Error testing Jayson specific:', error);
  }
}

testJaysonSpecific();
