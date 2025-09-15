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

console.log('🛠️ COMPREHENSIVE FIX: Missing Subscriptions for Course Passes');
console.log('==============================================================');

async function fixMissingSubscriptions() {
  try {
    // 1. Get all users without subscriptions since Sept 1
    console.log('\n1️⃣ IDENTIFYING AFFECTED USERS');
    console.log('===============================');
    
    const usersWithoutSubs = await sanityClient.fetch(`
      *[_type == "user" && _createdAt >= "2025-09-01T00:00:00Z" && count(*[_type == "subscription" && user._ref == ^._id]) == 0] | order(_createdAt desc) {
        _id,
        name,
        email,
        clerkId,
        _createdAt,
        role
      }
    `);

    console.log(`Found ${usersWithoutSubs.length} users without subscriptions:`);
    
    for (const user of usersWithoutSubs) {
      console.log(`   - ${user.email || 'No email'} (${user.name || 'No name'}) - Created: ${new Date(user._createdAt).toLocaleString()}`);
    }

    // 2. Get all available course passes for reference
    console.log('\n\n2️⃣ AVAILABLE COURSE PASSES');
    console.log('============================');
    
    const coursePasses = await sanityClient.fetch(`
      *[_type == "pass" && (name match "*course*" || name match "*Course*") && isActive == true] | order(name asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit
      }
    `);

    console.log(`Available course passes for manual subscription creation:`);
    for (const pass of coursePasses) {
      console.log(`   ${pass.name} (${pass._id}) - ${pass.price} NOK - Type: ${pass.type}`);
    }

    // 3. Create manual subscription function
    async function createManualSubscription(user, passId, passName, purchaseDate) {
      try {
        console.log(`\n🔧 Creating subscription for ${user.email}...`);
        
        // Get pass details
        const pass = await sanityClient.fetch(`
          *[_type == "pass" && _id == $passId][0] {
            _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
          }
        `, { passId });

        if (!pass) {
          console.log(`❌ Pass not found: ${passId}`);
          return false;
        }

        // Calculate subscription details
        const startDate = new Date(purchaseDate);
        let endDate;

        if (pass.validityType === 'date' && pass.expiryDate) {
          endDate = new Date(pass.expiryDate);
        } else if (pass.validityDays) {
          endDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
        } else {
          console.log(`❌ Pass has no valid expiry configuration`);
          return false;
        }

        let subscriptionType;
        let remainingClips;

        switch (pass.type) {
          case 'single':
            subscriptionType = 'single';
            remainingClips = 1;
            break;
          case 'multi-pass':
            subscriptionType = 'multi-pass';
            remainingClips = pass.classesLimit;
            break;
          case 'multi':
            subscriptionType = 'clipcard';
            remainingClips = pass.classesLimit;
            break;
          case 'unlimited':
            subscriptionType = 'monthly';
            remainingClips = undefined;
            break;
          default:
            console.log(`❌ Invalid pass type: ${pass.type}`);
            return false;
        }

        // Create subscription
        const subscriptionData = {
          _type: 'subscription',
          user: {
            _type: 'reference',
            _ref: user._id,
          },
          type: subscriptionType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          remainingClips,
          passId: pass._id,
          passName: pass.name,
          purchasePrice: pass.price,
          isActive: true,
          // Mark as manually created
          manuallyCreated: true,
          manualCreationReason: 'Webhook failed to create subscription',
          manualCreationDate: new Date().toISOString(),
        };

        console.log(`   Creating ${subscriptionType} subscription:`);
        console.log(`   - Pass: ${pass.name}`);
        console.log(`   - Classes: ${remainingClips || 'Unlimited'}`);
        console.log(`   - Valid from: ${startDate.toLocaleDateString()}`);
        console.log(`   - Valid until: ${endDate.toLocaleDateString()}`);

        const createdSubscription = await sanityClient.create(subscriptionData);
        console.log(`   ✅ Created subscription: ${createdSubscription._id}`);
        
        return true;
      } catch (error) {
        console.error(`   ❌ Error creating subscription for ${user.email}:`, error);
        return false;
      }
    }

    // 4. Manual subscription creation for specific known cases
    console.log('\n\n3️⃣ CREATING MISSING SUBSCRIPTIONS');
    console.log('===================================');
    
    // Known cases from the investigation
    const knownCases = [
      {
        email: 'hh-aaber@online.no',
        passName: '2 Course Pass',
        purchaseDate: '2025-09-14',
        passId: 'nP5GIt0J2mhTNRaq5gkAGs' // 2 Course Pass (multi-pass type)
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const knownCase of knownCases) {
      console.log(`\n🎯 Processing known case: ${knownCase.email}`);
      
      const user = usersWithoutSubs.find(u => u.email === knownCase.email);
      if (!user) {
        console.log(`❌ User not found in users without subscriptions list`);
        failCount++;
        continue;
      }

      const success = await createManualSubscription(
        user, 
        knownCase.passId, 
        knownCase.passName, 
        knownCase.purchaseDate
      );
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // 5. Interactive mode for other users
    console.log('\n\n4️⃣ OTHER USERS NEEDING MANUAL INTERVENTION');
    console.log('============================================');
    
    const otherUsers = usersWithoutSubs.filter(user => 
      !knownCases.some(kc => kc.email === user.email)
    );

    console.log(`${otherUsers.length} other users need manual investigation:`);
    
    for (const user of otherUsers) {
      console.log(`\n👤 ${user.email || 'No email'} (${user.name || 'No name'})`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   🔍 Action needed: Check Stripe dashboard for payment details`);
      console.log(`   📝 Then use createManualSubscription function with correct pass ID`);
    }

    // 6. Verification
    console.log('\n\n5️⃣ VERIFICATION');
    console.log('=================');
    
    // Check if hh-aaber now has a subscription
    const hhAaberUser = await sanityClient.fetch(`
      *[_type == "user" && email == "hh-aaber@online.no"][0] {
        _id,
        email,
        "subscriptions": *[_type == "subscription" && user._ref == ^._id] {
          _id,
          passName,
          type,
          isActive,
          endDate,
          "isExpired": dateTime(endDate) < dateTime(now())
        }
      }
    `);

    if (hhAaberUser && hhAaberUser.subscriptions.length > 0) {
      console.log(`✅ hh-aaber@online.no now has ${hhAaberUser.subscriptions.length} subscription(s):`);
      for (const sub of hhAaberUser.subscriptions) {
        console.log(`   - ${sub.passName} (${sub.type}) - Active: ${sub.isActive}, Expired: ${sub.isExpired}`);
      }
    } else {
      console.log(`❌ hh-aaber@online.no still has no subscriptions`);
    }

    // 7. Summary and next steps
    console.log('\n\n6️⃣ SUMMARY & NEXT STEPS');
    console.log('=========================');
    
    console.log(`📊 Results:`);
    console.log(`   Known cases processed: ${knownCases.length}`);
    console.log(`   Successful creations: ${successCount}`);
    console.log(`   Failed creations: ${failCount}`);
    console.log(`   Users needing manual investigation: ${otherUsers.length}`);
    
    console.log(`\n🛠️ IMMEDIATE ACTIONS COMPLETED:`);
    if (successCount > 0) {
      console.log(`✅ Created ${successCount} missing subscription(s)`);
    }
    
    console.log(`\n🔍 NEXT STEPS:`);
    console.log(`1. For each of the ${otherUsers.length} remaining users:`);
    console.log(`   - Check Stripe dashboard for their payment`);
    console.log(`   - Identify which pass they purchased`);
    console.log(`   - Use this script to create their subscription`);
    console.log(`2. Improve webhook error handling to prevent future issues`);
    console.log(`3. Set up monitoring for users without subscriptions`);
    
    console.log(`\n📋 WEBHOOK IMPROVEMENT RECOMMENDATIONS:`);
    console.log(`1. Add better error logging in webhook processing`);
    console.log(`2. Add retry mechanism for failed subscription creation`);
    console.log(`3. Add alerts for webhook processing failures`);
    console.log(`4. Validate pass configuration before processing`);

    // 8. Create a helper function for future manual subscriptions
    console.log(`\n\n7️⃣ HELPER FUNCTION FOR FUTURE USE`);
    console.log('===================================');
    
    console.log(`To create a subscription for any user, use:`);
    console.log(`await createManualSubscription(user, passId, passName, purchaseDate)`);
    console.log(`\nAvailable pass IDs:`);
    for (const pass of coursePasses) {
      console.log(`   ${pass.name}: ${pass._id}`);
    }

  } catch (error) {
    console.error('❌ Error in comprehensive fix:', error);
  }
}

// Run the fix
fixMissingSubscriptions();
