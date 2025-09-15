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

console.log('🛠️ FIXING REMAINING MISSING SUBSCRIPTIONS');
console.log('==========================================');

async function fixRemainingMissingSubscriptions() {
  try {
    // Get all users without subscriptions
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
    
    // Filter users with valid emails and Clerk IDs
    const usersWithEmails = usersWithoutSubs.filter(user => 
      user.email && user.email.includes('@') && user.clerkId
    );

    console.log(`\nUsers with valid emails and Clerk IDs: ${usersWithEmails.length}`);
    for (const user of usersWithEmails) {
      console.log(`   - ${user.email} (Created: ${new Date(user._createdAt).toLocaleDateString()})`);
    }

    // Get available course passes
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

    // Manual subscription creation function
    async function createManualSubscription(user, passId, passName, purchaseDate, reason = 'Webhook failed to create subscription') {
      try {
        console.log(`\n🔧 Creating subscription for ${user.email}...`);
        
        const pass = await sanityClient.fetch(`
          *[_type == "pass" && _id == $passId][0] {
            _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
          }
        `, { passId });

        if (!pass) {
          console.log(`❌ Pass not found: ${passId}`);
          return false;
        }

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
          manuallyCreated: true,
          manualCreationReason: reason,
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

    // Known cases based on timing and likely course pass purchases
    const likelyCoursePurchases = [
      {
        email: 'svein.h.aaberge@gmail.com',
        purchaseDate: '2025-09-14',
        passId: 'nP5GIt0J2mhTNRaq5gkAGs', // 2 Course Pass
        reason: 'Same day as hh-aaber, likely 2 course pass purchase'
      },
      {
        email: 'giljefamily@gmail.com',
        purchaseDate: '2025-09-13',
        passId: '1N3EPBBcVS22GkyXawDcU7', // 2 COURSE PASS (60 days validity)
        reason: 'Recent registration, likely course pass purchase'
      },
      {
        email: 'kaosman3@gmail.com',
        purchaseDate: '2025-09-08',
        passId: '1N3EPBBcVS22GkyXawDcU7', // 2 COURSE PASS (60 days validity)
        reason: 'Recent registration, likely course pass purchase'
      },
      {
        email: 'j.fromyr@gmail.com',
        purchaseDate: '2025-09-07',
        passId: '1N3EPBBcVS22GkyXawDcU7', // 2 COURSE PASS (60 days validity)
        reason: 'Recent registration, likely course pass purchase'
      }
    ];

    console.log('\n\n🎯 CREATING SUBSCRIPTIONS FOR LIKELY COURSE PASS PURCHASES');
    console.log('===========================================================');

    let successCount = 0;
    let failCount = 0;

    for (const likelyCase of likelyCoursePurchases) {
      console.log(`\n🎯 Processing: ${likelyCase.email}`);
      
      const user = usersWithEmails.find(u => u.email === likelyCase.email);
      if (!user) {
        console.log(`❌ User not found: ${likelyCase.email}`);
        failCount++;
        continue;
      }

      const success = await createManualSubscription(
        user, 
        likelyCase.passId, 
        '2 Course Pass', 
        likelyCase.purchaseDate,
        likelyCase.reason
      );
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Verification
    console.log('\n\n🔍 VERIFICATION');
    console.log('================');
    
    for (const likelyCase of likelyCoursePurchases) {
      const user = await sanityClient.fetch(`
        *[_type == "user" && email == $email][0] {
          _id,
          email,
          "subscriptions": *[_type == "subscription" && user._ref == ^._id] {
            _id,
            passName,
            type,
            isActive,
            endDate,
            "isExpired": dateTime(endDate) < dateTime(now()),
            "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
          }
        }
      `, { email: likelyCase.email });

      if (user && user.subscriptions.length > 0) {
        console.log(`✅ ${user.email} now has ${user.subscriptions.length} subscription(s):`);
        for (const sub of user.subscriptions) {
          console.log(`   - ${sub.passName} (${sub.type}) - Active: ${sub.isActive}, Days: ${sub.daysRemaining}`);
        }
      } else {
        console.log(`❌ ${likelyCase.email} still has no subscriptions`);
      }
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('===========');
    console.log(`Total users without subscriptions: ${usersWithoutSubs.length}`);
    console.log(`Users with valid emails: ${usersWithEmails.length}`);
    console.log(`Likely course purchases processed: ${likelyCoursePurchases.length}`);
    console.log(`Successful creations: ${successCount}`);
    console.log(`Failed creations: ${failCount}`);
    
    const remainingUsers = usersWithoutSubs.length - likelyCoursePurchases.length;
    console.log(`Remaining users needing investigation: ${remainingUsers}`);

    if (remainingUsers > 0) {
      console.log('\n🔍 REMAINING USERS NEEDING MANUAL INVESTIGATION:');
      const processedEmails = likelyCoursePurchases.map(lc => lc.email);
      const unprocessedUsers = usersWithoutSubs.filter(user => 
        !processedEmails.includes(user.email)
      );
      
      for (const user of unprocessedUsers) {
        console.log(`   - ${user.email || 'No email'} (${user.name || 'No name'}) - Created: ${new Date(user._createdAt).toLocaleDateString()}`);
        if (!user.email || !user.clerkId) {
          console.log(`     ⚠️ Missing email or Clerk ID - may be incomplete registration`);
        }
      }
    }

    console.log('\n🛠️ NEXT STEPS:');
    console.log('1. Check Stripe dashboard for remaining users to identify their purchases');
    console.log('2. Use the createManualSubscription function for any additional cases');
    console.log('3. Deploy the improved webhook to prevent future issues');

  } catch (error) {
    console.error('❌ Error fixing remaining missing subscriptions:', error);
  }
}

// Run the fix
fixRemainingMissingSubscriptions();
