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

console.log('🔍 Investigating Recent Clip Card Purchases');
console.log('==========================================');

async function investigateRecentClipCards() {
  try {
    // Focus on the 2 most recent clip card purchases that should be active
    console.log('\n📋 Most Recent Clip Card Purchases:');
    
    const recentClipCards = await sanityClient.fetch(`
      *[_type == "subscription" && type == "clipcard"] | order(_createdAt desc) [0...5] {
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
        "isExpiredNow": dateTime(endDate) < dateTime(now()),
        "hoursFromCreation": round((dateTime(now()) - dateTime(_createdAt)) / 3600)
      }
    `);

    for (const sub of recentClipCards) {
      console.log(`\n🎫 ${sub.passName}`);
      console.log(`   ID: ${sub._id}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Clerk ID: ${sub.user?.clerkId}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   Hours since creation: ${sub.hoursFromCreation}`);
      console.log(`   Start Date: ${new Date(sub.startDate).toLocaleString()}`);
      console.log(`   End Date: ${new Date(sub.endDate).toLocaleString()}`);
      console.log(`   Days remaining: ${sub.daysFromNow}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Is Expired: ${sub.isExpiredNow}`);
      console.log(`   Remaining Clips: ${sub.remainingClips}`);
      console.log(`   Classes Limit: ${sub.classesLimit}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName || 'No tenant'}`);
      
      // Check if this should be showing in student interface
      if (sub.isActive && !sub.isExpiredNow && sub.remainingClips > 0) {
        console.log(`   ✅ SHOULD BE VISIBLE in student interface`);
        
        // Test the API query that the student interface uses
        const apiResult = await sanityClient.fetch(`
          *[_type == "subscription" && user->clerkId == $userId] | order(_createdAt desc) {
            _id,
            passName,
            passId,
            type,
            startDate,
            endDate,
            isActive,
            classesUsed,
            classesLimit,
            stripeSessionId,
            paymentStatus,
            amount,
            currency,
            _createdAt,
            _updatedAt,
            "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
            "isExpired": dateTime(endDate) < dateTime(now())
          }
        `, { userId: sub.user?.clerkId });
        
        console.log(`   📡 API Query Result: Found ${apiResult.length} subscriptions for this user`);
        
        const thisSubscription = apiResult.find(s => s._id === sub._id);
        if (thisSubscription) {
          console.log(`   ✅ This subscription IS returned by the API`);
          console.log(`   📊 API Data: Active=${thisSubscription.isActive}, Expired=${thisSubscription.isExpired}, Type=${thisSubscription.type}`);
        } else {
          console.log(`   ❌ This subscription is NOT returned by the API!`);
          console.log(`   🔍 User's other subscriptions:`);
          for (const otherSub of apiResult) {
            console.log(`      - ${otherSub.passName} (${otherSub.type}) - Active: ${otherSub.isActive}, Expired: ${otherSub.isExpired}`);
          }
        }
      } else {
        console.log(`   ❌ Should NOT be visible: Active=${sub.isActive}, Expired=${sub.isExpiredNow}, Clips=${sub.remainingClips}`);
      }
    }

    // Check for any recent purchases without subscriptions
    console.log('\n\n🔍 Checking for Recent Stripe Sessions Without Subscriptions:');
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Get all recent Stripe sessions
    const allRecentSessions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > $twoDaysAgo && stripeSessionId != null] {
        stripeSessionId,
        passName,
        type,
        user->{name, email, clerkId}
      }
    `, { twoDaysAgo: twoDaysAgo.toISOString() });

    console.log(`Found ${allRecentSessions.length} recent sessions with subscriptions`);

    // Check if there are any users who made payments but don't have subscriptions
    console.log('\n\n🔍 Looking for Users with Recent Activity but Missing Clip Card Subscriptions:');
    
    // Get users who have made recent single purchases (drop-ins work) but might be missing clip cards
    const usersWithRecentActivity = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > $twoDaysAgo] {
        user->{_id, name, email, clerkId, "totalSubscriptions": count(*[_type == "subscription" && user._ref == ^._id])}
      }
    `, { twoDaysAgo: twoDaysAgo.toISOString() });

    const uniqueUsers = usersWithRecentActivity.reduce((acc, curr) => {
      if (!acc.find(u => u.user._id === curr.user._id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log(`Found ${uniqueUsers.length} users with recent activity:`);
    for (const userSub of uniqueUsers) {
      const user = userSub.user;
      console.log(`\n👤 ${user.name || user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Total Subscriptions: ${user.totalSubscriptions}`);
      
      // Get this user's subscription breakdown
      const userSubscriptions = await sanityClient.fetch(`
        *[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) {
          passName,
          type,
          isActive,
          _createdAt,
          "isExpired": dateTime(endDate) < dateTime(now())
        }
      `, { userId: user._id });
      
      const clipCards = userSubscriptions.filter(s => s.type === 'clipcard');
      const dropIns = userSubscriptions.filter(s => s.type === 'single');
      
      console.log(`   Clip Cards: ${clipCards.length}`);
      console.log(`   Drop-ins: ${dropIns.length}`);
      
      if (dropIns.length > 0 && clipCards.length === 0) {
        console.log(`   🚨 POTENTIAL ISSUE: User has drop-ins but no clip cards - might be missing clip card purchases`);
      }
    }

  } catch (error) {
    console.error('❌ Error investigating recent clip cards:', error);
  }
}

// Run the investigation
investigateRecentClipCards();
