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

console.log('🔍 PRODUCTION DIAGNOSIS: Solomiya Pass Issue\n');

const userEmail = 'miiamer88@gmail.com';
const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function diagnoseProductionIssue() {
  try {
    console.log('📊 CURRENT STATUS CHECK:');
    console.log('========================');
    
    // 1. Verify user exists
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ CRITICAL: User not found in database');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Sanity ID: ${user._id}`);

    // 2. Check current subscriptions with detailed info
    const now = new Date();
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) {
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
        _updatedAt,
        tenant->{_id, schoolName, slug},
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "originalPass": *[_type == "pass" && _id == ^.passId][0]{_id, name, type, tenant}
      }`,
      { userId: user._id }
    );

    console.log(`\n📋 ALL SUBSCRIPTIONS (${subscriptions.length}):`);
    subscriptions.forEach((sub, index) => {
      console.log(`\n   ${index + 1}. ${sub.passName || 'Unknown Pass'}`);
      console.log(`      ID: ${sub._id}`);
      console.log(`      Type: ${sub.type}`);
      console.log(`      Active: ${sub.isActive}`);
      console.log(`      Expired: ${sub.isExpired}`);
      console.log(`      Days remaining: ${sub.daysRemaining}`);
      console.log(`      Tenant: ${sub.tenant?.schoolName} (${sub.tenant?._id})`);
      console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
      console.log(`      Remaining clips: ${sub.remainingClips || 'Unlimited'}`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`      Created: ${sub._createdAt}`);
      console.log(`      Updated: ${sub._updatedAt || 'Never'}`);
      
      if (sub.originalPass) {
        console.log(`      Original Pass: ${sub.originalPass.name} (${sub.originalPass._id})`);
      } else {
        console.log(`      ⚠️  Original Pass: NOT FOUND (passId: ${sub.passId})`);
      }
    });

    // 3. Test the exact API query used by frontend
    console.log(`\n🎯 FRONTEND API SIMULATION:`);
    console.log('============================');
    
    const apiQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
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
    }`;

    const apiResults = await sanityClient.fetch(apiQuery, {
      sanityUserId: user._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log(`Query: ${apiQuery.replace(/\s+/g, ' ')}`);
    console.log(`Parameters:`);
    console.log(`   sanityUserId: ${user._id}`);
    console.log(`   now: ${now.toISOString()}`);
    console.log(`   tenantId: ${DANCECITY_TENANT_ID}`);
    console.log(`\nResults: ${apiResults.length} subscriptions`);

    if (apiResults.length === 0) {
      console.log('❌ API QUERY RETURNS NO RESULTS');
      console.log('\n🔍 DEBUGGING EACH CONDITION:');
      
      // Test each condition separately
      const userCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId]`,
        { userId: user._id }
      );
      console.log(`   user._ref == "${user._id}": ${userCheck.length} matches`);
      
      const activeCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && isActive == true]`,
        { userId: user._id }
      );
      console.log(`   isActive == true: ${activeCheck.length} matches`);
      
      const dateCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && endDate > $now]`,
        { userId: user._id, now: now.toISOString() }
      );
      console.log(`   endDate > now: ${dateCheck.length} matches`);
      
      const tenantCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId]`,
        { userId: user._id, tenantId: DANCECITY_TENANT_ID }
      );
      console.log(`   tenant._ref == "${DANCECITY_TENANT_ID}": ${tenantCheck.length} matches`);
      
    } else {
      console.log('✅ API QUERY WORKS - RETURNS SUBSCRIPTIONS');
      apiResults.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName || sub.originalPass?.name || 'Unknown'}`);
        console.log(`      Days remaining: ${sub.daysRemaining}`);
        console.log(`      Remaining clips: ${sub.remainingClips || 'Unlimited'}`);
      });
    }

    // 4. Check if passes exist and are properly linked
    console.log(`\n🎫 PASS VERIFICATION:`);
    console.log('====================');
    
    const dancecityPasses = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );
    
    console.log(`Dancecity has ${dancecityPasses.length} passes:`);
    dancecityPasses.forEach((pass, index) => {
      console.log(`   ${index + 1}. ${pass.name} (${pass.type}) - ${pass.price} NOK`);
      console.log(`      ID: ${pass._id}`);
      console.log(`      Validity: ${pass.validityDays} days`);
      console.log(`      Classes: ${pass.classesLimit || 'Unlimited'}`);
    });

    // 5. Production environment check
    console.log(`\n🌐 ENVIRONMENT CHECK:`);
    console.log('====================');
    console.log(`   Sanity Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
    console.log(`   Sanity Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET}`);
    console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set'}`);
    console.log(`   Clerk Publishable Key: ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not set'}`);

    // 6. Final diagnosis
    console.log(`\n🎯 DIAGNOSIS SUMMARY:`);
    console.log('====================');
    
    if (subscriptions.length === 0) {
      console.log('❌ NO SUBSCRIPTIONS FOUND - User needs subscription created');
    } else if (apiResults.length === 0) {
      console.log('❌ SUBSCRIPTIONS EXIST BUT API QUERY FAILS');
      console.log('   This indicates a data integrity issue');
    } else {
      console.log('✅ BACKEND IS WORKING CORRECTLY');
      console.log('   Issue is likely in frontend authentication or rendering');
    }

    console.log(`\n💡 NEXT STEPS:`);
    console.log('==============');
    
    if (subscriptions.length === 0) {
      console.log('1. Run: node create-miiamer-subscription.mjs');
    } else if (apiResults.length === 0) {
      console.log('1. Check subscription data integrity');
      console.log('2. Verify tenant references');
      console.log('3. Check date formats');
    } else {
      console.log('1. Ask Solomiya to clear browser cache completely');
      console.log('2. Ask her to log out and log back in');
      console.log('3. Check browser console for JavaScript errors');
      console.log('4. Test in incognito mode');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseProductionIssue();
