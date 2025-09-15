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

console.log('🔍 Checking Today\'s Clip Card Purchases');
console.log('======================================');

async function checkTodaysClipCards() {
  try {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log(`📅 Checking purchases from: ${startOfDay.toLocaleString()}`);
    console.log(`📅 To: ${endOfDay.toLocaleString()}`);

    // 1. Check for any clip card subscriptions created today
    console.log('\n📋 Clip Card Subscriptions Created Today:');
    
    const todaysClipCards = await sanityClient.fetch(`
      *[_type == "subscription" && type == "clipcard" && _createdAt >= $startOfDay && _createdAt < $endOfDay] | order(_createdAt desc) {
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
        "validityPeriod": round((dateTime(endDate) - dateTime(_createdAt)) / 86400)
      }
    `, { 
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    if (todaysClipCards.length === 0) {
      console.log('✅ No clip card purchases found today');
    } else {
      console.log(`Found ${todaysClipCards.length} clip card purchases today:`);
      
      for (const sub of todaysClipCards) {
        console.log(`\n🎫 ${sub.passName}`);
        console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
        console.log(`   Clerk ID: ${sub.user?.clerkId}`);
        console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
        console.log(`   End Date: ${new Date(sub.endDate).toLocaleString()}`);
        console.log(`   Validity Period: ${sub.validityPeriod} days`);
        console.log(`   Days Remaining: ${sub.daysFromNow}`);
        console.log(`   Is Active: ${sub.isActive}`);
        console.log(`   Is Expired: ${sub.isExpiredNow}`);
        console.log(`   Remaining Clips: ${sub.remainingClips}`);
        console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
        console.log(`   Tenant: ${sub.tenant?.schoolName || 'No tenant'}`);
        
        // Check if this subscription will be visible in student interface
        if (sub.isActive && !sub.isExpiredNow && sub.remainingClips > 0) {
          console.log(`   ✅ WILL BE VISIBLE in student interface`);
          
          // Test the API for this specific user
          const userSubscriptions = await sanityClient.fetch(`
            *[_type == "subscription" && user->clerkId == $userId && isActive == true] {
              _id,
              passName,
              type,
              "isExpired": dateTime(endDate) < dateTime(now())
            }
          `, { userId: sub.user?.clerkId });
          
          const activeNonExpired = userSubscriptions.filter(s => !s.isExpired);
          console.log(`   📡 User's active passes: ${activeNonExpired.length}`);
          
        } else {
          console.log(`   ❌ WILL NOT BE VISIBLE: Active=${sub.isActive}, Expired=${sub.isExpiredNow}, Clips=${sub.remainingClips}`);
          
          if (sub.validityPeriod < 30) {
            console.log(`   🚨 ISSUE: Very short validity period (${sub.validityPeriod} days)!`);
            console.log(`   🚨 This suggests the pass configuration might still have issues`);
          }
        }
      }
    }

    // 2. Check for any Stripe sessions today that might not have created subscriptions
    console.log('\n\n💳 All Subscriptions Created Today (any type):');
    
    const allTodaysSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= $startOfDay && _createdAt < $endOfDay] | order(_createdAt desc) {
        _id,
        passName,
        type,
        user->{name, email},
        stripeSessionId,
        _createdAt
      }
    `, { 
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    console.log(`Found ${allTodaysSubscriptions.length} total subscriptions created today:`);
    
    for (const sub of allTodaysSubscriptions) {
      console.log(`\n💳 ${sub.passName} (${sub.type})`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
    }

    // 3. Verify current pass configuration
    console.log('\n\n🔧 Current Pass Configuration Status:');
    
    const currentPassConfig = await sanityClient.fetch(`
      *[_type == "pass" && name == "10 Single Clip Card"][0] {
        _id,
        name,
        validityType,
        validityDays,
        expiryDate,
        isActive,
        _updatedAt
      }
    `);

    if (currentPassConfig) {
      console.log(`\n🎫 "10 Single Clip Card" Configuration:`);
      console.log(`   Validity Type: ${currentPassConfig.validityType}`);
      console.log(`   Validity Days: ${currentPassConfig.validityDays}`);
      console.log(`   Fixed Expiry: ${currentPassConfig.expiryDate || 'None'}`);
      console.log(`   Is Active: ${currentPassConfig.isActive}`);
      console.log(`   Last Updated: ${new Date(currentPassConfig._updatedAt).toLocaleString()}`);
      
      if (currentPassConfig.validityType === 'days' && currentPassConfig.validityDays === 90) {
        console.log(`   ✅ Configuration looks correct - new purchases should work properly`);
      } else {
        console.log(`   ⚠️ Configuration might need attention`);
      }
    }

    // 4. Test what would happen with a purchase right now
    console.log('\n\n🧪 New Purchase Test:');
    const now = new Date();
    if (currentPassConfig && currentPassConfig.validityType === 'days' && currentPassConfig.validityDays) {
      const testExpiryDate = new Date(now.getTime() + currentPassConfig.validityDays * 24 * 60 * 60 * 1000);
      console.log(`   If someone bought "10 Single Clip Card" right now:`);
      console.log(`   Purchase time: ${now.toLocaleString()}`);
      console.log(`   Would expire: ${testExpiryDate.toLocaleString()}`);
      console.log(`   Validity: ${currentPassConfig.validityDays} days ✅`);
    } else {
      console.log(`   ❌ Cannot simulate - pass configuration incomplete`);
    }

  } catch (error) {
    console.error('❌ Error checking today\'s clip cards:', error);
  }
}

// Run the check
checkTodaysClipCards();
