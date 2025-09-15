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

console.log('🔍 Checking hkts989@outlook.com Purchase');
console.log('======================================');

async function checkHkts989Purchase() {
  try {
    const customerEmail = 'hkts989@outlook.com';
    
    // 1. Find the user by email
    console.log(`\n👤 Looking for user: ${customerEmail}`);
    
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId,
        _createdAt
      }
    `, { email: customerEmail });

    if (!user) {
      console.log(`❌ User not found with email: ${customerEmail}`);
      
      // Check if there's a user with similar email
      const similarUsers = await sanityClient.fetch(`
        *[_type == "user" && email match "*hkts989*"] {
          _id,
          name,
          email,
          clerkId
        }
      `);
      
      if (similarUsers.length > 0) {
        console.log(`\n🔍 Found similar users:`);
        for (const simUser of similarUsers) {
          console.log(`   - ${simUser.name || 'No name'} (${simUser.email}) - ${simUser.clerkId}`);
        }
      }
      return;
    }

    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);

    // 2. Get all subscriptions for this user
    console.log(`\n📋 All Subscriptions for ${user.email}:`);
    
    const allSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) {
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
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now()),
        "validityPeriod": round((dateTime(endDate) - dateTime(_createdAt)) / 86400)
      }
    `, { userId: user._id });

    console.log(`Found ${allSubscriptions.length} total subscriptions:`);

    for (const sub of allSubscriptions) {
      console.log(`\n🎫 ${sub.passName}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   End Date: ${new Date(sub.endDate).toLocaleString()}`);
      console.log(`   Validity Period: ${sub.validityPeriod} days`);
      console.log(`   Days Remaining: ${sub.daysFromNow}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Is Expired: ${sub.isExpiredNow}`);
      console.log(`   Remaining Clips: ${sub.remainingClips}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
      console.log(`   Stripe Payment: ${sub.stripePaymentId || 'None'}`);
      
      // Check if this is a today's purchase
      const today = new Date();
      const createdDate = new Date(sub._createdAt);
      const isToday = createdDate.toDateString() === today.toDateString();
      
      if (isToday) {
        console.log(`   🆕 PURCHASED TODAY!`);
        
        if (sub.type === 'clipcard') {
          console.log(`   🎯 This is a CLIP CARD purchase`);
          
          if (sub.isActive && !sub.isExpiredNow && sub.remainingClips > 0) {
            console.log(`   ✅ WILL BE VISIBLE in student interface`);
          } else {
            console.log(`   ❌ WILL NOT BE VISIBLE: Active=${sub.isActive}, Expired=${sub.isExpiredNow}, Clips=${sub.remainingClips}`);
            
            if (sub.validityPeriod < 30) {
              console.log(`   🚨 ISSUE: Very short validity period (${sub.validityPeriod} days)!`);
            }
          }
        }
      }
    }

    // 3. Test the student API for this user
    console.log(`\n📡 Testing Student Passes API:`);
    
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
    `, { userId: user.clerkId });

    const activeSubscriptions = apiResult.filter(sub => sub.isActive && !sub.isExpired);
    
    console.log(`   API returned ${apiResult.length} total subscriptions`);
    console.log(`   Active, non-expired: ${activeSubscriptions.length}`);
    
    for (const sub of activeSubscriptions) {
      console.log(`   ✅ ${sub.passName} (${sub.type}) - ${sub.remainingDays} days remaining`);
    }

    // 4. Check for today's purchases specifically
    const today = new Date();
    const todaysPurchases = allSubscriptions.filter(sub => {
      const createdDate = new Date(sub._createdAt);
      return createdDate.toDateString() === today.toDateString();
    });

    if (todaysPurchases.length > 0) {
      console.log(`\n🆕 Today's Purchases (${todaysPurchases.length}):`);
      for (const purchase of todaysPurchases) {
        console.log(`   - ${purchase.passName} (${purchase.type})`);
        console.log(`     Created: ${new Date(purchase._createdAt).toLocaleString()}`);
        console.log(`     Expires: ${new Date(purchase.endDate).toLocaleString()}`);
        console.log(`     Status: ${purchase.isActive ? 'Active' : 'Inactive'}, ${purchase.isExpiredNow ? 'Expired' : 'Valid'}`);
        
        if (purchase.type === 'clipcard') {
          if (purchase.validityPeriod >= 80) {
            console.log(`     ✅ Clip card has proper validity period (${purchase.validityPeriod} days)`);
          } else {
            console.log(`     ❌ Clip card has short validity period (${purchase.validityPeriod} days) - may indicate issue`);
          }
        }
      }
    } else {
      console.log(`\n❌ No purchases found for today for this user`);
    }

  } catch (error) {
    console.error('❌ Error checking hkts989 purchase:', error);
  }
}

// Run the check
checkHkts989Purchase();
