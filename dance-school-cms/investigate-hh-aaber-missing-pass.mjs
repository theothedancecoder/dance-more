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

console.log('🔍 Investigating Missing 2 Course Pass for hh-aaber@online.no');
console.log('==============================================================');

async function investigateHhAaberMissingPass() {
  try {
    const customerEmail = 'hh-aaber@online.no';
    const purchaseDate = '2025-09-14';
    
    console.log(`👤 Customer: ${customerEmail}`);
    console.log(`📅 Purchase Date: ${purchaseDate}`);
    console.log(`🎫 Expected Pass: 2 Course Pass`);
    console.log(`💳 Payment Status: Successful (confirmed)`);
    
    // 1. Find the user
    console.log('\n\n1️⃣ USER LOOKUP');
    console.log('================');
    
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId,
        role,
        isActive,
        _createdAt,
        _updatedAt
      }
    `, { email: customerEmail });

    if (!user) {
      console.log(`❌ User not found with email: ${customerEmail}`);
      
      // Check for similar emails
      const similarUsers = await sanityClient.fetch(`
        *[_type == "user" && email match "*aaber*"] {
          _id,
          name,
          email,
          clerkId
        }
      `);
      
      if (similarUsers.length > 0) {
        console.log(`\n🔍 Found similar users:`);
        for (const simUser of similarUsers) {
          console.log(`   - ${simUser.name || 'No name'} (${simUser.email}) - Clerk: ${simUser.clerkId}`);
        }
      }
      
      console.log('\n🚨 CRITICAL ISSUE: User not found in database!');
      console.log('This suggests the webhook failed to create the user during checkout.');
      return;
    }

    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
    console.log(`   Role: ${user.role || 'Not set'}`);
    console.log(`   Active: ${user.isActive}`);

    // 2. Check for subscriptions
    console.log('\n\n2️⃣ SUBSCRIPTION SEARCH');
    console.log('========================');
    
    // Search by user reference
    const subscriptionsByRef = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        remainingClips,
        classesLimit,
        stripeSessionId,
        stripePaymentId,
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now()),
        "validityPeriod": round((dateTime(endDate) - dateTime(_createdAt)) / 86400)
      }
    `, { userId: user._id });

    console.log(`Subscriptions by user reference: ${subscriptionsByRef.length}`);

    // Search by Clerk ID
    const subscriptionsByClerkId = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId] | order(_createdAt desc) {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        remainingClips,
        classesLimit,
        stripeSessionId,
        stripePaymentId,
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now()),
        "validityPeriod": round((dateTime(endDate) - dateTime(_createdAt)) / 86400)
      }
    `, { clerkId: user.clerkId });

    console.log(`Subscriptions by Clerk ID: ${subscriptionsByClerkId.length}`);

    const allSubscriptions = [...subscriptionsByRef, ...subscriptionsByClerkId];
    const uniqueSubscriptions = allSubscriptions.filter((sub, index, self) => 
      index === self.findIndex(s => s._id === sub._id)
    );

    if (uniqueSubscriptions.length === 0) {
      console.log('\n❌ NO SUBSCRIPTIONS FOUND for this user!');
      console.log('\n🚨 CRITICAL ISSUE: Payment successful but no subscription created!');
    } else {
      console.log(`\n✅ Found ${uniqueSubscriptions.length} subscription(s):`);
      
      for (const sub of uniqueSubscriptions) {
        console.log(`\n🎫 ${sub.passName} (${sub.type})`);
        console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
        console.log(`   Start: ${new Date(sub.startDate).toLocaleString()}`);
        console.log(`   End: ${new Date(sub.endDate).toLocaleString()}`);
        console.log(`   Validity Period: ${sub.validityPeriod} days`);
        console.log(`   Days Remaining: ${sub.daysFromNow}`);
        console.log(`   Is Active: ${sub.isActive}`);
        console.log(`   Is Expired: ${sub.isExpiredNow}`);
        console.log(`   Remaining Clips: ${sub.remainingClips || 'N/A'}`);
        console.log(`   Classes Limit: ${sub.classesLimit || 'N/A'}`);
        console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
        console.log(`   Stripe Payment: ${sub.stripePaymentId || 'None'}`);
        
        // Check if this matches the purchase date
        const createdDate = new Date(sub._createdAt);
        const targetDate = new Date(purchaseDate);
        const isSameDay = createdDate.toDateString() === targetDate.toDateString();
        
        if (isSameDay) {
          console.log(`   🎯 MATCHES PURCHASE DATE!`);
          
          if (sub.passName.toLowerCase().includes('2') || sub.passName.toLowerCase().includes('course')) {
            console.log(`   ✅ This appears to be the 2 course pass!`);
            
            // Check visibility conditions
            if (sub.isActive && !sub.isExpiredNow && (sub.remainingClips > 0 || sub.type === 'monthly')) {
              console.log(`   ✅ SHOULD BE VISIBLE in student interface`);
            } else {
              console.log(`   ❌ WILL NOT BE VISIBLE - Reasons:`);
              if (!sub.isActive) console.log(`      - Not active`);
              if (sub.isExpiredNow) console.log(`      - Expired`);
              if (sub.remainingClips <= 0 && sub.type !== 'monthly') console.log(`      - No remaining clips`);
            }
          }
        }
      }
    }

    // 3. Search for subscriptions around the purchase date
    console.log('\n\n3️⃣ TIME-BASED SEARCH');
    console.log('======================');
    
    const searchDate = new Date(purchaseDate);
    const startTime = new Date(searchDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    const endTime = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after

    console.log(`Searching for subscriptions created between:`);
    console.log(`   ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);

    const nearbySubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= $startTime && _createdAt <= $endTime] | order(_createdAt asc) {
        _id,
        passName,
        type,
        user->{_id, email, clerkId, name},
        _createdAt,
        stripeSessionId,
        stripePaymentId,
        isActive,
        "isExpiredNow": dateTime(endDate) < dateTime(now())
      }
    `, { 
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    console.log(`\nFound ${nearbySubscriptions.length} subscriptions in time window:`);
    
    let foundMatch = false;
    for (const sub of nearbySubscriptions) {
      console.log(`\n   🎫 ${sub.passName} (${sub.type})`);
      console.log(`      User: ${sub.user?.email || 'No email'} (${sub.user?.name || 'No name'})`);
      console.log(`      Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`      Active: ${sub.isActive}, Expired: ${sub.isExpiredNow}`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      
      if (sub.user?.email === customerEmail) {
        console.log(`      🎯 MATCH FOUND! This subscription belongs to our customer!`);
        foundMatch = true;
      }
      
      // Check for 2 course passes
      if (sub.passName.toLowerCase().includes('2') && sub.passName.toLowerCase().includes('course')) {
        console.log(`      🔍 This is a 2 course pass - could be related`);
      }
    }

    // 4. Check current 2 course pass configurations
    console.log('\n\n4️⃣ PASS CONFIGURATION ANALYSIS');
    console.log('=================================');
    
    const coursePasses = await sanityClient.fetch(`
      *[_type == "pass" && (name match "*2*course*" || name match "*course*2*")] {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive,
        _createdAt,
        "hasValidConfig": defined(validityDays) || defined(expiryDate)
      }
    `);

    console.log(`Found ${coursePasses.length} potential 2 course passes:`);
    
    for (const pass of coursePasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Price: ${pass.price} NOK`);
      console.log(`   Active: ${pass.isActive ? '✅' : '❌'}`);
      console.log(`   Validity Type: ${pass.validityType || 'Not set'}`);
      console.log(`   Validity Days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Expiry Date: ${pass.expiryDate || 'Not set'}`);
      console.log(`   Classes Limit: ${pass.classesLimit || 'Not set'}`);
      console.log(`   Has Valid Config: ${pass.hasValidConfig ? '✅' : '❌'}`);
      
      if (!pass.hasValidConfig) {
        console.log(`   🚨 ISSUE: Pass has no valid expiry configuration!`);
        console.log(`   🚨 This would cause webhook failures!`);
      }
      
      if (!pass.isActive) {
        console.log(`   ⚠️ Pass is inactive - cannot be purchased`);
      }
    }

    // 5. Test the student API for this user
    console.log('\n\n5️⃣ STUDENT API TEST');
    console.log('====================');
    
    const apiResult = await sanityClient.fetch(`
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
    `, { userId: user.clerkId });

    const activeSubscriptions = apiResult.filter(sub => sub.isActive && !sub.isExpired);
    
    console.log(`Student API returned ${apiResult.length} total subscriptions`);
    console.log(`Active, non-expired: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length === 0) {
      console.log(`❌ No active passes would show in student interface`);
    } else {
      console.log(`✅ Active passes that would show:`);
      for (const sub of activeSubscriptions) {
        console.log(`   - ${sub.passName} (${sub.type}) - ${sub.remainingDays} days remaining`);
      }
    }

    // 6. Final diagnosis
    console.log('\n\n6️⃣ DIAGNOSIS & RECOMMENDATIONS');
    console.log('=================================');
    
    if (uniqueSubscriptions.length === 0) {
      console.log('🚨 CRITICAL ISSUE: NO SUBSCRIPTION FOUND');
      console.log('\nRoot Cause Analysis:');
      console.log('✅ User exists in database');
      console.log('✅ Payment was successful (confirmed)');
      console.log('❌ No subscription was created');
      console.log('\nPossible Causes:');
      console.log('1. 🔧 Webhook failed due to missing/invalid metadata');
      console.log('2. 📋 Pass configuration issue prevented subscription creation');
      console.log('3. 🚫 Webhook received but subscription creation failed silently');
      console.log('4. 🔄 Database transaction failed during subscription creation');
      
      console.log('\n🛠️ IMMEDIATE ACTIONS NEEDED:');
      console.log('1. Check Stripe dashboard for the specific payment session');
      console.log('2. Look for webhook logs around September 14th');
      console.log('3. Manually create the missing subscription');
      console.log('4. Investigate webhook failure patterns');
      
    } else {
      const sept14Subs = uniqueSubscriptions.filter(sub => {
        const createdDate = new Date(sub._createdAt);
        const targetDate = new Date(purchaseDate);
        return createdDate.toDateString() === targetDate.toDateString();
      });
      
      if (sept14Subs.length === 0) {
        console.log('⚠️ SUBSCRIPTION EXISTS BUT NOT FROM SEPTEMBER 14TH');
        console.log('The customer has other subscriptions but none from the reported purchase date.');
      } else {
        console.log('✅ SUBSCRIPTION FOUND FROM SEPTEMBER 14TH');
        const sub = sept14Subs[0];
        
        if (sub.isActive && !sub.isExpiredNow) {
          console.log('✅ Subscription is active and not expired');
          console.log('🔍 Issue might be in the frontend display logic');
        } else {
          console.log('❌ Subscription exists but is not visible due to:');
          if (!sub.isActive) console.log('   - Subscription is inactive');
          if (sub.isExpiredNow) console.log('   - Subscription is expired');
          if (sub.remainingClips <= 0) console.log('   - No remaining clips');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error investigating hh-aaber missing pass:', error);
  }
}

// Run the investigation
investigateHhAaberMissingPass();
