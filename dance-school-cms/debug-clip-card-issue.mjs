import { config } from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔍 Debugging Clip Card Issue');
console.log('============================');

async function debugClipCardIssue() {
  try {
    // 1. Find all clip card passes (type: "multi")
    console.log('\n📋 Clip Card Passes:');
    const clipCardPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi"] | order(name asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive,
        tenant->{_id, schoolName},
        _createdAt
      }
    `);

    console.log(`Found ${clipCardPasses.length} clip card passes:`);
    for (const pass of clipCardPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Price: ${pass.price} NOK`);
      console.log(`   Classes: ${pass.classesLimit}`);
      console.log(`   Active: ${pass.isActive}`);
      console.log(`   Tenant: ${pass.tenant?.schoolName || 'No tenant'}`);
    }

    // 2. Find recent subscriptions for clip cards
    console.log('\n\n🔍 Recent Clip Card Subscriptions (last 30 days):');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const clipCardSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && type == "clipcard" && _createdAt > $thirtyDaysAgo] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        remainingClips,
        classesLimit,
        stripeSessionId,
        stripePaymentId,
        user->{_id, name, email, clerkId},
        tenant->{_id, schoolName},
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now())
      }
    `, { thirtyDaysAgo: thirtyDaysAgo.toISOString() });

    console.log(`Found ${clipCardSubscriptions.length} recent clip card subscriptions:`);
    for (const sub of clipCardSubscriptions) {
      console.log(`\n🎫 ${sub.passName}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'} (${sub.user?.clerkId})`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   End Date: ${new Date(sub.endDate).toLocaleString()}`);
      console.log(`   Days remaining: ${sub.daysFromNow}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Is Expired: ${sub.isExpiredNow}`);
      console.log(`   Remaining Clips: ${sub.remainingClips}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`   Stripe Payment: ${sub.stripePaymentId || 'None'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName || 'No tenant'}`);
    }

    // 3. Check for any subscriptions with type "multi" instead of "clipcard"
    console.log('\n\n🔍 Checking for subscriptions with type "multi":');
    const multiTypeSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && type == "multi" && _createdAt > $thirtyDaysAgo] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        remainingClips,
        classesLimit,
        stripeSessionId,
        user->{_id, name, email, clerkId},
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now())
      }
    `, { thirtyDaysAgo: thirtyDaysAgo.toISOString() });

    if (multiTypeSubscriptions.length > 0) {
      console.log(`⚠️ Found ${multiTypeSubscriptions.length} subscriptions with type "multi" (should be "clipcard"):`);
      for (const sub of multiTypeSubscriptions) {
        console.log(`\n🎫 ${sub.passName}`);
        console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
        console.log(`   Type: ${sub.type} (INCORRECT - should be "clipcard")`);
        console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
        console.log(`   Is Active: ${sub.isActive}`);
        console.log(`   Is Expired: ${sub.isExpiredNow}`);
      }
    } else {
      console.log('✅ No subscriptions found with incorrect type "multi"');
    }

    // 4. Check recent Stripe sessions for clip card purchases
    console.log('\n\n💳 Recent Stripe Sessions (last 7 days):');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > $sevenDaysAgo && stripeSessionId != null] | order(_createdAt desc) {
        _id,
        passName,
        type,
        stripeSessionId,
        stripePaymentId,
        user->{name, email, clerkId},
        _createdAt,
        isActive
      }
    `, { sevenDaysAgo: sevenDaysAgo.toISOString() });

    console.log(`Found ${recentSessions.length} recent Stripe sessions:`);
    for (const session of recentSessions) {
      console.log(`\n💳 ${session.passName}`);
      console.log(`   User: ${session.user?.name || session.user?.email || 'Unknown'}`);
      console.log(`   Type: ${session.type}`);
      console.log(`   Session ID: ${session.stripeSessionId}`);
      console.log(`   Created: ${new Date(session._createdAt).toLocaleString()}`);
      console.log(`   Active: ${session.isActive}`);
    }

    // 5. Check for orphaned Stripe sessions (payments without subscriptions)
    console.log('\n\n🔍 Checking for potential missing subscriptions...');
    
    // This would require checking Stripe directly, but let's check for any users who might have missing subscriptions
    const allUsers = await sanityClient.fetch(`
      *[_type == "user"] {
        _id,
        name,
        email,
        clerkId,
        "subscriptionCount": count(*[_type == "subscription" && user._ref == ^._id])
      }
    `);

    const usersWithoutSubscriptions = allUsers.filter(user => user.subscriptionCount === 0);
    console.log(`\n👥 Users without any subscriptions: ${usersWithoutSubscriptions.length}`);
    
    if (usersWithoutSubscriptions.length > 0 && usersWithoutSubscriptions.length < 10) {
      for (const user of usersWithoutSubscriptions) {
        console.log(`   - ${user.name || user.email} (${user.clerkId})`);
      }
    }

    // 6. Summary and recommendations
    console.log('\n\n📊 SUMMARY:');
    console.log(`   Clip card passes available: ${clipCardPasses.length}`);
    console.log(`   Recent clip card subscriptions: ${clipCardSubscriptions.length}`);
    console.log(`   Incorrect "multi" type subscriptions: ${multiTypeSubscriptions.length}`);
    console.log(`   Recent Stripe sessions: ${recentSessions.length}`);
    console.log(`   Users without subscriptions: ${usersWithoutSubscriptions.length}`);

    if (clipCardSubscriptions.length === 0 && recentSessions.length > 0) {
      console.log('\n🚨 POTENTIAL ISSUE: Recent Stripe sessions found but no clip card subscriptions!');
      console.log('   This suggests the webhook might not be creating subscriptions for clip cards.');
    }

    if (multiTypeSubscriptions.length > 0) {
      console.log('\n🚨 ISSUE FOUND: Subscriptions with incorrect type "multi" instead of "clipcard"');
      console.log('   These subscriptions might not appear in the student interface.');
    }

  } catch (error) {
    console.error('❌ Error debugging clip card issue:', error);
  }
}

// Run the debug
debugClipCardIssue();
