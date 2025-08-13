import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function debugSolomiyaApiConnection() {
  try {
    console.log('🚨 CRITICAL: SOLOMIYA FRONTEND-API DISCONNECT');
    console.log('==============================================');
    console.log('');
    console.log('📊 CURRENT STATUS:');
    console.log('   Frontend shows: Active (0), History (0)');
    console.log('   Backend has: 4 active subscriptions');
    console.log('   Issue: API not returning data to frontend');
    console.log('');
    
    // Get user details
    const user = await client.fetch(`
      *[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId, role
      }
    `);
    
    console.log('👤 USER AUTHENTICATION DETAILS:');
    console.log('================================');
    console.log('   Sanity User ID:', user._id);
    console.log('   Clerk User ID:', user.clerkId);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('');
    
    // Test the exact API endpoint that the frontend calls
    console.log('🔍 TESTING API ENDPOINT SIMULATION:');
    console.log('===================================');
    
    const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Simulate the exact API call from /api/user/subscriptions/route.ts
    console.log('1️⃣ SIMULATING FRONTEND API CALL:');
    console.log('   URL: /api/user/subscriptions');
    console.log('   Headers: x-tenant-slug: dancecity');
    console.log('   Auth: Clerk userId =', user.clerkId);
    console.log('');
    
    // Step 1: Tenant lookup (what the API does first)
    console.log('2️⃣ TENANT LOOKUP TEST:');
    const tenantLookup = await client.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current
      }`,
      { tenantSlug: 'dancecity' }
    );
    
    if (tenantLookup) {
      console.log('   ✅ Tenant found:', tenantLookup.schoolName);
      console.log('   ✅ Tenant ID:', tenantLookup._id);
    } else {
      console.log('   ❌ Tenant NOT found with slug "dancecity"');
      
      // Try alternative lookups
      const altTenant1 = await client.fetch(
        `*[_type == "tenant" && subdomain.current == "dancecity"][0] {
          _id, schoolName, "subdomain": subdomain.current
        }`
      );
      
      const altTenant2 = await client.fetch(
        `*[_type == "tenant" && lower(schoolName) match "dancecity*"][0] {
          _id, schoolName, "subdomain": subdomain.current
        }`
      );
      
      console.log('   Alternative tenant lookup 1 (subdomain):', !!altTenant1);
      console.log('   Alternative tenant lookup 2 (schoolName):', !!altTenant2);
    }
    
    console.log('');
    
    // Step 2: User lookup by Clerk ID (what the API does)
    console.log('3️⃣ USER LOOKUP BY CLERK ID:');
    const userLookup = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id, name, email, clerkId
      }`,
      { clerkId: user.clerkId }
    );
    
    if (userLookup) {
      console.log('   ✅ User found by Clerk ID');
      console.log('   ✅ Sanity ID:', userLookup._id);
      console.log('   ✅ Name:', userLookup.name);
    } else {
      console.log('   ❌ CRITICAL: User NOT found by Clerk ID!');
      console.log('   This is why the API returns no subscriptions!');
    }
    
    console.log('');
    
    // Step 3: Subscription queries (what the API does)
    console.log('4️⃣ SUBSCRIPTION QUERIES:');
    
    if (userLookup && tenantLookup) {
      // Active subscriptions
      const activeQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id, type, passName, remainingClips, "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`;
      
      const activeSubs = await client.fetch(activeQuery, {
        sanityUserId: userLookup._id,
        now: now.toISOString(),
        tenantId: tenantLookup._id
      });
      
      console.log('   Active subscriptions found:', activeSubs.length);
      activeSubs.forEach((sub, i) => {
        console.log(`     ${i+1}. ${sub.passName} (${sub.remainingClips || 'Unlimited'} classes, ${sub.daysRemaining} days)`);
      });
      
      // Expired subscriptions
      const expiredQuery = `*[_type == "subscription" && user._ref == $sanityUserId && (isActive == false || endDate <= $now) && endDate >= $thirtyDaysAgo && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id, type, passName, "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`;
      
      const expiredSubs = await client.fetch(expiredQuery, {
        sanityUserId: userLookup._id,
        now: now.toISOString(),
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        tenantId: tenantLookup._id
      });
      
      console.log('   Expired subscriptions found:', expiredSubs.length);
      expiredSubs.forEach((sub, i) => {
        console.log(`     ${i+1}. ${sub.passName} (expired ${Math.abs(sub.daysRemaining)} days ago)`);
      });
      
    } else {
      console.log('   ❌ Cannot test subscription queries - user or tenant lookup failed');
    }
    
    console.log('');
    console.log('🔧 DIAGNOSIS & SOLUTION:');
    console.log('========================');
    
    if (!userLookup) {
      console.log('🚨 ROOT CAUSE: User not found by Clerk ID');
      console.log('   The API cannot find Solomiya\'s user record using her Clerk ID');
      console.log('   This means the frontend authentication is not matching the backend user');
      console.log('');
      console.log('💡 SOLUTIONS:');
      console.log('   1. Update user record with correct Clerk ID');
      console.log('   2. Check if Clerk ID has changed');
      console.log('   3. Verify authentication flow');
      
      // Check if there are multiple users with same email
      const duplicateUsers = await client.fetch(
        `*[_type == "user" && email == "miiamer88@gmail.com"] {
          _id, name, email, clerkId, _createdAt
        }`
      );
      
      console.log('');
      console.log('🔍 DUPLICATE USER CHECK:');
      console.log('   Users with same email:', duplicateUsers.length);
      duplicateUsers.forEach((u, i) => {
        console.log(`     ${i+1}. ID: ${u._id}, Clerk: ${u.clerkId}, Created: ${u._createdAt}`);
      });
      
    } else if (!tenantLookup) {
      console.log('🚨 ROOT CAUSE: Tenant not found');
      console.log('   The API cannot find the Dancecity tenant');
      console.log('   This means tenant slug/subdomain lookup is failing');
      
    } else {
      console.log('✅ User and tenant lookup successful');
      console.log('   The issue might be in the frontend API call or authentication');
      console.log('');
      console.log('💡 POSSIBLE CAUSES:');
      console.log('   1. Frontend not sending correct headers');
      console.log('   2. Clerk authentication not working properly');
      console.log('   3. CORS or network issues');
      console.log('   4. Frontend caching old empty results');
    }
    
    console.log('');
    console.log('🎯 IMMEDIATE ACTION PLAN:');
    console.log('=========================');
    console.log('1. Fix user/tenant lookup issues (if any)');
    console.log('2. Test the actual API endpoint directly');
    console.log('3. Clear all browser data and re-authenticate');
    console.log('4. Check network requests in browser dev tools');
    console.log('5. Verify Clerk authentication is working');
    
  } catch (error) {
    console.error('❌ Error during API connection debug:', error);
  }
}

debugSolomiyaApiConnection();
