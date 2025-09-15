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

console.log('🔧 FIXING FILIP\'S CLERK ID MISMATCH');
console.log('==================================');
console.log('Ensuring Filip can access his active pass...\n');

async function fixFilipClerkIdMismatch() {
  try {
    // 1. Get Filip's correct user record (the one with the active subscription)
    console.log('👤 STEP 1: Identifying Filip\'s Correct Account');
    console.log('==============================================');
    
    const filipWithActivePass = await sanityClient.fetch(`
      *[_type == "user" && name == "Filip Michalski" && email == "fjmichalski@gmail.com"][0] {
        _id, name, email, clerkId, role, _createdAt
      }
    `);
    
    if (!filipWithActivePass) {
      console.log('❌ Filip Michalski user record not found!');
      return;
    }
    
    console.log('✅ Found Filip\'s user record:');
    console.log(`   ID: ${filipWithActivePass._id}`);
    console.log(`   Name: ${filipWithActivePass.name}`);
    console.log(`   Email: ${filipWithActivePass.email}`);
    console.log(`   Current Clerk ID: ${filipWithActivePass.clerkId}`);
    console.log(`   Role: ${filipWithActivePass.role}`);
    
    // 2. Verify his active subscription
    console.log('\n🎫 STEP 2: Verifying Filip\'s Active Subscription');
    console.log('===============================================');
    
    const activeSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId && isActive == true && dateTime(endDate) > dateTime(now())][0] {
        _id,
        passName,
        type,
        startDate,
        endDate,
        classesUsed,
        remainingClips,
        purchasePrice,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400)
      }
    `, { userId: filipWithActivePass._id });
    
    if (!activeSubscription) {
      console.log('❌ No active subscription found for Filip!');
      return;
    }
    
    console.log('✅ Filip\'s active subscription confirmed:');
    console.log(`   Pass: ${activeSubscription.passName}`);
    console.log(`   Type: ${activeSubscription.type}`);
    console.log(`   Valid until: ${new Date(activeSubscription.endDate).toLocaleDateString()}`);
    console.log(`   Remaining days: ${activeSubscription.remainingDays}`);
    console.log(`   Classes used: ${activeSubscription.classesUsed || 0}`);
    console.log(`   Remaining clips: ${activeSubscription.remainingClips || 'N/A'}`);
    console.log(`   Purchase price: ${activeSubscription.purchasePrice} kr`);
    
    // 3. Check what the API currently returns for Filip's Clerk ID
    console.log('\n🔍 STEP 3: Testing API Response for Filip\'s Clerk ID');
    console.log('===================================================');
    
    const apiResponse = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { clerkId: filipWithActivePass.clerkId });
    
    console.log(`API returns ${apiResponse.length} subscriptions for Clerk ID: ${filipWithActivePass.clerkId}`);
    
    if (apiResponse.length === 0) {
      console.log('❌ API returns no subscriptions - this is the problem!');
      console.log('🔧 The issue is likely that Filip is logging in with a different Clerk account');
    } else {
      console.log('✅ API correctly returns subscriptions:');
      apiResponse.forEach((sub, index) => {
        const status = sub.isExpired ? 'EXPIRED' : (sub.isActive ? 'ACTIVE' : 'INACTIVE');
        console.log(`   ${index + 1}. ${sub.passName} - ${status} (${sub.remainingDays} days remaining)`);
      });
    }
    
    // 4. Check for other potential Clerk IDs Filip might be using
    console.log('\n🔍 STEP 4: Checking for Alternative Clerk IDs');
    console.log('============================================');
    
    // Check if there are any recent users that might be Filip logging in with a different account
    const recentUsers = await sanityClient.fetch(`
      *[_type == "user" && _createdAt > "2025-08-20T00:00:00Z"] | order(_createdAt desc) {
        _id, name, email, clerkId, role, _createdAt
      }
    `);
    
    console.log(`Found ${recentUsers.length} recent users (since Aug 20, 2025):`);
    recentUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No name'} (${user.email || 'No email'})`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
      
      if (user.clerkId !== filipWithActivePass.clerkId) {
        console.log(`   🔍 This is a different Clerk ID - Filip might be using this account`);
      }
    });
    
    // 5. Provide solutions
    console.log('\n💡 STEP 5: Solutions and Next Steps');
    console.log('==================================');
    
    console.log('\n🎯 IDENTIFIED ISSUE:');
    console.log('Filip Michalski has an active subscription, but it may not be showing up because:');
    console.log('1. He\'s logging in with a different Clerk account than the one linked to his subscription');
    console.log('2. There might be multiple user accounts for Filip');
    
    console.log('\n🔧 RECOMMENDED SOLUTIONS:');
    console.log('\n📧 OPTION 1: Ask Filip to verify his login email');
    console.log(`   - His subscription is linked to: ${filipWithActivePass.email}`);
    console.log(`   - His Clerk ID should be: ${filipWithActivePass.clerkId}`);
    console.log('   - Ask him to log out and log back in with this exact email');
    
    console.log('\n🔄 OPTION 2: Update Clerk ID if he\'s using a different account');
    console.log('   - If Filip confirms he\'s logging in with a different email/account,');
    console.log('   - We can update his user record to match his current Clerk ID');
    
    console.log('\n🔗 OPTION 3: Merge accounts if multiple exist');
    console.log('   - If Filip has been creating multiple accounts, we can merge them');
    
    // 6. Create a quick fix script for updating Clerk ID if needed
    console.log('\n📝 STEP 6: Creating Quick Fix Function');
    console.log('====================================');
    
    console.log('\nIf you need to update Filip\'s Clerk ID, use this function:');
    console.log(`
async function updateFilipClerkId(newClerkId) {
  const result = await sanityClient
    .patch('${filipWithActivePass._id}')
    .set({ clerkId: newClerkId })
    .commit();
  
  console.log('✅ Updated Filip\'s Clerk ID to:', newClerkId);
  return result;
}
    `);
    
    console.log('\n🎉 SUMMARY:');
    console.log(`✅ Filip has an active subscription: "${activeSubscription.passName}"`);
    console.log(`✅ Valid for ${activeSubscription.remainingDays} more days`);
    console.log(`✅ Subscription is properly configured in the database`);
    console.log(`❗ Issue: Filip may be logging in with wrong account`);
    console.log(`🎯 Solution: Verify Filip is using email: ${filipWithActivePass.email}`);
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

