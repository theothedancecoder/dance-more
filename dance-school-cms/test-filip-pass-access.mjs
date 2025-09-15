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

console.log('🧪 TESTING FILIP\'S PASS ACCESS');
console.log('==============================');
console.log('Simulating what Filip should see when he logs in...\n');

async function testFilipPassAccess() {
  try {
    const FILIP_CLERK_ID = 'user_31kIXkrNmwZxOopL9j3WmIe9Lqj';
    
    console.log('🔍 Testing API endpoint simulation for Filip...');
    console.log(`Clerk ID: ${FILIP_CLERK_ID}`);
    console.log(`Email: fjmichalski@gmail.com\n`);
    
    // Simulate the exact query used by /api/student/passes/route.ts
    const subscriptions = await sanityClient.fetch(`
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
    `, { userId: FILIP_CLERK_ID });
    
    console.log('📊 API RESPONSE SIMULATION:');
    console.log('===========================');
    console.log(`Total subscriptions found: ${subscriptions.length}\n`);
    
    if (subscriptions.length === 0) {
      console.log('❌ PROBLEM: API returns no subscriptions for Filip!');
      console.log('This means Filip won\'t see any passes in his account.');
      console.log('\n🔧 SOLUTION: Filip needs to log in with the correct email: fjmichalski@gmail.com');
      return;
    }
    
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. SUBSCRIPTION: ${sub._id}`);
      console.log(`   Pass Name: ${sub.passName}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Start Date: ${new Date(sub.startDate).toLocaleDateString()}`);
      console.log(`   End Date: ${new Date(sub.endDate).toLocaleDateString()}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Is Expired: ${sub.isExpired}`);
      console.log(`   Remaining Days: ${sub.remainingDays}`);
      console.log(`   Classes Used: ${sub.classesUsed || 0} / ${sub.classesLimit || '∞'}`);
      
      // Determine status badge
      let statusBadge;
      if (sub.isExpired) {
        statusBadge = '🔴 EXPIRED';
      } else if (!sub.isActive) {
        statusBadge = '⚫ INACTIVE';
      } else if (sub.remainingDays <= 7) {
        statusBadge = '🟡 EXPIRES SOON';
      } else {
        statusBadge = '🟢 ACTIVE';
      }
      
      console.log(`   Status Badge: ${statusBadge}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // Check active subscriptions specifically
    const activeSubscriptions = subscriptions.filter(sub => 
      sub.isActive && !sub.isExpired && sub.remainingDays > 0
    );
    
    console.log('🎯 ACTIVE SUBSCRIPTIONS SUMMARY:');
    console.log('================================');
    console.log(`Filip should see ${activeSubscriptions.length} active pass(es):\n`);
    
    activeSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ✅ ${sub.passName}`);
      console.log(`   Valid for ${sub.remainingDays} more days`);
      console.log(`   Classes remaining: ${sub.classesLimit ? (sub.classesLimit - (sub.classesUsed || 0)) : '∞'}`);
      console.log('');
    });
    
    if (activeSubscriptions.length > 0) {
      console.log('🎉 SUCCESS: Filip HAS active passes!');
      console.log('\n📱 What Filip should see in the app:');
      console.log('- His passes page should show the active subscription(s) above');
      console.log('- He should be able to book classes');
      console.log('- The pass should show as "Active" with a green badge');
      
      console.log('\n❗ If Filip is NOT seeing these passes:');
      console.log('1. He may be logged in with a different email account');
      console.log('2. He needs to log out and log back in with: fjmichalski@gmail.com');
      console.log('3. Clear browser cache/cookies if needed');
      console.log('4. Try incognito/private browsing mode');
      
    } else {
      console.log('❌ No active passes found for Filip');
    }
    
    // Test booking capability
    console.log('\n🎫 BOOKING CAPABILITY TEST:');
    console.log('===========================');
    
    if (activeSubscriptions.length > 0) {
      const hasUnlimitedPass = activeSubscriptions.some(sub => !sub.classesLimit);
      const hasClassesRemaining = activeSubscriptions.some(sub => 
        !sub.classesLimit || (sub.classesLimit - (sub.classesUsed || 0)) > 0
      );
      
      if (hasUnlimitedPass || hasClassesRemaining) {
        console.log('✅ Filip CAN book classes');
        console.log('✅ He has valid passes with remaining classes/unlimited access');
      } else {
        console.log('❌ Filip CANNOT book classes - no remaining classes');
      }
    } else {
      console.log('❌ Filip CANNOT book classes - no active passes');
    }
    
    console.log('\n📞 FINAL RECOMMENDATION:');
    console.log('========================');
    console.log('Contact Filip and ask him to:');
    console.log('1. Confirm he is logging in with: fjmichalski@gmail.com');
    console.log('2. Log out completely from the app');
    console.log('3. Clear browser cache and cookies');
    console.log('4. Log back in with the correct email');
    console.log('5. Check his passes page again');
    console.log('\nIf he\'s still not seeing his pass after this, he may be using a different email to log in.');
    
  } catch (error) {
    console.error('❌ Error testing Filip\'s access:', error);
  }
}

// Run the test
testFilipPassAccess();
