import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔍 DEBUGGING ALL USERS ISSUE - Why NO passes are showing');

async function debugAllUsersIssue() {
  try {
    // 1. Get all users with subscriptions
    const allUsersWithSubs = await sanityClient.fetch(
      `*[_type == "subscription" && isActive == true] {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        user->{
          _id,
          email,
          clerkId,
          name
        },
        tenant->{
          _id,
          schoolName,
          "subdomain": subdomain.current
        }
      }`
    );

    console.log(`\n📊 Total active subscriptions in database: ${allUsersWithSubs.length}`);

    // Group by user
    const userGroups = {};
    allUsersWithSubs.forEach(sub => {
      const userEmail = sub.user?.email || 'Unknown';
      if (!userGroups[userEmail]) {
        userGroups[userEmail] = [];
      }
      userGroups[userEmail].push(sub);
    });

    console.log(`\n👥 Users with active subscriptions: ${Object.keys(userGroups).length}`);

    // 2. Test the API logic for each user
    console.log('\n🔍 Testing API logic for each user...\n');

    const now = new Date();
    let totalApiWouldReturn = 0;
    let totalActiveAfterFiltering = 0;

    for (const [email, subs] of Object.entries(userGroups)) {
      const user = subs[0].user;
      if (!user?.clerkId) {
        console.log(`❌ ${email}: No clerkId - SKIP`);
        continue;
      }

      // This is the exact API logic
      const userFromClerkId = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $clerkId][0] {
          _id,
          name,
          email,
          clerkId
        }`,
        { clerkId: user.clerkId }
      );

      if (!userFromClerkId) {
        console.log(`❌ ${email}: User not found by clerkId - SKIP`);
        continue;
      }

      const apiSubscriptions = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true] | order(_createdAt desc)`,
        { sanityUserId: userFromClerkId._id }
      );

      totalApiWouldReturn += apiSubscriptions.length;

      // Filter active subscriptions (not expired)
      const activeSubscriptions = apiSubscriptions.filter((sub) => 
        new Date(sub.endDate) > now
      );

      totalActiveAfterFiltering += activeSubscriptions.length;

      const status = activeSubscriptions.length > 0 ? '✅' : '❌';
      console.log(`${status} ${email}: ${apiSubscriptions.length} total → ${activeSubscriptions.length} active`);

      if (activeSubscriptions.length === 0 && apiSubscriptions.length > 0) {
        console.log(`   📅 Expired subscriptions:`);
        apiSubscriptions.forEach(sub => {
          const endDate = new Date(sub.endDate);
          const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          console.log(`      - ${sub.passName || sub.type}: expires ${sub.endDate} (${daysUntilExpiry} days)`);
        });
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Database: ${allUsersWithSubs.length} active subscriptions`);
    console.log(`   API would return: ${totalApiWouldReturn} subscriptions`);
    console.log(`   Active after date filtering: ${totalActiveAfterFiltering} subscriptions`);

    if (totalActiveAfterFiltering === 0) {
      console.log(`\n❌ CRITICAL ISSUE: NO ACTIVE SUBSCRIPTIONS AFTER FILTERING!`);
      console.log(`This explains why no passes are showing for anyone.`);
      
      // Check if it's a date issue
      console.log(`\n🔍 Checking subscription dates...`);
      const sampleSub = allUsersWithSubs[0];
      if (sampleSub) {
        console.log(`Sample subscription:`);
        console.log(`   Start: ${sampleSub.startDate}`);
        console.log(`   End: ${sampleSub.endDate}`);
        console.log(`   Current time: ${now.toISOString()}`);
        console.log(`   End date parsed: ${new Date(sampleSub.endDate).toISOString()}`);
        console.log(`   Is expired: ${new Date(sampleSub.endDate) < now}`);
      }
    } else {
      console.log(`\n✅ ${totalActiveAfterFiltering} users should see passes!`);
    }

    // 3. Check if there's a tenant filtering issue
    console.log(`\n🏢 Checking tenant associations...`);
    const tenantsInSubs = [...new Set(allUsersWithSubs.map(sub => sub.tenant?.schoolName).filter(Boolean))];
    console.log(`Tenants in subscriptions: ${tenantsInSubs.join(', ')}`);

  } catch (error) {
    console.error('❌ Error debugging all users issue:', error);
  }
}

debugAllUsersIssue();
