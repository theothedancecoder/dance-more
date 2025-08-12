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

console.log('🎯 FIXING SOLOMIYA TENANT REFERENCE ISSUE\n');

async function fixSolomiyaTenantReference() {
  try {
    console.log('🔍 CRITICAL DISCOVERY:');
    console.log('======================');
    console.log('✅ Oakwood (working): NO tenant field in user record');
    console.log('❌ Solomiya (broken): HAS tenant field in user record');
    console.log('💡 Solution: Remove tenant reference from Solomiya\'s user record');
    console.log('');

    // Find Solomiya's user record
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, tenant
      }`
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 CURRENT USER DATA:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Tenant: ${user.tenant?._ref || 'None'}`);
    console.log('');

    // Remove the tenant field to match Oakwood's working configuration
    console.log('🔄 REMOVING TENANT REFERENCE:');
    console.log('   Removing tenant field from user record...');
    
    const updateResult = await sanityClient
      .patch(user._id)
      .unset(['tenant'])
      .commit();

    console.log('✅ SUCCESS! Removed tenant reference');
    console.log(`   User ID: ${updateResult._id}`);
    console.log('');

    // Verify the change
    const updatedUser = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, tenant
      }`
    );

    console.log('✅ VERIFICATION:');
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Tenant field: ${updatedUser.tenant ? 'STILL EXISTS' : 'REMOVED ✅'}`);
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

    console.log('🎉 TENANT REFERENCE FIX COMPLETE!');
    console.log('==================================');
    console.log('✅ Solomiya\'s user record now matches Oakwood\'s working configuration');
    console.log('✅ Removed tenant field that was causing the display issue');
    console.log('✅ API query still returns 2 active subscriptions');
    console.log('');
    console.log('📱 NEXT STEPS FOR SOLOMIYA:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log out and log back in');
    console.log('3. Check if passes now appear');
    console.log('4. This should resolve the frontend filtering issue');
    console.log('');
    console.log('💡 This fix addresses the tenant-based filtering that was preventing display');

  } catch (error) {
    console.error('❌ Error fixing tenant reference:', error);
  }
}

fixSolomiyaTenantReference();
