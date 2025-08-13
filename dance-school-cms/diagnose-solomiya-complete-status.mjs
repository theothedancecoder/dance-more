import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function diagnoseSolomiyaCompleteStatus() {
  try {
    console.log('🔍 COMPLETE SOLOMIYA DIAGNOSIS');
    console.log('==============================');
    
    // Find Solomiya's user
    const user = await client.fetch(`
      *[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId, role
      }
    `);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 USER DETAILS:');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Sanity ID:', user._id);
    console.log('   Clerk ID:', user.clerkId);
    console.log('   Role:', user.role);
    
    const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('');
    console.log('⏰ TIME CONTEXT:');
    console.log('   Current time:', now.toISOString());
    console.log('   30 days ago:', thirtyDaysAgo.toISOString());
    
    // Test the EXACT API queries from the route
    console.log('');
    console.log('🧪 TESTING EXACT API QUERIES:');
    console.log('==============================');
    
    // 1. Active subscriptions query (what should show in "Your Active Passes")
    console.log('1️⃣ ACTIVE SUBSCRIPTIONS QUERY:');
    const activeQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
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
    
    const activeSubscriptions = await client.fetch(activeQuery, {
      sanityUserId: user._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });
    
    console.log('   Results:', activeSubscriptions.length, 'active subscriptions');
    activeSubscriptions.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName} - Days remaining: ${sub.daysRemaining}`);
    });
    
    // 2. Expired subscriptions query (what should show in "History")
    console.log('');
    console.log('2️⃣ EXPIRED SUBSCRIPTIONS QUERY:');
    const expiredQuery = `*[_type == "subscription" && user._ref == $sanityUserId && (isActive == false || endDate <= $now) && endDate >= $thirtyDaysAgo && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      type,
      passName,
      startDate,
      endDate,
      remainingClips,
      isActive,
      purchasePrice,
      _createdAt,
      "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
      "isExpired": dateTime(endDate) < dateTime(now())
    }`;
    
    const expiredSubscriptions = await client.fetch(expiredQuery, {
      sanityUserId: user._id,
      now: now.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });
    
    console.log('   Results:', expiredSubscriptions.length, 'expired subscriptions');
    expiredSubscriptions.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName} - Expired ${Math.abs(sub.daysRemaining)} days ago`);
    });
    
    // 3. ALL subscriptions for this user (debug)
    console.log('');
    console.log('3️⃣ ALL USER SUBSCRIPTIONS (DEBUG):');
    const allSubscriptions = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        stripePaymentId,
        tenant->{_id, schoolName},
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { userId: user._id });
    
    console.log('   Total subscriptions:', allSubscriptions.length);
    allSubscriptions.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName}`);
      console.log(`      - Tenant: ${sub.tenant?.schoolName || 'Unknown'}`);
      console.log(`      - Active: ${sub.isActive}`);
      console.log(`      - Days from now: ${sub.daysFromNow}`);
      console.log(`      - Is expired: ${sub.isExpired}`);
      console.log(`      - Stripe ID: ${sub.stripePaymentId}`);
    });
    
    // 4. Check if the specific subscription exists
    console.log('');
    console.log('4️⃣ SPECIFIC SUBSCRIPTION CHECK:');
    const specificSub = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId && stripePaymentId == "ch_3RuxfzL8HTHT1SQN1dOQxrhg"][0] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        stripePaymentId,
        stripeSessionId,
        tenant->{_id, schoolName},
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "shouldBeInActive": isActive == true && dateTime(endDate) > dateTime(now()),
        "shouldBeInExpired": (isActive == false || dateTime(endDate) <= dateTime(now())) && dateTime(endDate) >= dateTime($thirtyDaysAgo)
      }
    `, { 
      userId: user._id,
      thirtyDaysAgo: thirtyDaysAgo.toISOString()
    });
    
    if (specificSub) {
      console.log('   ✅ Found the 250 NOK subscription:');
      console.log('      - ID:', specificSub._id);
      console.log('      - Pass:', specificSub.passName);
      console.log('      - Active:', specificSub.isActive);
      console.log('      - End date:', specificSub.endDate);
      console.log('      - Days from now:', specificSub.daysFromNow);
      console.log('      - Is expired:', specificSub.isExpired);
      console.log('      - Should be in ACTIVE list:', specificSub.shouldBeInActive);
      console.log('      - Should be in EXPIRED list:', specificSub.shouldBeInExpired);
      console.log('      - Tenant:', specificSub.tenant?.schoolName);
    } else {
      console.log('   ❌ Specific subscription not found!');
    }
    
    // 5. Summary and recommendations
    console.log('');
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Active passes (should show in app): ${activeSubscriptions.length}`);
    console.log(`Expired passes (should show in history): ${expiredSubscriptions.length}`);
    console.log(`Total user subscriptions: ${allSubscriptions.length}`);
    
    console.log('');
    console.log('💡 WHAT SOLOMIYA SHOULD SEE:');
    console.log('============================');
    
    if (activeSubscriptions.length > 0) {
      console.log('✅ In "Your Active Passes" section:');
      activeSubscriptions.forEach((sub, i) => {
        console.log(`   ${i+1}. ${sub.passName} (${sub.remainingClips || 'Unlimited'} classes, ${sub.daysRemaining} days left)`);
      });
    } else {
      console.log('❌ "Your Active Passes" section: EMPTY');
    }
    
    if (expiredSubscriptions.length > 0) {
      console.log('✅ In "Pass History" section:');
      expiredSubscriptions.forEach((sub, i) => {
        console.log(`   ${i+1}. ${sub.passName} (expired ${Math.abs(sub.daysRemaining)} days ago)`);
      });
    } else {
      console.log('❌ "Pass History" section: EMPTY');
    }
    
    // 6. Troubleshooting recommendations
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('===================');
    
    if (activeSubscriptions.length === 0 && expiredSubscriptions.length === 0) {
      console.log('🚨 CRITICAL: No subscriptions showing in either section!');
      console.log('   Possible causes:');
      console.log('   1. User authentication issue (Clerk ID mismatch)');
      console.log('   2. Tenant reference problem');
      console.log('   3. Frontend not calling the API correctly');
      console.log('   4. Browser cache/authentication issues');
    } else if (expiredSubscriptions.length > 0 && activeSubscriptions.length === 0) {
      console.log('✅ NORMAL: Subscription is expired and should show in history');
      console.log('   If Solomiya says she sees NO passes:');
      console.log('   1. Check if she\'s looking in the right section (History/Past Passes)');
      console.log('   2. Clear browser cache completely');
      console.log('   3. Try different browser/incognito mode');
    }
    
    console.log('');
    console.log('📱 NEXT STEPS:');
    console.log('==============');
    console.log('1. Ask Solomiya: "Do you see ANY passes in your account, even expired ones?"');
    console.log('2. Ask her to check both "Active Passes" AND "Pass History" sections');
    console.log('3. If she sees NOTHING: Authentication/frontend issue');
    console.log('4. If she sees expired pass: Explain it expired and offer to extend it');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseSolomiyaCompleteStatus();
