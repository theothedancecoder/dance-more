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

console.log('🔧 Fixing Subscription Expiry Dates');
console.log('===================================');

async function fixSubscriptionExpiryDates() {
  try {
    // Get all subscriptions that might have incorrect expiry dates
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-08-12"] {
        _id,
        passName,
        passId,
        startDate,
        endDate,
        stripeSessionId,
        user->{_id, name, email},
        "pass": *[_type == "pass" && _id == ^.passId][0]{
          name,
          validityDays,
          validityType,
          expiryDate
        }
      }
    `);

    console.log(`\n📊 Found ${subscriptions.length} recent subscriptions to check:`);
    
    let fixedCount = 0;
    let skippedCount = 0;

    for (const sub of subscriptions) {
      console.log(`\n🎫 Checking subscription: ${sub.passName}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Current end date: ${sub.endDate}`);
      
      if (!sub.pass) {
        console.log(`   ⚠️  Pass not found, skipping`);
        skippedCount++;
        continue;
      }

      const startDate = new Date(sub.startDate);
      const currentEndDate = new Date(sub.endDate);
      let correctEndDate = null;

      // Calculate what the correct end date should be
      if (sub.pass.validityType === 'date' && sub.pass.expiryDate) {
        // Should use fixed expiry date
        correctEndDate = new Date(sub.pass.expiryDate);
        console.log(`   ✅ Should use fixed expiry: ${correctEndDate.toLocaleDateString()}`);
      } else if (sub.pass.validityType === 'days' && sub.pass.validityDays) {
        // Should use validity days from start date
        correctEndDate = new Date(startDate.getTime() + sub.pass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   ✅ Should use ${sub.pass.validityDays} days from start: ${correctEndDate.toLocaleDateString()}`);
      } else if (sub.pass.validityDays) {
        // Fallback to validityDays
        correctEndDate = new Date(startDate.getTime() + sub.pass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   ⚠️  Using fallback ${sub.pass.validityDays} days: ${correctEndDate.toLocaleDateString()}`);
      } else {
        console.log(`   ❌ Cannot determine correct expiry date`);
        skippedCount++;
        continue;
      }

      // Check if the current end date is significantly different from the correct one
      const timeDifference = Math.abs(correctEndDate.getTime() - currentEndDate.getTime());
      const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

      if (daysDifference > 1) { // More than 1 day difference
        console.log(`   🔧 FIXING: Current expiry is ${daysDifference.toFixed(1)} days off`);
        console.log(`   📅 Updating from ${currentEndDate.toLocaleDateString()} to ${correctEndDate.toLocaleDateString()}`);
        
        try {
          await sanityClient
            .patch(sub._id)
            .set({
              endDate: correctEndDate.toISOString(),
              updatedAt: new Date().toISOString(),
              // Add a note about the fix
              fixedExpiryDate: true,
              fixedAt: new Date().toISOString()
            })
            .commit();
          
          console.log(`   ✅ Successfully updated subscription ${sub._id}`);
          fixedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to update subscription ${sub._id}:`, error);
        }
      } else {
        console.log(`   ✅ Expiry date is correct (difference: ${daysDifference.toFixed(1)} days)`);
        skippedCount++;
      }
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Fixed subscriptions: ${fixedCount}`);
    console.log(`   Skipped (correct/no-pass): ${skippedCount}`);
    console.log(`   Total checked: ${subscriptions.length}`);

    if (fixedCount > 0) {
      console.log(`\n🎉 Successfully fixed ${fixedCount} subscription expiry dates!`);
      console.log(`   Customers should now see correct expiry dates on their mobile devices.`);
    }

  } catch (error) {
    console.error('❌ Error fixing subscription expiry dates:', error);
  }
}

// Run the fix
fixSubscriptionExpiryDates();
