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

console.log('🔍 DEEP DEBUG: Why Solomiya still can\'t see passes after role fix\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function deepDebugComparison() {
  try {
    console.log('🚨 ROLE FIX DIDN\'T WORK - INVESTIGATING DEEPER');
    console.log('================================================');
    
    // Get both users with ALL fields
    const solomiya = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0]`
    );

    const oakwood = await sanityClient.fetch(
      `*[_type == "user" && email == "oakwood338@gmail.com"][0]`
    );

    console.log('👤 COMPLETE USER COMPARISON:');
    console.log('============================');
    console.log('SOLOMIYA FULL RECORD:');
    console.log(JSON.stringify(solomiya, null, 2));
    console.log('\nOAKWOOD FULL RECORD:');
    console.log(JSON.stringify(oakwood, null, 2));
    console.log('');

    // Check subscription data in extreme detail
    const solomiyaSubsDetailed = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        ...,
        user->{...},
        tenant->{...},
        "passReference": *[_type == "pass" && _id == ^.passId][0]{...}
      }`,
      { userId: solomiya._id }
    );

    const oakwoodSubsDetailed = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        ...,
        user->{...},
        tenant->{...},
        "passReference": *[_type == "pass" && _id == ^.passId][0]{...}
      }`,
      { userId: oakwood._id }
    );

    console.log('🎫 DETAILED SUBSCRIPTION COMPARISON:');
    console.log('====================================');
    console.log('SOLOMIYA SUBSCRIPTIONS:');
    console.log(JSON.stringify(solomiyaSubsDetailed, null, 2));
    console.log('\nOAKWOOD SUBSCRIPTIONS:');
    console.log(JSON.stringify(oakwoodSubsDetailed, null, 2));
    console.log('');

    // Test the EXACT API call that the frontend makes
    console.log('🎯 TESTING EXACT FRONTEND API CALLS:');
    console.log('====================================');
    
    const now = new Date();
    const frontendQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
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

    console.log('Testing Solomiya with exact frontend query...');
    const solomiyaFrontendResult = await sanityClient.fetch(frontendQuery, {
      sanityUserId: solomiya._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log('Testing Oakwood with exact frontend query...');
    const oakwoodFrontendResult = await sanityClient.fetch(frontendQuery, {
      sanityUserId: oakwood._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log(`Solomiya frontend API result: ${solomiyaFrontendResult.length} subscriptions`);
    console.log('Solomiya result details:', JSON.stringify(solomiyaFrontendResult, null, 2));
    console.log(`Oakwood frontend API result: ${oakwoodFrontendResult.length} subscriptions`);
    console.log('Oakwood result details:', JSON.stringify(oakwoodFrontendResult, null, 2));
    console.log('');

    // Check each condition individually for Solomiya
    console.log('🔍 ANALYZING SOLOMIYA QUERY CONDITIONS:');
    console.log('======================================');
    
    const allSolomiyaSubs = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId]`,
      { userId: solomiya._id }
    );

    console.log(`Total Solomiya subscriptions: ${allSolomiyaSubs.length}`);
    
    for (const sub of allSolomiyaSubs) {
      console.log(`\nSubscription ${sub._id}:`);
      console.log(`  • isActive: ${sub.isActive}`);
      console.log(`  • endDate: ${sub.endDate}`);
      console.log(`  • endDate > now: ${new Date(sub.endDate) > now}`);
      console.log(`  • tenant._ref: ${sub.tenant?._ref}`);
      console.log(`  • tenant matches: ${sub.tenant?._ref === DANCECITY_TENANT_ID}`);
      
      // Check if the pass exists
      const passExists = await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId && tenant._ref == $tenantId][0]`,
        { passId: sub.passId, tenantId: DANCECITY_TENANT_ID }
      );
      console.log(`  • pass exists: ${!!passExists}`);
      if (passExists) {
        console.log(`  • pass name: ${passExists.name}`);
      }
    }

    // Check if there are any middleware or auth issues
    console.log('\n🔐 CHECKING AUTHENTICATION DIFFERENCES:');
    console.log('=======================================');
    console.log(`Solomiya Clerk ID: ${solomiya.clerkId}`);
    console.log(`Oakwood Clerk ID: ${oakwood.clerkId}`);
    console.log(`Solomiya role: ${solomiya.role}`);
    console.log(`Oakwood role: ${oakwood.role}`);
    
    // Check if there are any other fields that might affect the query
    const solomiyaKeys = Object.keys(solomiya).sort();
    const oakwoodKeys = Object.keys(oakwood).sort();
    
    console.log('\n📋 USER FIELD DIFFERENCES:');
    console.log('==========================');
    console.log('Solomiya fields:', solomiyaKeys);
    console.log('Oakwood fields:', oakwoodKeys);
    
    const missingInSolomiya = oakwoodKeys.filter(key => !solomiyaKeys.includes(key));
    const missingInOakwood = solomiyaKeys.filter(key => !oakwoodKeys.includes(key));
    
    if (missingInSolomiya.length > 0) {
      console.log('Fields missing in Solomiya:', missingInSolomiya);
    }
    if (missingInOakwood.length > 0) {
      console.log('Fields missing in Oakwood:', missingInOakwood);
    }

    // Final diagnosis
    console.log('\n💡 DIAGNOSIS:');
    console.log('=============');
    if (solomiyaFrontendResult.length === 0) {
      console.log('❌ CRITICAL: Frontend API query returns 0 results for Solomiya');
      console.log('   This means the query conditions are failing');
      console.log('   Need to check each condition individually');
    } else {
      console.log('✅ Frontend API query returns results for Solomiya');
      console.log('   The issue must be in the frontend display logic');
    }

    if (oakwoodFrontendResult.length > 0) {
      console.log('✅ Frontend API query works for Oakwood');
    } else {
      console.log('❌ Frontend API query also fails for Oakwood');
    }

  } catch (error) {
    console.error('❌ Error during deep debug:', error);
  }
}

deepDebugComparison();
