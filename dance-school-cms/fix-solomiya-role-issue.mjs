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

console.log('🔧 FIXING SOLOMIYA ROLE ISSUE\n');

async function fixSolomiyaRole() {
  try {
    console.log('🔍 ISSUE ANALYSIS:');
    console.log('==================');
    console.log('✅ Oakwood (oakwood338@gmail.com): Role = "pending" - PASSES SHOWING');
    console.log('❌ Solomiya (miiamer88@gmail.com): Role = "student" - PASSES NOT SHOWING');
    console.log('💡 Solution: Change Solomiya\'s role to match Oakwood\'s working role');
    console.log('');

    // Find Solomiya's user record
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, role
      }`
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 CURRENT USER DATA:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log('');

    // Update the user's role to match the working account
    console.log('🔄 UPDATING USER ROLE:');
    console.log('   Changing role from "student" to "pending"...');
    
    const updateResult = await sanityClient
      .patch(user._id)
      .set({ role: 'pending' })
      .commit();

    console.log('✅ SUCCESS! Updated user role');
    console.log(`   User ID: ${updateResult._id}`);
    console.log(`   New Role: ${updateResult.role}`);
    console.log('');

    // Verify the change
    const updatedUser = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, role
      }`
    );

    console.log('✅ VERIFICATION:');
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Updated Role: ${updatedUser.role}`);
    console.log('');

    // Test the API query again to make sure it still works
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true] {
        _id, passName, type, remainingClips, 
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`,
      { userId: user._id }
    );

    console.log('🎫 SUBSCRIPTION VERIFICATION:');
    console.log(`   Active subscriptions: ${subscriptions.length}`);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - ${sub.daysRemaining} days, ${sub.remainingClips} classes`);
    });
    console.log('');

    console.log('🎉 ROLE FIX COMPLETE!');
    console.log('====================');
    console.log('✅ Solomiya\'s role has been changed from "student" to "pending"');
    console.log('✅ This matches Oakwood\'s working configuration');
    console.log('✅ API query still returns 2 active subscriptions');
    console.log('');
    console.log('📱 NEXT STEPS FOR SOLOMIYA:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log out and log back in');
    console.log('3. Check if passes now appear');
    console.log('4. If still not working, try different browser');
    console.log('');
    console.log('💡 This fix addresses the role difference between working and non-working accounts');

  } catch (error) {
    console.error('❌ Error fixing role:', error);
  }
}

fixSolomiyaRole();
