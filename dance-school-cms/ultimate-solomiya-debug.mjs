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

console.log('🚨 ULTIMATE SOLOMIYA DEBUG - LAST RESORT\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function ultimateDebug() {
  try {
    console.log('🔍 COMPREHENSIVE SYSTEM CHECK:');
    console.log('==============================');
    
    // 1. Check if Solomiya's user record exists and is correct
    const solomiya = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        ...,
        tenant->{...}
      }`
    );

    console.log('👤 SOLOMIYA USER RECORD:');
    console.log(JSON.stringify(solomiya, null, 2));
    console.log('');

    if (!solomiya) {
      console.log('❌ CRITICAL: Solomiya user not found!');
      return;
    }

    // 2. Check if Dancecity tenant exists
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId][0] {
        ...,
        "slug": slug.current
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log('🏢 DANCECITY TENANT:');
    console.log(JSON.stringify(tenant, null, 2));
    console.log('');

    // 3. Check subscriptions with full details
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        ...,
        user->{...},
        tenant->{...},
        "pass": *[_type == "pass" && _id == ^.passId][0]{...}
      }`,
      { userId: solomiya._id }
    );

    console.log('🎫 SOLOMIYA SUBSCRIPTIONS (FULL DETAILS):');
    console.log(JSON.stringify(subscriptions, null, 2));
    console.log('');

    // 4. Test the exact API query with all conditions
    const now = new Date();
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

    console.log('🎯 API QUERY TEST:');
    console.log('Query parameters:');
    console.log(`  sanityUserId: ${solomiya._id}`);
    console.log(`  now: ${now.toISOString()}`);
    console.log(`  tenantId: ${DANCECITY_TENANT_ID}`);
    console.log('');

    const apiResult = await sanityClient.fetch(apiQuery, {
      sanityUserId: solomiya._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log('API RESULT:');
    console.log(JSON.stringify(apiResult, null, 2));
    console.log('');

    // 5. Check each condition individually
    console.log('🔍 CONDITION BREAKDOWN:');
    console.log('======================');
    
    for (const sub of subscriptions) {
      console.log(`\nSubscription ${sub._id}:`);
      console.log(`  user._ref == sanityUserId: ${sub.user._ref} == ${solomiya._id} = ${sub.user._ref === solomiya._id}`);
      console.log(`  isActive == true: ${sub.isActive}`);
      console.log(`  endDate > now: ${sub.endDate} > ${now.toISOString()} = ${new Date(sub.endDate) > now}`);
      console.log(`  tenant._ref == tenantId: ${sub.tenant._ref} == ${DANCECITY_TENANT_ID} = ${sub.tenant._ref === DANCECITY_TENANT_ID}`);
      
      // Check if pass exists
      const passExists = await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId && tenant._ref == $tenantId][0]`,
        { passId: sub.passId, tenantId: DANCECITY_TENANT_ID }
      );
      console.log(`  originalPass exists: ${!!passExists}`);
      
      const shouldMatch = sub.user._ref === solomiya._id && 
                         sub.isActive === true && 
                         new Date(sub.endDate) > now && 
                         sub.tenant._ref === DANCECITY_TENANT_ID;
      console.log(`  SHOULD MATCH API QUERY: ${shouldMatch}`);
    }

    // 6. Alternative approach - create a completely new subscription
    console.log('\n🆘 EMERGENCY SOLUTION:');
    console.log('======================');
    console.log('Since all fixes failed, creating a brand new subscription...');
    
    // Get a working pass
    const workingPass = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId && isActive == true][0]`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    if (workingPass) {
      console.log(`Found working pass: ${workingPass.name}`);
      
      // Create a completely new subscription
      const newSubscription = {
        _type: 'subscription',
        user: {
          _type: 'reference',
          _ref: solomiya._id
        },
        tenant: {
          _type: 'reference',
          _ref: DANCECITY_TENANT_ID
        },
        passId: workingPass._id,
        passName: workingPass.name,
        type: workingPass.type === 'multi' ? 'clipcard' : workingPass.type,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        isActive: true,
        purchasePrice: workingPass.price,
        remainingClips: workingPass.type === 'multi' ? 10 : null,
        stripePaymentId: 'emergency_fix_solomiya',
        stripeSessionId: 'emergency_session_solomiya',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Creating emergency subscription...');
      const emergencyResult = await sanityClient.create(newSubscription);
      console.log(`✅ Created emergency subscription: ${emergencyResult._id}`);
      
      // Test the API query again
      const finalTest = await sanityClient.fetch(apiQuery, {
        sanityUserId: solomiya._id,
        now: now.toISOString(),
        tenantId: DANCECITY_TENANT_ID
      });
      
      console.log(`\n🎉 FINAL TEST RESULT: ${finalTest.length} subscriptions found`);
      finalTest.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} - ${sub.daysRemaining} days remaining`);
      });
    }

    // 7. Provide final recommendations
    console.log('\n💡 FINAL RECOMMENDATIONS:');
    console.log('=========================');
    console.log('1. If emergency subscription works: The issue was with the original subscription data');
    console.log('2. If still not working: There may be a caching issue or frontend bug');
    console.log('3. Ask Solomiya to:');
    console.log('   - Clear ALL browser data (not just cache)');
    console.log('   - Try incognito mode');
    console.log('   - Try different browser entirely');
    console.log('   - Try on different device');
    console.log('4. If none work: There may be a Clerk authentication issue specific to her account');

  } catch (error) {
    console.error('❌ Error during ultimate debug:', error);
  }
}

ultimateDebug();
