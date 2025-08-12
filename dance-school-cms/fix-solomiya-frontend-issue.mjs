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

console.log('🔧 COMPREHENSIVE FRONTEND FIX FOR SOLOMIYA\n');

async function diagnoseFrontendIssue() {
  try {
    // 1. Verify backend data one more time
    console.log('🔍 FINAL BACKEND VERIFICATION:');
    console.log('==============================');
    
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, clerkId
      }`
    );

    if (!user) {
      console.log('❌ CRITICAL: User not found');
      return;
    }

    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true] {
        _id, passName, type, endDate, remainingClips,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`,
      { userId: user._id }
    );

    console.log(`✅ User: ${user.name} (${user.email})`);
    console.log(`✅ Clerk ID: ${user.clerkId}`);
    console.log(`✅ Active subscriptions: ${subscriptions.length}`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - ${sub.daysRemaining} days remaining, ${sub.remainingClips} classes`);
    });

    // 2. Identify the most likely frontend issues
    console.log('\n🚨 MOST LIKELY FRONTEND ISSUES:');
    console.log('===============================');
    
    console.log('1. AUTHENTICATION PROBLEM:');
    console.log('   • Clerk session not properly initialized');
    console.log('   • JWT token not being sent with API requests');
    console.log('   • User logged in but Clerk context not working');
    console.log('');
    
    console.log('2. API CALL ISSUES:');
    console.log('   • Frontend making API call but getting 401/403 errors');
    console.log('   • Headers not being sent correctly (x-tenant-slug)');
    console.log('   • Network/CORS issues blocking the request');
    console.log('');
    
    console.log('3. COMPONENT RENDERING ISSUES:');
    console.log('   • Data received but not displayed due to React state issues');
    console.log('   • Conditional rendering logic hiding the passes');
    console.log('   • JavaScript errors preventing component updates');
    console.log('');

    // 3. Provide specific debugging steps
    console.log('🛠️ DEBUGGING STEPS FOR SOLOMIYA:');
    console.log('=================================');
    
    console.log('STEP 1: Check Browser Console');
    console.log('-----------------------------');
    console.log('1. Go to dancecity.no/subscriptions');
    console.log('2. Press F12 to open Developer Tools');
    console.log('3. Go to Console tab');
    console.log('4. Look for these specific messages:');
    console.log('   ✅ "User subscriptions data:" - Should show your passes');
    console.log('   ✅ "Active subscriptions:" - Should show 2 passes');
    console.log('   ❌ Any red error messages');
    console.log('   ❌ "Failed to fetch user subscriptions"');
    console.log('   ❌ "401 Unauthorized" or "403 Forbidden"');
    console.log('');

    console.log('STEP 2: Check Network Tab');
    console.log('-------------------------');
    console.log('1. In Developer Tools, go to Network tab');
    console.log('2. Refresh the page');
    console.log('3. Look for API call to "/api/user/subscriptions"');
    console.log('4. Click on it and check:');
    console.log('   ✅ Status should be 200 OK');
    console.log('   ✅ Response should contain your 2 passes');
    console.log('   ❌ If status is 401/403: Authentication problem');
    console.log('   ❌ If no API call appears: Frontend not making the request');
    console.log('');

    console.log('STEP 3: Force Refresh Authentication');
    console.log('------------------------------------');
    console.log('1. Log out completely from the website');
    console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('3. Close all browser windows');
    console.log('4. Open new browser window');
    console.log('5. Go to dancecity.no');
    console.log('6. Log in with: miiamer88@gmail.com');
    console.log('7. Go to subscriptions page');
    console.log('');

    // 4. Provide manual API test
    console.log('🧪 MANUAL API TEST:');
    console.log('===================');
    console.log('If Solomiya is logged in, she can test the API directly:');
    console.log('');
    console.log('1. Go to dancecity.no/subscriptions');
    console.log('2. Open browser console (F12)');
    console.log('3. Paste this code and press Enter:');
    console.log('');
    console.log('```javascript');
    console.log('fetch("/api/user/subscriptions", {');
    console.log('  headers: { "x-tenant-slug": "dancecity" }');
    console.log('}).then(r => r.json()).then(data => {');
    console.log('  console.log("API Response:", data);');
    console.log('  if (data.activeSubscriptions) {');
    console.log('    console.log("✅ Found passes:", data.activeSubscriptions.length);');
    console.log('  } else {');
    console.log('    console.log("❌ No passes in response");');
    console.log('  }');
    console.log('});');
    console.log('```');
    console.log('');

    // 5. Expected results
    console.log('✅ EXPECTED RESULTS:');
    console.log('====================');
    console.log('After successful fix, Solomiya should see:');
    console.log('');
    console.log('• "Your Passes" section with "Active (2)" tab');
    console.log('• Two pass cards showing:');
    console.log('  1. "Open week Trial Pass" - 6 days remaining, 10 classes');
    console.log('  2. "Open week Trial Pass" - 29 days remaining, 10 classes');
    console.log('• "Book Classes" buttons on each pass');
    console.log('• Ability to click and book classes');
    console.log('');

    // 6. Emergency fallback
    console.log('🚨 IF NOTHING WORKS:');
    console.log('====================');
    console.log('1. Try different browser (Chrome, Firefox, Safari, Edge)');
    console.log('2. Try incognito/private mode');
    console.log('3. Try on different device (phone, tablet, another computer)');
    console.log('4. Check if other users can see their passes');
    console.log('5. Contact developer with:');
    console.log('   • Screenshots of what she sees');
    console.log('   • Browser console errors');
    console.log('   • Network tab showing API calls');
    console.log('   • Browser and device information');
    console.log('');

    // 7. Developer action items
    console.log('👨‍💻 DEVELOPER ACTION ITEMS:');
    console.log('============================');
    console.log('If user troubleshooting doesn\'t work:');
    console.log('');
    console.log('1. CHECK PRODUCTION ENVIRONMENT:');
    console.log('   • Verify API endpoints are deployed correctly');
    console.log('   • Check production environment variables');
    console.log('   • Test API endpoints directly in production');
    console.log('');
    console.log('2. CHECK CLERK AUTHENTICATION:');
    console.log('   • Verify Clerk is properly configured in production');
    console.log('   • Check if other users have the same issue');
    console.log('   • Test authentication flow end-to-end');
    console.log('');
    console.log('3. CHECK FRONTEND BUILD:');
    console.log('   • Verify latest frontend code is deployed');
    console.log('   • Check for any build errors or warnings');
    console.log('   • Test the subscriptions page functionality');
    console.log('');

    console.log('📞 SUPPORT SCRIPT:');
    console.log('==================');
    console.log('"Hi Solomiya! Your passes are definitely in our system.');
    console.log('We found the issue - it\'s a frontend display problem.');
    console.log('Please try these steps in order:');
    console.log('');
    console.log('1. Log out completely and clear your browser cache');
    console.log('2. Log back in and check your passes');
    console.log('3. If still not working, try a different browser');
    console.log('4. Check the browser console for any error messages');
    console.log('');
    console.log('Your passes are:');
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.passName} - ${sub.daysRemaining} days left, ${sub.remainingClips} classes`);
    });
    console.log('');
    console.log('If none of these steps work, please send us a screenshot');
    console.log('of what you see and any error messages in the console."');

  } catch (error) {
    console.error('❌ Error during frontend diagnosis:', error);
  }
}

diagnoseFrontendIssue();
