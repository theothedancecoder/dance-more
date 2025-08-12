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

console.log('🔍 Diagnosing API issue for Solomiya (miiamer88@gmail.com)\n');

const userEmail = 'miiamer88@gmail.com';
const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function diagnoseApiIssue() {
  try {
    // 1. Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Sanity _id: ${user._id}`);

    // 2. Check Dancecity tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId][0] {
        _id, schoolName, slug
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log('\n🏢 Dancecity tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.schoolName}`);
    console.log(`   Slug: ${tenant.slug.current}`);

    // 3. Get all subscriptions for this user
    const allSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id,
        type,
        passName,
        passId,
        startDate,
        endDate,
        remainingClips,
        isActive,
        tenant->{_id, schoolName, slug},
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }`,
      { userId: user._id }
    );

    console.log(`\n📋 All subscriptions for user: ${allSubscriptions.length}`);
    allSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} (${sub.type})`);
      console.log(`      Tenant: ${sub.tenant?.schoolName} (${sub.tenant?._id})`);
      console.log(`      Active: ${sub.isActive}`);
      console.log(`      Expired: ${sub.isExpired}`);
      console.log(`      Days remaining: ${sub.daysRemaining}`);
      console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
      console.log(`      Remaining clips: ${sub.remainingClips || 'Unlimited'}`);
      console.log('');
    });

    // 4. Simulate the API query that the frontend uses
    const now = new Date();
    console.log(`🔍 Simulating API query (current time: ${now.toISOString()})`);
    
    const apiSubscriptions = await sanityClient.fetch(
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
      { 
        sanityUserId: user._id, 
        now: now.toISOString(), 
        tenantId: DANCECITY_TENANT_ID 
      }
    );

    console.log(`\n🎯 API Query Results: ${apiSubscriptions.length} active subscriptions`);
    if (apiSubscriptions.length > 0) {
      apiSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName || sub.originalPass?.name || 'Unknown Pass'}`);
        console.log(`      ID: ${sub._id}`);
        console.log(`      Type: ${sub.type}`);
        console.log(`      Days remaining: ${sub.daysRemaining}`);
        console.log(`      Remaining clips: ${sub.remainingClips || 'Unlimited'}`);
        console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
        console.log('');
      });
    } else {
      console.log('❌ No active subscriptions found by API query');
      console.log('\n🔍 Debugging API query conditions:');
      console.log(`   user._ref == "${user._id}": ✅`);
      console.log(`   isActive == true: Checking...`);
      console.log(`   endDate > "${now.toISOString()}": Checking...`);
      console.log(`   tenant._ref == "${DANCECITY_TENANT_ID}": Checking...`);
      
      // Check each condition separately
      const activeCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && isActive == true] {
          _id, passName, isActive, endDate, tenant->{_id, schoolName}
        }`,
        { userId: user._id }
      );
      console.log(`   Active subscriptions: ${activeCheck.length}`);
      
      const dateCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && endDate > $now] {
          _id, passName, endDate, "isExpired": dateTime(endDate) < dateTime(now())
        }`,
        { userId: user._id, now: now.toISOString() }
      );
      console.log(`   Non-expired subscriptions: ${dateCheck.length}`);
      
      const tenantCheck = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId] {
          _id, passName, tenant->{_id, schoolName}
        }`,
        { userId: user._id, tenantId: DANCECITY_TENANT_ID }
      );
      console.log(`   Dancecity subscriptions: ${tenantCheck.length}`);
    }

    // 5. Check if there are any issues with the subscription data
    console.log('\n🔧 Data integrity check:');
    const subscriptionsWithIssues = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id,
        passName,
        isActive,
        endDate,
        tenant,
        "hasTenantRef": defined(tenant._ref),
        "tenantExists": defined(*[_type == "tenant" && _id == ^.tenant._ref][0])
      }`,
      { userId: user._id }
    );

    subscriptionsWithIssues.forEach((sub, index) => {
      console.log(`   Subscription ${index + 1}: ${sub.passName}`);
      console.log(`      Has tenant reference: ${sub.hasTenantRef}`);
      console.log(`      Tenant exists: ${sub.tenantExists}`);
      console.log(`      Is active: ${sub.isActive}`);
      console.log(`      End date: ${sub.endDate}`);
    });

    console.log('\n💡 SUMMARY:');
    console.log(`   User exists: ✅`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Total subscriptions: ${allSubscriptions.length}`);
    console.log(`   API-visible subscriptions: ${apiSubscriptions.length}`);
    
    if (apiSubscriptions.length === 0 && allSubscriptions.length > 0) {
      console.log('\n🚨 ISSUE IDENTIFIED: Subscriptions exist but API query returns none');
      console.log('   This suggests a data integrity issue with the subscription records');
      console.log('   Possible causes:');
      console.log('   - Tenant reference mismatch');
      console.log('   - isActive flag set to false');
      console.log('   - endDate in the past');
      console.log('   - Missing or incorrect tenant association');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseApiIssue();
