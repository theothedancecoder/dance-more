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

console.log('🔧 Fixing Pass Expiry Dates');
console.log('===========================');

async function fixPassExpiryDates() {
  try {
    // Get all subscriptions that might have incorrect expiry dates
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-08-01"] {
        _id,
        _createdAt,
        passId,
        passName,
        startDate,
        endDate,
        type,
        stripeSessionId,
        "pass": *[_type == "pass" && _id == ^.passId][0]{
          _id,
          name,
          type,
          validityType,
          validityDays,
          expiryDate
        }
      }
    `);

    console.log(`\n📊 Found ${subscriptions.length} subscriptions to check`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const subscription of subscriptions) {
      console.log(`\n🎫 Checking: ${subscription.passName} (${subscription._id})`);
      console.log(`   Current end date: ${subscription.endDate}`);
      console.log(`   Pass config:`, subscription.pass);

      if (!subscription.pass) {
        console.log(`   ⚠️ Pass not found, skipping`);
        skippedCount++;
        continue;
      }

      const pass = subscription.pass;
      let correctEndDate = null;

      // Calculate what the correct end date should be
      if (pass.validityType === 'date' && pass.expiryDate) {
        // Should use fixed expiry date
        correctEndDate = new Date(pass.expiryDate).toISOString();
        console.log(`   ✅ Should use fixed expiry: ${correctEndDate}`);
      } else if (pass.validityType === 'days' && pass.validityDays) {
        // Should calculate from start date + validity days
        const startDate = new Date(subscription.startDate);
        correctEndDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000).toISOString();
        console.log(`   ✅ Should calculate from start + ${pass.validityDays} days: ${correctEndDate}`);
      } else if (pass.validityDays) {
        // Fallback to validityDays
        const startDate = new Date(subscription.startDate);
        correctEndDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000).toISOString();
        console.log(`   ⚠️ Using fallback validityDays: ${correctEndDate}`);
      } else {
        console.log(`   ❌ No valid expiry configuration, skipping`);
        skippedCount++;
        continue;
      }

      // Check if current end date is wrong
      const currentEndDate = new Date(subscription.endDate).toISOString();
      const correctEndDateISO = new Date(correctEndDate).toISOString();

      if (currentEndDate !== correctEndDateISO) {
        console.log(`   🔧 FIXING: ${currentEndDate} -> ${correctEndDateISO}`);
        
        try {
          await sanityClient
            .patch(subscription._id)
            .set({
              endDate: correctEndDate,
              fixedAt: new Date().toISOString(),
              fixReason: 'Corrected expiry date calculation'
            })
            .commit();
          
          console.log(`   ✅ Fixed successfully`);
          fixedCount++;
        } catch (error) {
          console.error(`   ❌ Error fixing subscription:`, error);
        }
      } else {
        console.log(`   ✅ Already correct, no change needed`);
        skippedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Fixed: ${fixedCount} subscriptions`);
    console.log(`   Skipped: ${skippedCount} subscriptions`);
    console.log(`   Total: ${subscriptions.length} subscriptions`);

    if (fixedCount > 0) {
      console.log(`\n🎉 SUCCESS! Fixed ${fixedCount} subscription expiry dates`);
      console.log(`   Users should now see their passes as active instead of expired`);
    }

  } catch (error) {
    console.error('❌ Error fixing pass expiry dates:', error);
  }
}

// Run the fix
fixPassExpiryDates();
