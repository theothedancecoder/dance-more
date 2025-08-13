import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function cleanSolomiyaSubscriptions() {
  try {
    console.log('🧹 CLEANING SOLOMIYA\'S SUBSCRIPTIONS');
    console.log('====================================');
    
    // Get user
    const user = await client.fetch(`
      *[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email
      }
    `);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User:', user.name, '(' + user.email + ')');
    
    // Get all subscriptions
    const allSubs = await client.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id,
        passName,
        stripePaymentId,
        stripeSessionId,
        startDate,
        endDate,
        remainingClips,
        purchasePrice,
        isActive,
        _createdAt
      } | order(_createdAt desc)
    `, { userId: user._id });
    
    console.log(`\n📋 FOUND ${allSubs.length} SUBSCRIPTIONS:`);
    allSubs.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName || 'No name'}`);
      console.log(`      - ID: ${sub._id}`);
      console.log(`      - Stripe Payment: ${sub.stripePaymentId || 'None'}`);
      console.log(`      - Price: ${sub.purchasePrice || 'N/A'} NOK`);
      console.log(`      - Active: ${sub.isActive}`);
      console.log(`      - Created: ${sub._createdAt}`);
      console.log('');
    });
    
    // Identify the original paid subscription
    const originalSub = allSubs.find(sub => 
      sub.stripePaymentId === 'ch_3RuxfzL8HTHT1SQN1dOQxrhg' && 
      sub.purchasePrice === 250
    );
    
    if (!originalSub) {
      console.log('❌ Original 250 NOK subscription not found!');
      return;
    }
    
    console.log('✅ ORIGINAL SUBSCRIPTION IDENTIFIED:');
    console.log(`   ID: ${originalSub._id}`);
    console.log(`   Pass: ${originalSub.passName}`);
    console.log(`   Price: ${originalSub.purchasePrice} NOK`);
    console.log(`   Stripe ID: ${originalSub.stripePaymentId}`);
    
    // Find duplicates and test subscriptions to remove
    const toRemove = allSubs.filter(sub => 
      sub._id !== originalSub._id && (
        // Duplicates with same Stripe payment ID
        sub.stripePaymentId === 'ch_3RuxfzL8HTHT1SQN1dOQxrhg' ||
        // Emergency fix subscriptions
        sub.stripePaymentId === 'emergency_fix_solomiya' ||
        // Manual test subscriptions
        sub.stripePaymentId?.includes('manual_') ||
        sub.stripeSessionId?.includes('manual_') ||
        // Subscriptions with no Stripe ID (likely test data)
        (!sub.stripePaymentId && sub.passName === 'Open week Trial Pass')
      )
    );
    
    console.log(`\n🗑️ SUBSCRIPTIONS TO REMOVE (${toRemove.length}):`);
    toRemove.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.passName} - ${sub.stripePaymentId || 'No Stripe ID'}`);
    });
    
    if (toRemove.length === 0) {
      console.log('✅ No duplicate subscriptions to remove');
    } else {
      console.log('\n⚠️ REMOVING DUPLICATE SUBSCRIPTIONS...');
      
      for (const sub of toRemove) {
        try {
          await client.delete(sub._id);
          console.log(`   ✅ Deleted: ${sub.passName} (${sub._id})`);
        } catch (error) {
          console.log(`   ❌ Failed to delete ${sub._id}:`, error.message);
        }
      }
    }
    
    // Verify the original subscription is still valid and extend if needed
    console.log('\n🔧 VERIFYING ORIGINAL SUBSCRIPTION:');
    
    const now = new Date();
    const endDate = new Date(originalSub.endDate);
    const isExpired = endDate < now;
    
    console.log(`   End date: ${originalSub.endDate}`);
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Is expired: ${isExpired}`);
    
    if (isExpired) {
      console.log('\n⏰ EXTENDING EXPIRED SUBSCRIPTION:');
      
      // Extend by 30 days from now
      const newEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      await client
        .patch(originalSub._id)
        .set({
          endDate: newEndDate.toISOString(),
          isActive: true,
          updatedAt: now.toISOString()
        })
        .commit();
      
      console.log(`   ✅ Extended to: ${newEndDate.toISOString()}`);
      console.log(`   ✅ New expiry: ${newEndDate.toLocaleDateString()}`);
    } else {
      console.log('   ✅ Subscription is still valid');
    }
    
    // Final verification - test the API query
    console.log('\n🧪 FINAL API QUERY TEST:');
    
    const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
    const finalQuery = `*[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      type,
      passName,
      remainingClips,
      "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
    }`;
    
    const finalResult = await client.fetch(finalQuery, {
      sanityUserId: user._id,
      now: now.toISOString(),
      tenantId: DANCECITY_TENANT_ID
    });
    
    console.log(`   Active subscriptions found: ${finalResult.length}`);
    finalResult.forEach((sub, i) => {
      console.log(`     ${i+1}. ${sub.passName} - ${sub.remainingClips || 'Unlimited'} classes, ${sub.daysRemaining} days left`);
    });
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('====================================');
    console.log('✅ Duplicate subscriptions removed');
    console.log('✅ Original subscription verified/extended');
    console.log(`✅ API query returns ${finalResult.length} active subscription(s)`);
    console.log('');
    console.log('📱 NEXT STEPS FOR SOLOMIYA:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log out and log back in');
    console.log('3. Check "Your Active Passes" section');
    console.log(`4. Should see: ${finalResult.length} active pass(es)`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanSolomiyaSubscriptions();
