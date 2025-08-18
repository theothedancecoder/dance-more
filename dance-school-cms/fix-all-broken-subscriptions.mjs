#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔧 FIXING ALL BROKEN SUBSCRIPTIONS');
console.log('='.repeat(50));

async function fixBrokenSubscriptions() {
  try {
    // Get all recent subscriptions that might have incorrect expiry dates
    console.log('1. Fetching recent subscriptions...');
    
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-08-01"] | order(_createdAt desc) {
        _id,
        _createdAt,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        user->{_id, name, email, clerkId},
        tenant->{_id, schoolName},
        stripeSessionId,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredByQuery": dateTime(endDate) < dateTime(now())
      }
    `);

    console.log(`Found ${recentSubscriptions.length} recent subscriptions to check`);

    // Get all passes to understand their correct validity
    const passes = await sanityClient.fetch(`
      *[_type == "pass"] {
        _id,
        name,
        type,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        price
      }
    `);

    const passLookup = {};
    passes.forEach(pass => {
      passLookup[pass._id] = pass;
    });

    console.log(`\n2. Analyzing subscriptions for issues...`);
    
    const subscriptionsToFix = [];
    
    for (const sub of recentSubscriptions) {
      const pass = passLookup[sub.passId];
      if (!pass) {
        console.log(`⚠️  Subscription ${sub._id}: Pass not found (${sub.passId})`);
        continue;
      }

      // Calculate what the correct end date should be
      const startDate = new Date(sub.startDate);
      let correctEndDate;

      if (pass.validityType === 'date' && pass.expiryDate) {
        // Use fixed expiry date
        correctEndDate = new Date(pass.expiryDate);
      } else if (pass.validityType === 'days' && pass.validityDays) {
        // Use validity days from start date
        correctEndDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      } else if (pass.validityDays) {
        // Fallback to validityDays if validityType is not set
        correctEndDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      } else {
        // Default fallback - 30 days
        correctEndDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const currentEndDate = new Date(sub.endDate);
      const timeDifference = Math.abs(correctEndDate.getTime() - currentEndDate.getTime());
      const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

      // If the difference is more than 1 day, it needs fixing
      if (daysDifference > 1) {
        subscriptionsToFix.push({
          subscription: sub,
          pass: pass,
          currentEndDate: currentEndDate,
          correctEndDate: correctEndDate,
          daysDifference: Math.round(daysDifference)
        });

        console.log(`\n🚨 NEEDS FIXING: ${sub.passName}`);
        console.log(`   Subscription ID: ${sub._id}`);
        console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
        console.log(`   Current End Date: ${currentEndDate.toLocaleString()}`);
        console.log(`   Correct End Date: ${correctEndDate.toLocaleString()}`);
        console.log(`   Difference: ${Math.round(daysDifference)} days`);
        console.log(`   Pass Config: validityType=${pass.validityType}, validityDays=${pass.validityDays}, expiryDate=${pass.expiryDate}`);
      }
    }

    console.log(`\n3. Summary:`);
    console.log(`   Total subscriptions checked: ${recentSubscriptions.length}`);
    console.log(`   Subscriptions needing fixes: ${subscriptionsToFix.length}`);

    if (subscriptionsToFix.length === 0) {
      console.log('✅ No subscriptions need fixing!');
      return;
    }

    console.log(`\n4. Applying fixes...`);
    
    let fixedCount = 0;
    let errorCount = 0;

    for (const fix of subscriptionsToFix) {
      try {
        console.log(`\n🔧 Fixing: ${fix.subscription.passName} (${fix.subscription._id})`);
        
        await sanityClient
          .patch(fix.subscription._id)
          .set({
            endDate: fix.correctEndDate.toISOString(),
            updatedAt: new Date().toISOString()
          })
          .commit();

        console.log(`   ✅ Fixed: ${fix.currentEndDate.toLocaleDateString()} → ${fix.correctEndDate.toLocaleDateString()}`);
        fixedCount++;

      } catch (error) {
        console.error(`   ❌ Error fixing ${fix.subscription._id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n5. Results:`);
    console.log(`   ✅ Successfully fixed: ${fixedCount} subscriptions`);
    console.log(`   ❌ Errors: ${errorCount} subscriptions`);
    
    if (fixedCount > 0) {
      console.log(`\n🎉 All broken subscriptions have been fixed!`);
      console.log(`   Customers should now see correct expiry dates for their passes.`);
    }

  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
  }
}

fixBrokenSubscriptions();
