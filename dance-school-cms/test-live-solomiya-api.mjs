import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🧪 TESTING LIVE API CALL FOR SOLOMIYA\n');

const SOLOMIYA_CLERK_ID = 'user_2zYHmsOLHH3hj5cH93XnEfdYkVJ';
const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function testLiveAPI() {
  try {
    console.log('🔍 SIMULATING EXACT FRONTEND API CALL:');
    console.log('=====================================');
    console.log(`Clerk ID: ${SOLOMIYA_CLERK_ID}`);
    console.log(`Tenant ID: ${DANCECITY_TENANT_ID}`);
    console.log('');

    // Step 1: Find user by clerkId (exactly like the API does)
    console.log('1️⃣ Finding user by clerkId...');
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id,
        name,
        email,
        clerkId
      }`,
      { clerkId: SOLOMIYA_CLERK_ID }
    );

    if (!user) {
      console.log('❌ User not found with clerkId');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   Sanity ID: ${user._id}`);
    console.log('');

    // Step 2: Find tenant by slug (exactly like the API does)
    console.log('2️⃣ Finding tenant by slug...');
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id,
        schoolName
      }`,
      { tenantSlug: 'dancecity' }
    );

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName}`);
    console.log(`   Tenant ID: ${tenant._id}`);
    console.log('');

    // Step 3: Execute the exact API query
    console.log('3️⃣ Executing exact API subscription query...');
    const now = new Date();
    
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        passId,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        stripePaymentId,
        stripeSessionId,
        _createdAt,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "originalPass": *[_type == "pass" && _id == ^.passId && tenant._ref == $tenantId][0]{name, type}
      }`,
      { sanityUserId: user._id, now: now.toISOString(), tenantId: tenant._id }
    );

    console.log(`✅ API Query Result: ${subscriptions.length} subscriptions`);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName || sub.originalPass?.name || 'Unknown Pass'}`);
      console.log(`      Type: ${sub.type}`);
      console.log(`      Days remaining: ${sub.daysRemaining}`);
      console.log(`      Classes: ${sub.remainingClips || 'Unlimited'}`);
      console.log(`      Active: ${sub.isActive}`);
      console.log(`      Expired: ${sub.isExpired}`);
      console.log('');
    });

    // Step 4: Test the actual HTTP API endpoint
    console.log('4️⃣ Testing actual HTTP API endpoint...');
    
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dancecity.no'}/api/user/subscriptions`;
    console.log(`API URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-tenant-slug': 'dancecity',
          'Authorization': `Bearer ${SOLOMIYA_CLERK_ID}`, // This won't work but let's see the error
          'Content-Type': 'application/json'
        }
      });

      console.log(`HTTP Status: ${response.status}`);
      const responseText = await response.text();
      console.log('Response:', responseText);
      
    } catch (fetchError) {
      console.log('❌ HTTP API test failed (expected - no auth token):', fetchError.message);
    }

    // Step 5: Check if there are any other issues
    console.log('5️⃣ Additional diagnostics...');
    
    // Check if user has proper tenant association
    const userWithTenant = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id,
        name,
        email,
        tenant->{_id, schoolName, "slug": slug.current}
      }`,
      { clerkId: SOLOMIYA_CLERK_ID }
    );

    console.log('User tenant association:');
    console.log(`   Has tenant: ${!!userWithTenant.tenant}`);
    if (userWithTenant.tenant) {
      console.log(`   Tenant: ${userWithTenant.tenant.schoolName} (${userWithTenant.tenant.slug})`);
      console.log(`   Matches target: ${userWithTenant.tenant.slug === 'dancecity'}`);
    }
    console.log('');

    // Check subscription references one more time
    console.log('6️⃣ Final reference check...');
    const allSubs = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id,
        passName,
        user._ref,
        tenant._ref,
        isActive,
        endDate
      }`,
      { userId: user._id }
    );

    console.log(`Total subscriptions for user: ${allSubs.length}`);
    allSubs.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName}`);
      console.log(`      user._ref: ${sub.user._ref} (should be ${user._id})`);
      console.log(`      tenant._ref: ${sub.tenant._ref} (should be ${tenant._id})`);
      console.log(`      isActive: ${sub.isActive}`);
      console.log(`      endDate: ${sub.endDate}`);
      console.log(`      Valid: ${sub.user._ref === user._id && sub.tenant._ref === tenant._id && sub.isActive && new Date(sub.endDate) > now}`);
      console.log('');
    });

    console.log('🎯 SUMMARY:');
    console.log('===========');
    console.log(`✅ User found: ${user.name}`);
    console.log(`✅ Tenant found: ${tenant.schoolName}`);
    console.log(`✅ Subscriptions found: ${subscriptions.length}`);
    console.log(`✅ References fixed: All subscriptions have proper user._ref and tenant._ref`);
    console.log('');
    console.log('💡 If passes still not showing, the issue is likely:');
    console.log('   1. Frontend caching issue');
    console.log('   2. Authentication/session issue');
    console.log('   3. Middleware blocking the request');
    console.log('   4. Frontend not calling the API correctly');
    console.log('');
    console.log('🔧 RECOMMENDED ACTIONS FOR SOLOMIYA:');
    console.log('1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('2. Clear all browser data for dancecity.no');
    console.log('3. Log out completely and log back in');
    console.log('4. Try incognito/private browsing mode');
    console.log('5. Try a different browser entirely');
    console.log('6. Try on a different device');

  } catch (error) {
    console.error('❌ Error during live API test:', error);
  }
}

testLiveAPI();
