import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔧 FIXING SUBSCRIPTION DATES - Critical Issue Found!');

async function fixSubscriptionDates() {
  try {
    // Find all subscriptions with wrong dates (future dates or same start/end)
    const brokenSubscriptions = await writeClient.fetch(
      `*[_type == "subscription"] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        user->{email, name},
        tenant->{schoolName}
      }`
    );

    console.log(`\n📊 Found ${brokenSubscriptions.length} subscriptions to check`);

    const now = new Date();
    const fixedSubscriptions = [];

    for (const sub of brokenSubscriptions) {
      const startDate = new Date(sub.startDate);
      const endDate = new Date(sub.endDate);
      
      // Check if dates are wrong
      const startInFuture = startDate > now;
      const sameStartEnd = startDate.getTime() === endDate.getTime();
      const needsFix = startInFuture || sameStartEnd;

      if (needsFix) {
        console.log(`\n🔧 Fixing subscription: ${sub.passName || sub.type}`);
        console.log(`   User: ${sub.user?.email || 'Unknown'}`);
        console.log(`   Current start: ${sub.startDate}`);
        console.log(`   Current end: ${sub.endDate}`);
        console.log(`   Issues: ${startInFuture ? 'Start in future' : ''} ${sameStartEnd ? 'Same start/end' : ''}`);

        // Fix the dates
        const newStartDate = new Date(); // Now
        let newEndDate;

        // Determine proper end date based on pass type
        if (sub.type === 'clipcard' || sub.type === 'multi-pass') {
          // Multi-class passes: 30 days validity
          newEndDate = new Date(newStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else if (sub.type === 'single') {
          // Single class: 7 days validity
          newEndDate = new Date(newStartDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        } else if (sub.type === 'monthly') {
          // Monthly unlimited: 30 days
          newEndDate = new Date(newStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else {
          // Default: 30 days
          newEndDate = new Date(newStartDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        }

        console.log(`   New start: ${newStartDate.toISOString()}`);
        console.log(`   New end: ${newEndDate.toISOString()}`);

        // Update the subscription
        await writeClient
          .patch(sub._id)
          .set({
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString(),
            isActive: true
          })
          .commit();

        fixedSubscriptions.push({
          id: sub._id,
          user: sub.user?.email,
          passName: sub.passName || sub.type,
          oldStart: sub.startDate,
          oldEnd: sub.endDate,
          newStart: newStartDate.toISOString(),
          newEnd: newEndDate.toISOString()
        });

        console.log(`   ✅ Fixed!`);
      }
    }

    console.log(`\n🎉 FIXED ${fixedSubscriptions.length} SUBSCRIPTIONS!`);
    
    if (fixedSubscriptions.length > 0) {
      console.log('\n📋 Summary of fixes:');
      fixedSubscriptions.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.user}: ${fix.passName}`);
        console.log(`   Start: ${fix.oldStart} → ${fix.newStart}`);
        console.log(`   End: ${fix.oldEnd} → ${fix.newEnd}`);
      });

      console.log('\n🚀 ALL PASSES SHOULD NOW BE VISIBLE!');
      console.log('Tell students to refresh their browser - passes will show immediately.');
    } else {
      console.log('\n✅ No subscriptions needed fixing.');
    }

  } catch (error) {
    console.error('❌ Error fixing subscription dates:', error);
  }
}

fixSubscriptionDates();
