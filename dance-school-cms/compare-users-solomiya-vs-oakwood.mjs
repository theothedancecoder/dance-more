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

console.log('🔍 COMPARING USERS: Solomiya vs Oakwood\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function compareUsers() {
  try {
    console.log('📊 USER COMPARISON ANALYSIS:');
    console.log('============================');
    
    // Get both users
    const solomiya = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId, role, createdAt, _createdAt, _updatedAt
      }`
    );

    const oakwood = await sanityClient.fetch(
      `*[_type == "user" && email == "oakwood338@gmail.com"][0] {
        _id, name, email, clerkId, role, createdAt, _createdAt, _updatedAt
      }`
    );

    if (!solomiya || !oakwood) {
      console.log('❌ One or both users not found');
      console.log('Solomiya found:', !!solomiya);
      console.log('Oakwood found:', !!oakwood);
      return;
    }

    console.log('👤 SOLOMIYA:');
    console.log(`   Name: ${solomiya.name}`);
    console.log(`   Email: ${solomiya.email}`);
    console.log(`   Clerk ID: ${solomiya.clerkId}`);
    console.log(`   Sanity ID: ${solomiya._id}`);
    console.log(`   Role: ${solomiya.role}`);
    console.log(`   Created: ${solomiya.createdAt || solomiya._createdAt}`);
    console.log(`   Updated: ${solomiya._updatedAt || 'Never'}`);
    console.log('');

    console.log('👤 OAKWOOD:');
    console.log(`   Name: ${oakwood.name}`);
    console.log(`   Email: ${oakwood.email}`);
    console.log(`   Clerk ID: ${oakwood.clerkId}`);
    console.log(`   Sanity ID: ${oakwood._id}`);
    console.log(`   Role: ${oakwood.role}`);
    console.log(`   Created: ${oakwood.createdAt || oakwood._createdAt}`);
    console.log(`   Updated: ${oakwood._updatedAt || 'Never'}`);
    console.log('');

    // Get subscriptions for both users with detailed comparison
    const solomiyaSubscriptions = await sanityClient.fetch(
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
        tenant->{_id, schoolName},
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "originalPass": *[_type == "pass" && _id == ^.passId][0]{_id, name, type, tenant}
      }`,
      { userId: solomiya._id }
    );

    const oakwoodSubscriptions = await sanityClient.fetch(
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
        tenant->{_id, schoolName},
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "originalPass": *[_type == "pass" && _id == ^.passId][0]{_id, name, type, tenant}
      }`,
      { userId: oakwood._id }
    );

    console.log('🎫 SUBSCRIPTION COMPARISON:');
    console.log('===========================');
    console.log(`Solomiya subscriptions: ${solomiyaSubscriptions.length}`);
    console.log(`Oakwood subscriptions: ${oakwoodSubscriptions.length}`);
    console.log('');

    console.log('📋 SOLOMIYA SUBSCRIPTIONS:');
    solomiyaSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName || 'No passName'}`);
      console.log(`      ID: ${sub._id}`);
      console.log(`      Type: ${sub.type}`);
      console.log(`      Pass ID: ${sub.passId}`);
      console.log(`      Active: ${sub.isActive}`);
      console.log(`      Expired: ${sub.isExpired}`);
      console.log(`      Days remaining: ${sub.daysRemaining}`);
      console.log(`      Tenant: ${sub.tenant?.schoolName} (${sub.tenant?._id})`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`      Created: ${sub._createdAt}`);
      console.log(`      Updated: ${sub._updatedAt || 'Never'}`);
      console.log(`      Original Pass: ${sub.originalPass?.name || 'NOT FOUND'} (${sub.originalPass?._id || 'N/A'})`);
      console.log('');
    });

    console.log('📋 OAKWOOD SUBSCRIPTIONS:');
    oakwoodSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName || 'No passName'}`);
      console.log(`      ID: ${sub._id}`);
      console.log(`      Type: ${sub.type}`);
      console.log(`      Pass ID: ${sub.passId}`);
      console.log(`      Active: ${sub.isActive}`);
      console.log(`      Expired: ${sub.isExpired}`);
      console.log(`      Days remaining: ${sub.daysRemaining}`);
      console.log(`      Tenant: ${sub.tenant?.schoolName} (${sub.tenant?._id})`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`      Created: ${sub._createdAt}`);
      console.log(`      Updated: ${sub._updatedAt || 'Never'}`);
      console.log(`      Original Pass: ${sub.originalPass?.name || 'NOT FOUND'} (${sub.originalPass?._id || 'N/A'})`);
      console.log('');
    });

    // Test the exact API query for both users
    console.log('🎯 API QUERY SIMULATION:');
    console.log('========================');
    
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

    const solomiyaApiResults = await sanityClient.fetch(apiQuery, {
      sanityUserId: solomiya._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    const oakwoodApiResults = await sanityClient.fetch(apiQuery, {
      sanityUserId: oakwood._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log(`Solomiya API results: ${solomiyaApiResults.length} subscriptions`);
    console.log(`Oakwood API results: ${oakwoodApiResults.length} subscriptions`);
    console.log('');

    // Identify the key differences
    console.log('🔍 KEY DIFFERENCES ANALYSIS:');
    console.log('============================');
    
    const differences = [];

    // Check user data differences
    if (solomiya.role !== oakwood.role) {
      differences.push(`Role: Solomiya(${solomiya.role}) vs Oakwood(${oakwood.role})`);
    }

    // Check subscription data differences
    if (solomiyaSubscriptions.length !== oakwoodSubscriptions.length) {
      differences.push(`Subscription count: Solomiya(${solomiyaSubscriptions.length}) vs Oakwood(${oakwoodSubscriptions.length})`);
    }

    if (solomiyaApiResults.length !== oakwoodApiResults.length) {
      differences.push(`API results: Solomiya(${solomiyaApiResults.length}) vs Oakwood(${oakwoodApiResults.length})`);
    }

    // Check for missing originalPass references
    const solomiyaMissingPass = solomiyaSubscriptions.filter(sub => !sub.originalPass);
    const oakwoodMissingPass = oakwoodSubscriptions.filter(sub => !sub.originalPass);

    if (solomiyaMissingPass.length > 0) {
      differences.push(`Solomiya has ${solomiyaMissingPass.length} subscriptions with missing originalPass`);
    }
    if (oakwoodMissingPass.length > 0) {
      differences.push(`Oakwood has ${oakwoodMissingPass.length} subscriptions with missing originalPass`);
    }

    // Check tenant references
    const solomiyaWrongTenant = solomiyaSubscriptions.filter(sub => sub.tenant?._id !== DANCECITY_TENANT_ID);
    const oakwoodWrongTenant = oakwoodSubscriptions.filter(sub => sub.tenant?._id !== DANCECITY_TENANT_ID);

    if (solomiyaWrongTenant.length > 0) {
      differences.push(`Solomiya has ${solomiyaWrongTenant.length} subscriptions with wrong tenant`);
    }
    if (oakwoodWrongTenant.length > 0) {
      differences.push(`Oakwood has ${oakwoodWrongTenant.length} subscriptions with wrong tenant`);
    }

    console.log('Identified differences:');
    if (differences.length === 0) {
      console.log('❌ NO OBVIOUS DATA DIFFERENCES FOUND');
      console.log('   This suggests the issue might be:');
      console.log('   • Clerk authentication specific to Solomiya');
      console.log('   • Browser/device specific issue');
      console.log('   • Timing issue with data synchronization');
    } else {
      differences.forEach((diff, index) => {
        console.log(`   ${index + 1}. ${diff}`);
      });
    }

    // Provide specific fix recommendations
    console.log('\n💡 SPECIFIC FIX RECOMMENDATIONS:');
    console.log('=================================');
    
    if (solomiyaApiResults.length === 0 && solomiyaSubscriptions.length > 0) {
      console.log('🚨 CRITICAL ISSUE FOUND:');
      console.log('   Solomiya has subscriptions but API query returns none');
      console.log('   This means the API query conditions are failing');
      console.log('');
      
      // Check each condition
      const activeCount = solomiyaSubscriptions.filter(sub => sub.isActive).length;
      const nonExpiredCount = solomiyaSubscriptions.filter(sub => !sub.isExpired).length;
      const correctTenantCount = solomiyaSubscriptions.filter(sub => sub.tenant?._id === DANCECITY_TENANT_ID).length;
      
      console.log('   Condition analysis:');
      console.log(`   • isActive == true: ${activeCount}/${solomiyaSubscriptions.length} subscriptions`);
      console.log(`   • endDate > now: ${nonExpiredCount}/${solomiyaSubscriptions.length} subscriptions`);
      console.log(`   • tenant._ref == dancecity: ${correctTenantCount}/${solomiyaSubscriptions.length} subscriptions`);
      
      if (activeCount === 0) {
        console.log('   ❌ FIX NEEDED: Set isActive = true on subscriptions');
      }
      if (nonExpiredCount === 0) {
        console.log('   ❌ FIX NEEDED: Update endDate to future date');
      }
      if (correctTenantCount === 0) {
        console.log('   ❌ FIX NEEDED: Fix tenant reference');
      }
    }

  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }
}

compareUsers();