// Function to update Clerk ID if needed
async function updateFilipClerkId(newClerkId) {
  try {
    const filipUser = await sanityClient.fetch(`
      *[_type == "user" && name == "Filip Michalski" && email == "fjmichalski@gmail.com"][0] {
        _id
      }
    `);
    
    if (!filipUser) {
      console.log('❌ Filip user not found');
      return;
    }
    
    const result = await sanityClient
      .patch(filipUser._id)
      .set({ clerkId: newClerkId })
      .commit();
    
    console.log('✅ Updated Filip\'s Clerk ID to:', newClerkId);
    console.log('✅ Filip should now be able to see his active pass');
    return result;
  } catch (error) {
    console.error('❌ Error updating Clerk ID:', error);
  }
}

// Export the update function for manual use
global.updateFilipClerkId = updateFilipClerkId;

// Run the diagnosis
fixFilipClerkIdMismatch();

console.log('\n📞 NEXT STEPS:');
console.log('1. Contact Filip and ask him to confirm which email he\'s using to log in');
console.log('2. If he\'s using fjmichalski@gmail.com, ask him to log out and back in');
console.log('3. If he\'s using a different email, get his current Clerk ID and run:');
console.log('   updateFilipClerkId("his_current_clerk_id")');
console.log('4. Test that he can see his active pass after the fix');
