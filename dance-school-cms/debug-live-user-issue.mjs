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

console.log('🔍 DEBUGGING LIVE USER ISSUE - Why passes not showing');

async function debugLiveUserIssue() {
  try {
    // Let's check one specific user - Trine
    const userEmail = 'trinemeretheryen@outlook.com';
    console.log(`\n🔍 Debugging user: ${userEmail}`);

    // 1. Find user by email
    const userByEmail = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId,
        tenant
      }`,
      { email: userEmail }
    );

    console.log('\n📊 User found by email:', userByEmail);

    if (!userByEmail) {
      console.log('❌ User not found by email');
      return;
    }

    // 2. Find user's subscriptions
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        user->{_id, email, clerkId},
        tenant->{_id, schoolName, "subdomain": subdomain.current}
      }`,
      { userId: userByEmail._id }
    );

    console.log('\n📋 User subscriptions:', subscriptions);

    // 3. Check if subscriptions have tenant association
    console.log('\n🏢 Tenant Analysis:');
    subscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`);
      console.log(`  - Has tenant: ${sub.tenant ? 'YES' : 'NO'}`);
      if (sub.tenant) {
        console.log(`  - Tenant: ${sub.tenant.schoolName} (${sub.tenant.subdomain})`);
      }
      console.log(`  - Active: ${sub.isActive}`);
      console.log(`  - End date: ${sub.endDate}`);
      console.log(`  - Expired: ${new Date(sub.endDate) < new Date()}`);
    });

    // 4. Check dancecity tenant
    const dancecityTenant = await sanityClient.fetch(
      `*[_type == "tenant" && subdomain.current == "dancecity"][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        status
      }`
    );

    console.log('\n🏢 Dancecity tenant:', dancecityTenant);

    // 5. Check if there are subscriptions without tenant that should belong to dancecity
    const orphanSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && !defined(tenant)] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        isActive
      }`,
      { userId: userByEmail._id }
    );

    console.log('\n🔍 Orphan subscriptions (no tenant):', orphanSubscriptions);

    // 6. Test the API query that the frontend uses
    console.log('\n🔍 Testing frontend API query...');
    
    if (userByEmail.clerkId) {
      // This is the exact query from the fixed API
      const user = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $clerkId][0] {
          _id,
          name,
          email,
          clerkId
        }`,
        { clerkId: userByEmail.clerkId }
      );

      console.log('✅ User found by clerkId:', user);

      if (user) {
        const apiSubscriptions = await sanityClient.fetch(
          `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`,
          { sanityUserId: user._id }
        );

        console.log('📊 API would return subscriptions:', apiSubscriptions.length);
        
        // Filter active subscriptions (not expired)
        const now = new Date();
        const activeSubscriptions = apiSubscriptions.filter((sub) => 
          new Date(sub.endDate) > now
        );

        console.log('📋 Active subscriptions after filtering:', activeSubscriptions.length);
        
        if (activeSubscriptions.length === 0) {
          console.log('\n❌ PROBLEM FOUND: No active subscriptions after filtering!');
          console.log('This explains why passes are not showing.');
          
          apiSubscriptions.forEach((sub, index) => {
            const endDate = new Date(sub.endDate);
            const isExpired = endDate < now;
            console.log(`Subscription ${index + 1}: ${sub.passName || sub.type}`);
            console.log(`  - End date: ${sub.endDate}`);
            console.log(`  - Expired: ${isExpired}`);
            console.log(`  - Days until expiry: ${Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging user issue:', error);
  }
}

debugLiveUserIssue();
