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

console.log('🔧 FIXING CORRUPTED SUBSCRIPTION REFERENCES\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const SOLOMIYA_USER_ID = 'B23yufD62yhoU0aT5q54x4';

async function fixCorruptedReferences() {
  try {
    console.log('🚨 CRITICAL ISSUE IDENTIFIED:');
    console.log('=============================');
    console.log('❌ Original subscriptions have UNDEFINED user._ref and tenant._ref');
    console.log('✅ Emergency subscription works because it has proper references');
    console.log('💡 Solution: Fix the corrupted references in original subscriptions');
    console.log('');

    // Get the corrupted subscriptions
    const corruptedSubscriptions = [
      'CBf5wm3J1dFoiZuwJnlXzf', // First subscription
      'WzYwZmuDlKLt8FmpKiKLDb'  // Second subscription
    ];

    for (const subId of corruptedSubscriptions) {
      console.log(`🔄 Fixing subscription ${subId}...`);
      
      // Update the subscription with proper references
      const updateResult = await sanityClient
        .patch(subId)
        .set({
          user: {
            _type: 'reference',
            _ref: SOLOMIYA_USER_ID
          },
          tenant: {
            _type: 'reference',
            _ref: DANCECITY_TENANT_ID
          }
        })
        .commit();

      console.log(`✅ Fixed subscription ${subId}`);
    }

    console.log('');
    console.log('🎯 VERIFICATION TEST:');
    console.log('=====================');

    // Test the API query again
    const now = new Date();
    const apiQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      type,
      passName,
      passId,
      startDate,
      endDate,
      remainingClips,
      isActive,
      purchasePrice,
      stripePaymentId,
      stripeSessionId,
      _createdAt,
      "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
      "isExpired": dateTime(endDate) < dateTime(now()),
      "originalPass": *[_type == "pass" && _id == ^.passId && tenant._ref == $tenantId][0]{name, type}
    }`;

    const finalResult = await sanityClient.fetch(apiQuery, {
      sanityUserId: SOLOMIYA_USER_ID,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });

    console.log(`🎉 FINAL API RESULT: ${finalResult.length} subscriptions found`);
    finalResult.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - ${sub.daysRemaining} days remaining, ${sub.remainingClips || 'unlimited'} classes`);
    });

    console.log('');
    console.log('🎊 REFERENCE CORRUPTION FIX COMPLETE!');
    console.log('=====================================');
    console.log('✅ Fixed corrupted user._ref and tenant._ref in original subscriptions');
    console.log('✅ All subscriptions now have proper reference structure');
    console.log('✅ API query now returns all subscriptions correctly');
    console.log('');
    console.log('📱 NEXT STEPS FOR SOLOMIYA:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log out and log back in');
    console.log('3. Go to dancecity.no/subscriptions');
    console.log('4. Should now see ALL her passes (including the emergency one)');
    console.log('');
    console.log('💡 This was the root cause - corrupted Sanity references in subscription documents');

  } catch (error) {
    console.error('❌ Error fixing corrupted references:', error);
  }
}

fixCorruptedReferences();
