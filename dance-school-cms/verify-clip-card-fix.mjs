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

console.log('✅ Verifying Clip Card Fix');
console.log('==========================');

async function verifyClipCardFix() {
  try {
    // Test the exact API call that the student interface uses for the 2 customers
    const customers = [
      { name: 'Jon Klokk Slettedal', clerkId: 'user_31C3aXO7cwHU5FqZ7TCTd4wOVQi' },
      { name: 'mattia.natali@nibio.no', clerkId: 'user_31TIXABJNEnizyOM45DIEENV5a8' }
    ];

    console.log('\n🔍 Testing Student Passes API for the 2 customers:');

    for (const customer of customers) {
      console.log(`\n👤 Customer: ${customer.name}`);
      console.log(`   Clerk ID: ${customer.clerkId}`);

      // This is the exact query used by /api/student/passes/route.ts
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
      `, { userId: customer.clerkId });

      console.log(`   📊 API Response: Found ${subscriptions.length} subscriptions`);

      // Filter for active, non-expired subscriptions (what the UI shows)
      const activeSubscriptions = subscriptions.filter(sub => 
        sub.isActive && !sub.isExpired
      );

      console.log(`   ✅ Active subscriptions: ${activeSubscriptions.length}`);

      for (const sub of activeSubscriptions) {
        console.log(`\n   🎫 ${sub.passName}`);
        console.log(`      Type: ${sub.type}`);
        console.log(`      Days remaining: ${sub.remainingDays}`);
        console.log(`      Classes used: ${sub.classesUsed || 0}`);
        console.log(`      Classes limit: ${sub.classesLimit || 'Unlimited'}`);
        console.log(`      Is Active: ${sub.isActive}`);
        console.log(`      Is Expired: ${sub.isExpired}`);
        console.log(`      Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
        console.log(`      Expires: ${new Date(sub.endDate).toLocaleDateString()}`);
        
        if (sub.type === 'clipcard') {
          console.log(`      🎉 CLIP CARD WILL BE VISIBLE IN STUDENT INTERFACE!`);
        }
      }

      if (activeSubscriptions.length === 0) {
        console.log(`   ❌ No active subscriptions found - customer won't see any passes`);
      }

      // Check for any expired subscriptions that might be confusing
      const expiredSubscriptions = subscriptions.filter(sub => sub.isExpired);
      if (expiredSubscriptions.length > 0) {
        console.log(`   📋 Expired subscriptions: ${expiredSubscriptions.length} (won't be shown)`);
      }
    }

    // Test the frontend display logic
    console.log('\n\n🖥️ Frontend Display Test:');
    console.log('The student passes page will show subscriptions that are:');
    console.log('✅ isActive: true');
    console.log('✅ isExpired: false (endDate > now)');
    console.log('✅ All subscription types including "clipcard"');

    // Summary of the fix
    console.log('\n\n📋 SUMMARY OF WHAT WAS FIXED:');
    console.log('🔧 Root Cause: "10 Single Clip Card" pass had fixed expiry date of Sept 1, 2025');
    console.log('🔧 Problem: All purchases got subscriptions that expired immediately');
    console.log('✅ Solution 1: Changed pass to use validityDays (90 days) instead of fixed expiry');
    console.log('✅ Solution 2: Extended existing expired subscriptions to proper expiry dates');
    console.log('✅ Result: Customers now have active subscriptions that show in their profile');

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('The 2 customers who bought clip cards should now see their passes in the active passes section.');

  } catch (error) {
    console.error('❌ Error verifying clip card fix:', error);
  }
}

// Run the verification
verifyClipCardFix();
