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

console.log('🔍 DEBUGGING TENANT ISSUE - Checking tenant filtering');

async function debugTenantIssue() {
  try {
    // 1. Check all tenants
    const allTenants = await sanityClient.fetch(
      `*[_type == "tenant"] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        status
      }`
    );

    console.log('\n📊 All tenants:', allTenants);

    // 2. Find dancecity tenant specifically
    const dancecityTenant = await sanityClient.fetch(
      `*[_type == "tenant" && (schoolName match "Dancecity*" || subdomain.current == "dancecity")][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        status
      }`
    );

    console.log('\n🏢 Dancecity tenant:', dancecityTenant);

    // 3. Check if the tenant-specific API would work
    if (dancecityTenant) {
      console.log('\n🔍 Testing tenant-specific filtering...');
      
      // This is what the tenant-specific API does
      const tenantSubscriptions = await sanityClient.fetch(
        `*[_type == "subscription" && tenant._ref == $tenantId] {
          _id,
          passName,
          type,
          user->{email},
          tenant->{schoolName, "subdomain": subdomain.current}
        }`,
        { tenantId: dancecityTenant._id }
      );

      console.log(`📋 Subscriptions for tenant ${dancecityTenant._id}:`, tenantSubscriptions.length);
      
      if (tenantSubscriptions.length > 0) {
        console.log('Sample subscriptions:');
        tenantSubscriptions.slice(0, 3).forEach((sub, index) => {
          console.log(`  ${index + 1}. ${sub.user?.email}: ${sub.passName || sub.type}`);
        });
      }
    }

    // 4. Check if there are subscriptions without proper tenant association
    const orphanSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && !defined(tenant)] {
        _id,
        passName,
        type,
        user->{email}
      }`
    );

    console.log('\n🔍 Orphan subscriptions (no tenant):', orphanSubscriptions.length);

    // 5. Check if the frontend API filtering is working
    console.log('\n🔍 Testing frontend API logic...');
    
    // Test one specific user
    const testUser = await sanityClient.fetch(
      `*[_type == "user" && email == "trinemeretheryen@outlook.com"][0] {
        _id,
        clerkId,
        email
      }`
    );

    if (testUser) {
      console.log('✅ Test user found:', testUser.email);
      
      // This is the exact query from the API
      const userSubscriptions = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`,
        { sanityUserId: testUser._id }
      );

      console.log('📊 User subscriptions from API query:', userSubscriptions.length);
      
      // Filter active subscriptions (not expired)
      const now = new Date();
      const activeSubscriptions = userSubscriptions.filter((sub) => 
        new Date(sub.endDate) > now
      );

      console.log('📋 Active subscriptions after date filtering:', activeSubscriptions.length);

      if (activeSubscriptions.length > 0) {
        console.log('✅ SUBSCRIPTIONS SHOULD BE VISIBLE!');
        activeSubscriptions.forEach((sub, index) => {
          console.log(`  ${index + 1}. ${sub.passName || sub.type} - expires ${sub.endDate}`);
        });
      } else {
        console.log('❌ NO ACTIVE SUBSCRIPTIONS - This is why passes are not showing');
        userSubscriptions.forEach((sub, index) => {
          const endDate = new Date(sub.endDate);
          const isExpired = endDate < now;
          console.log(`  ${index + 1}. ${sub.passName || sub.type}`);
          console.log(`     End: ${sub.endDate} (${isExpired ? 'EXPIRED' : 'ACTIVE'})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error debugging tenant issue:', error);
  }
}

debugTenantIssue();
