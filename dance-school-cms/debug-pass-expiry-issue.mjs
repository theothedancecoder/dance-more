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

console.log('🔍 Debugging Pass Expiry Display Issue');
console.log('=====================================');

async function debugPassExpiryIssue() {
  try {
    // Get current time in different formats
    const now = new Date();
    const nowISO = now.toISOString();
    const nowLocal = now.toLocaleString();
    const nowUTC = now.toUTCString();
    
    console.log('\n📅 Current Time Analysis:');
    console.log('   JavaScript Date.now():', now);
    console.log('   ISO String:', nowISO);
    console.log('   Local String:', nowLocal);
    console.log('   UTC String:', nowUTC);
    console.log('   Timezone Offset (minutes):', now.getTimezoneOffset());

    // Get all recent subscriptions to analyze
    console.log('\n🔍 Fetching recent subscriptions...');
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-01-01"] | order(_createdAt desc) [0...10] {
        _id,
        _createdAt,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        user->{_id, name, email, clerkId},
        tenant->{_id, schoolName},
        stripeSessionId,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredByQuery": dateTime(endDate) < dateTime(now()),
        "endDateParsed": dateTime(endDate),
        "nowParsed": dateTime(now())
      }
    `);

    console.log(`\n📊 Found ${recentSubscriptions.length} recent subscriptions:`);
    
    for (const sub of recentSubscriptions) {
      console.log(`\n🎫 Subscription: ${sub.passName || 'Unknown Pass'}`);
      console.log(`   ID: ${sub._id}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName || 'Unknown'}`);
      console.log(`   Created: ${sub._createdAt}`);
      console.log(`   Start Date: ${sub.startDate}`);
      console.log(`   End Date: ${sub.endDate}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Days Remaining (Sanity): ${sub.daysRemaining}`);
      console.log(`   Is Expired (Sanity): ${sub.isExpiredByQuery}`);
      
      // JavaScript date comparison
      const endDate = new Date(sub.endDate);
      const jsIsExpired = endDate <= now;
      const jsDaysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      console.log(`   End Date (JS): ${endDate}`);
      console.log(`   Is Expired (JS): ${jsIsExpired}`);
      console.log(`   Days Remaining (JS): ${jsDaysRemaining}`);
      
      // Check for discrepancies
      if (sub.isExpiredByQuery !== jsIsExpired) {
        console.log(`   ⚠️  DISCREPANCY: Sanity says expired=${sub.isExpiredByQuery}, JS says expired=${jsIsExpired}`);
      }
      
      if (Math.abs(sub.daysRemaining - jsDaysRemaining) > 1) {
        console.log(`   ⚠️  DISCREPANCY: Sanity days=${sub.daysRemaining}, JS days=${jsDaysRemaining}`);
      }

      // Check if this looks like the problematic subscription
      if (jsDaysRemaining > 30 && sub.isExpiredByQuery) {
        console.log(`   🚨 POTENTIAL ISSUE: Pass should be valid for ${jsDaysRemaining} days but Sanity thinks it's expired!`);
      }
    }

    // Test the API query logic
    console.log('\n🧪 Testing API Query Logic:');
    const activeSubscriptionsQuery = `*[_type == "subscription" && isActive == true && endDate > $now] {
      _id,
      passName,
      endDate,
      "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
      "isExpired": dateTime(endDate) < dateTime(now())
    }`;
    
    const activeSubscriptions = await sanityClient.fetch(activeSubscriptionsQuery, { now: nowISO });
    console.log(`   Found ${activeSubscriptions.length} active subscriptions with endDate > now`);
    
    // Test with different date formats
    console.log('\n🔬 Testing Different Date Formats:');
    const testDates = [
      nowISO,
      now.toISOString().split('T')[0] + 'T00:00:00.000Z', // Start of day
      now.toISOString().split('T')[0] + 'T23:59:59.999Z', // End of day
    ];
    
    for (const testDate of testDates) {
      const count = await sanityClient.fetch(
        `count(*[_type == "subscription" && isActive == true && endDate > $testDate])`,
        { testDate }
      );
      console.log(`   Active subscriptions with endDate > ${testDate}: ${count}`);
    }

    // Check for timezone issues in stored dates
    console.log('\n🌍 Checking for Timezone Issues:');
    const subscriptionsWithDates = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-01-01"] [0...5] {
        _id,
        startDate,
        endDate,
        _createdAt
      }
    `);
    
    for (const sub of subscriptionsWithDates) {
      console.log(`\n   Subscription ${sub._id}:`);
      console.log(`     Start Date: ${sub.startDate}`);
      console.log(`     End Date: ${sub.endDate}`);
      console.log(`     Created At: ${sub._createdAt}`);
      
      // Check if dates have timezone info
      const hasTimezone = sub.endDate.includes('T') && (sub.endDate.includes('Z') || sub.endDate.includes('+') || sub.endDate.includes('-'));
      console.log(`     Has Timezone Info: ${hasTimezone}`);
      
      if (!hasTimezone) {
        console.log(`     ⚠️  Date might be missing timezone information!`);
      }
    }

    // Check webhook creation logic
    console.log('\n🔗 Checking Recent Webhook-Created Subscriptions:');
    const webhookSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && stripeSessionId != null && _createdAt > "2025-01-01"] | order(_createdAt desc) [0...5] {
        _id,
        _createdAt,
        startDate,
        endDate,
        stripeSessionId,
        passName,
        "createdFromWebhook": stripeSessionId != null
      }
    `);
    
    for (const sub of webhookSubscriptions) {
      console.log(`\n   Webhook Subscription ${sub._id}:`);
      console.log(`     Created: ${sub._createdAt}`);
      console.log(`     Start: ${sub.startDate}`);
      console.log(`     End: ${sub.endDate}`);
      console.log(`     Stripe Session: ${sub.stripeSessionId}`);
      
      // Check if the webhook used the correct date calculation
      const startDate = new Date(sub.startDate);
      const endDate = new Date(sub.endDate);
      const calculatedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      console.log(`     Calculated Validity Days: ${calculatedDays}`);
    }

  } catch (error) {
    console.error('❌ Error debugging pass expiry issue:', error);
  }
}

// Run the debug
debugPassExpiryIssue();
