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

async function testLiveApiEndpoint() {
  try {
    console.log('🧪 TESTING LIVE API ENDPOINT');
    console.log('============================');
    
    // Get Solomiya's user details
    const user = await client.fetch(`
      *[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId
      }
    `);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Testing for user:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🔑 Clerk ID:', user.clerkId);
    console.log('');
    
    // Test 1: Direct API simulation (what we already confirmed works)
    console.log('1️⃣ BACKEND API SIMULATION TEST:');
    console.log('================================');
    
    const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Simulate the exact API logic
    const tenantLookup = await client.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id, schoolName, "subdomain": subdomain.current
      }`,
      { tenantSlug: 'dancecity' }
    );
    
    const userLookup = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0] {
        _id, name, email, clerkId
      }`,
      { clerkId: user.clerkId }
    );
    
    const activeSubscriptions = await client.fetch(
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
      { sanityUserId: userLookup._id, now: now.toISOString(), tenantId: tenantLookup._id }
    );
    
    const expiredSubscriptions = await client.fetch(
      `*[_type == "subscription" && user._ref == $sanityUserId && (isActive == false || endDate <= $now) && endDate >= $thirtyDaysAgo && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        _createdAt,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }`,
      { sanityUserId: userLookup._id, now: now.toISOString(), thirtyDaysAgo: thirtyDaysAgo.toISOString(), tenantId: tenantLookup._id }
    );
    
    console.log('✅ Tenant lookup:', tenantLookup ? 'SUCCESS' : 'FAILED');
    console.log('✅ User lookup:', userLookup ? 'SUCCESS' : 'FAILED');
    console.log('✅ Active subscriptions:', activeSubscriptions.length);
    console.log('✅ Expired subscriptions:', expiredSubscriptions.length);
    
    // Simulate the exact API response
    const apiResponse = {
      activeSubscriptions: activeSubscriptions,
      expiredSubscriptions: expiredSubscriptions,
      debug: {
        clerkId: user.clerkId,
        sanityUserId: userLookup._id,
        tenantId: tenantLookup._id,
        userExists: !!userLookup,
        totalUserSubscriptions: activeSubscriptions.length + expiredSubscriptions.length,
        totalTenantSubscriptions: 'N/A'
      }
    };
    
    console.log('');
    console.log('📋 SIMULATED API RESPONSE:');
    console.log('==========================');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Test 2: Check if development server is running
    console.log('');
    console.log('2️⃣ DEVELOPMENT SERVER CHECK:');
    console.log('=============================');
    
    try {
      const response = await fetch('http://localhost:3000/api/user/subscriptions', {
        method: 'GET',
        headers: {
          'x-tenant-slug': 'dancecity',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Server is running');
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.status === 401) {
        console.log('⚠️ Expected 401 Unauthorized (no Clerk auth token provided)');
        console.log('✅ This confirms the API endpoint is working and requires authentication');
      } else {
        const data = await response.json();
        console.log('📋 Response data:', JSON.stringify(data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ Development server not running or not accessible');
      console.log('💡 To test live API, run: npm run dev');
      console.log('Error:', error.message);
    }
    
    // Test 3: Authentication flow verification
    console.log('');
    console.log('3️⃣ AUTHENTICATION FLOW ANALYSIS:');
    console.log('=================================');
    
    console.log('🔍 Expected flow:');
    console.log('   1. Frontend calls /api/user/subscriptions');
    console.log('   2. Clerk auth() extracts userId from session');
    console.log('   3. API looks up user by clerkId in Sanity');
    console.log('   4. API queries subscriptions for that user');
    console.log('   5. Frontend displays the results');
    console.log('');
    console.log('🔍 Potential failure points:');
    console.log('   • Clerk session not established');
    console.log('   • Frontend not sending x-tenant-slug header');
    console.log('   • Browser cache returning stale empty results');
    console.log('   • Network/CORS issues');
    console.log('   • Frontend component not updating after API call');
    
    // Test 4: Provide debugging instructions
    console.log('');
    console.log('4️⃣ FRONTEND DEBUGGING INSTRUCTIONS:');
    console.log('===================================');
    
    console.log('📱 For Solomiya to check in browser dev tools:');
    console.log('');
    console.log('1. Open browser dev tools (F12)');
    console.log('2. Go to Network tab');
    console.log('3. Refresh the passes page');
    console.log('4. Look for request to "/api/user/subscriptions"');
    console.log('5. Check:');
    console.log('   • Request headers include "x-tenant-slug: dancecity"');
    console.log('   • Response status (should be 200)');
    console.log('   • Response body (should contain activeSubscriptions array)');
    console.log('');
    console.log('🔧 If API call is missing or failing:');
    console.log('   • Clear all browser data');
    console.log('   • Log out and log back in');
    console.log('   • Try incognito/private mode');
    console.log('   • Try different browser');
    
    // Test 5: Final verification
    console.log('');
    console.log('5️⃣ FINAL VERIFICATION:');
    console.log('======================');
    
    if (activeSubscriptions.length > 0) {
      console.log('🎉 SUCCESS! Backend is ready:');
      console.log(`   ✅ ${activeSubscriptions.length} active subscription(s) found`);
      console.log(`   ✅ User authentication mapping works`);
      console.log(`   ✅ Tenant lookup works`);
      console.log(`   ✅ API queries return correct data`);
      console.log('');
      console.log('📱 Expected result for Solomiya:');
      activeSubscriptions.forEach((sub, i) => {
        console.log(`   ${i+1}. ${sub.passName || sub.originalPass?.name || 'Class Package'}`);
        console.log(`      - ${sub.remainingClips || 'Unlimited'} classes remaining`);
        console.log(`      - ${sub.daysRemaining} days left`);
        console.log(`      - Price paid: ${sub.purchasePrice} NOK`);
      });
      
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('==============');
      console.log('1. Have Solomiya clear browser cache completely');
      console.log('2. Log out and log back in');
      console.log('3. Check "Your Active Passes" section');
      console.log('4. If still not working, check browser dev tools Network tab');
      
    } else {
      console.log('❌ CRITICAL: No active subscriptions found');
      console.log('   This should not happen after cleanup');
    }
    
  } catch (error) {
    console.error('❌ Error during live API test:', error);
  }
}

testLiveApiEndpoint();
