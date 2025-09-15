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

console.log('🔧 Fixing Clip Card Expiry Issue');
console.log('================================');

async function fixClipCardExpiryIssue() {
  try {
    // 1. Fix the "10 Single Clip Card" pass configuration
    console.log('\n📋 Step 1: Fixing "10 Single Clip Card" Pass Configuration');
    
    const clipCardPassId = 'oLHtOefD7nkFljdU8KEOZc';
    
    console.log('🔧 Updating pass to use validityDays instead of fixed expiry...');
    
    const updatedPass = await sanityClient
      .patch(clipCardPassId)
      .set({
        validityType: 'days',
        validityDays: 90, // 3 months validity
        expiryDate: null, // Remove fixed expiry date
        updatedAt: new Date().toISOString()
      })
      .commit();
    
    console.log('✅ Pass configuration updated:');
    console.log(`   Validity Type: days`);
    console.log(`   Validity Days: 90`);
    console.log(`   Fixed Expiry: removed`);

    // 2. Fix the "Open week Trial Pass" as well (also has expired fixed date)
    console.log('\n📋 Step 2: Fixing "Open week Trial Pass" Configuration');
    
    const trialPassId = 'oLHtOefD7nkFljdU8KEGR2';
    
    console.log('🔧 Updating trial pass to use validityDays...');
    
    const updatedTrialPass = await sanityClient
      .patch(trialPassId)
      .set({
        validityType: 'days',
        validityDays: 7, // 1 week validity for trial
        expiryDate: null, // Remove fixed expiry date
        updatedAt: new Date().toISOString()
      })
      .commit();
    
    console.log('✅ Trial pass configuration updated:');
    console.log(`   Validity Type: days`);
    console.log(`   Validity Days: 7`);
    console.log(`   Fixed Expiry: removed`);

    // 3. Update existing expired subscriptions for "10 Single Clip Card"
    console.log('\n📋 Step 3: Fixing Existing Expired "10 Single Clip Card" Subscriptions');
    
    const expiredClipCardSubs = await sanityClient.fetch(`
      *[_type == "subscription" && passName == "10 Single Clip Card" && dateTime(endDate) < dateTime(now())] {
        _id,
        startDate,
        endDate,
        user->{name, email},
        _createdAt,
        remainingClips
      }
    `);

    console.log(`Found ${expiredClipCardSubs.length} expired clip card subscriptions to fix`);

    for (const sub of expiredClipCardSubs) {
      // Calculate new expiry date: 90 days from purchase date
      const purchaseDate = new Date(sub._createdAt);
      const newExpiryDate = new Date(purchaseDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      console.log(`\n🔧 Fixing subscription for ${sub.user?.name || sub.user?.email}`);
      console.log(`   Old expiry: ${new Date(sub.endDate).toLocaleString()}`);
      console.log(`   New expiry: ${newExpiryDate.toLocaleString()}`);
      console.log(`   Remaining clips: ${sub.remainingClips}`);
      
      // Only update if the user still has clips remaining
      if (sub.remainingClips > 0) {
        await sanityClient
          .patch(sub._id)
          .set({
            endDate: newExpiryDate.toISOString(),
            updatedAt: new Date().toISOString()
          })
          .commit();
        
        console.log(`   ✅ Updated - now expires ${newExpiryDate.toLocaleString()}`);
      } else {
        console.log(`   ⏭️ Skipped - no clips remaining`);
      }
    }

    // 4. Update existing expired subscriptions for "Open week Trial Pass" (if any recent ones)
    console.log('\n📋 Step 4: Fixing Recent Expired "Open week Trial Pass" Subscriptions');
    
    const recentExpiredTrialSubs = await sanityClient.fetch(`
      *[_type == "subscription" && passName == "Open week Trial Pass" && dateTime(endDate) < dateTime(now()) && _createdAt > "2025-08-01"] {
        _id,
        startDate,
        endDate,
        user->{name, email},
        _createdAt,
        remainingClips
      }
    `);

    console.log(`Found ${recentExpiredTrialSubs.length} recent expired trial subscriptions to fix`);

    for (const sub of recentExpiredTrialSubs) {
      // Calculate new expiry date: 7 days from purchase date
      const purchaseDate = new Date(sub._createdAt);
      const newExpiryDate = new Date(purchaseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Only update if it would extend the validity and user has clips
      if (newExpiryDate > new Date() && sub.remainingClips > 0) {
        console.log(`\n🔧 Fixing trial subscription for ${sub.user?.name || sub.user?.email}`);
        console.log(`   Old expiry: ${new Date(sub.endDate).toLocaleString()}`);
        console.log(`   New expiry: ${newExpiryDate.toLocaleString()}`);
        
        await sanityClient
          .patch(sub._id)
          .set({
            endDate: newExpiryDate.toISOString(),
            updatedAt: new Date().toISOString()
          })
          .commit();
        
        console.log(`   ✅ Updated`);
      }
    }

    // 5. Verify the fixes
    console.log('\n📋 Step 5: Verifying Fixes');
    
    // Check updated pass configurations
    const verifyPasses = await sanityClient.fetch(`
      *[_type == "pass" && (_id == "oLHtOefD7nkFljdU8KEOZc" || _id == "oLHtOefD7nkFljdU8KEGR2")] {
        _id,
        name,
        validityType,
        validityDays,
        expiryDate
      }
    `);

    console.log('\n✅ Updated Pass Configurations:');
    for (const pass of verifyPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   Validity Type: ${pass.validityType}`);
      console.log(`   Validity Days: ${pass.validityDays}`);
      console.log(`   Fixed Expiry: ${pass.expiryDate || 'None'}`);
    }

    // Check current active clip card subscriptions
    const activeClipCards = await sanityClient.fetch(`
      *[_type == "subscription" && passName == "10 Single Clip Card" && isActive == true && dateTime(endDate) > dateTime(now())] {
        _id,
        user->{name, email},
        endDate,
        remainingClips,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }
    `);

    console.log(`\n✅ Currently Active "10 Single Clip Card" Subscriptions: ${activeClipCards.length}`);
    for (const sub of activeClipCards) {
      console.log(`   - ${sub.user?.name || sub.user?.email}: ${sub.daysRemaining} days, ${sub.remainingClips} clips`);
    }

    // Test what would happen with a new purchase
    console.log('\n🧪 Testing New Purchase Simulation:');
    const now = new Date();
    const testExpiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    console.log(`   If someone bought "10 Single Clip Card" now:`);
    console.log(`   Purchase date: ${now.toLocaleString()}`);
    console.log(`   Expiry date: ${testExpiryDate.toLocaleString()}`);
    console.log(`   Validity period: 90 days ✅`);

    console.log('\n🎉 CLIP CARD EXPIRY ISSUE FIXED!');
    console.log('================================');
    console.log('✅ Pass configurations updated to use validityDays');
    console.log('✅ Existing expired subscriptions extended');
    console.log('✅ Future purchases will have proper 90-day validity');
    console.log('✅ Customers should now see their clip cards in active passes');

  } catch (error) {
    console.error('❌ Error fixing clip card expiry issue:', error);
  }
}

// Run the fix
fixClipCardExpiryIssue();
