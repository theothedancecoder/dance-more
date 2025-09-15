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

console.log('🔍 COMPREHENSIVE DIAGNOSIS: 2 Course & 3 Course Pass Issues');
console.log('=============================================================');

async function diagnoseCoursePassIssues() {
  try {
    // 1. Check ALL pass configurations
    console.log('\n1️⃣ ALL PASS CONFIGURATIONS');
    console.log('============================');
    
    const allPasses = await sanityClient.fetch(`
      *[_type == "pass"] | order(name asc) {
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
        _updatedAt,
        "hasValidConfig": defined(validityDays) || defined(expiryDate),
        "isExpired": defined(expiryDate) && dateTime(expiryDate) < dateTime(now())
      }
    `);

    console.log(`Found ${allPasses.length} total passes:`);
    
    let coursePassesFound = [];
    let problematicPasses = [];
    
    for (const pass of allPasses) {
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
      console.log(`   Is Expired: ${pass.isExpired ? '❌' : '✅'}`);
      
      // Check if this is a course pass
      const isCoursPass = pass.name.toLowerCase().includes('course') || 
                         pass.name.toLowerCase().includes('2') || 
                         pass.name.toLowerCase().includes('3');
      
      if (isCoursPass) {
        coursePassesFound.push(pass);
        console.log(`   🎯 COURSE PASS DETECTED`);
      }
      
      // Check for problems
      let problems = [];
      if (!pass.hasValidConfig) {
        problems.push('No valid expiry configuration');
      }
      if (!pass.isActive) {
        problems.push('Pass is inactive');
      }
      if (pass.isExpired) {
        problems.push('Pass has expired fixed date');
      }
      if (pass.type === 'multi' && !pass.classesLimit) {
        problems.push('Multi-pass without classes limit');
      }
      
      if (problems.length > 0) {
        problematicPasses.push({ pass, problems });
        console.log(`   🚨 ISSUES: ${problems.join(', ')}`);
      }
    }

    // 2. Focus on course passes
    console.log('\n\n2️⃣ COURSE PASS ANALYSIS');
    console.log('=========================');
    
    console.log(`Found ${coursePassesFound.length} course-related passes:`);
    
    for (const pass of coursePassesFound) {
      console.log(`\n🎓 ${pass.name}`);
      console.log(`   Can be purchased: ${pass.isActive && pass.hasValidConfig && !pass.isExpired ? '✅' : '❌'}`);
      
      if (pass.isActive && pass.hasValidConfig && !pass.isExpired) {
        console.log(`   ✅ This pass should work correctly`);
        
        // Simulate what would happen if purchased now
        const now = new Date();
        let simulatedEndDate;
        
        if (pass.validityType === 'date' && pass.expiryDate) {
          simulatedEndDate = new Date(pass.expiryDate);
          console.log(`   📅 Would expire: ${simulatedEndDate.toLocaleDateString()} (fixed date)`);
        } else if (pass.validityDays) {
          simulatedEndDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log(`   📅 Would expire: ${simulatedEndDate.toLocaleDateString()} (${pass.validityDays} days from now)`);
        }
        
        if (simulatedEndDate && simulatedEndDate <= now) {
          console.log(`   🚨 CRITICAL: Would expire immediately!`);
        }
      } else {
        console.log(`   ❌ This pass has issues preventing purchase/subscription creation`);
      }
    }

    // 3. Check for recent failed purchases
    console.log('\n\n3️⃣ RECENT USERS WITHOUT SUBSCRIPTIONS');
    console.log('======================================');
    
    // Find users created recently but without subscriptions
    const recentUsers = await sanityClient.fetch(`
      *[_type == "user" && _createdAt >= "2025-09-01T00:00:00Z"] | order(_createdAt desc) {
        _id,
        name,
        email,
        clerkId,
        _createdAt,
        "hasSubscriptions": count(*[_type == "subscription" && user._ref == ^._id]) > 0
      }
    `);

    const usersWithoutSubs = recentUsers.filter(user => !user.hasSubscriptions);
    
    console.log(`Recent users (since Sept 1): ${recentUsers.length}`);
    console.log(`Users without subscriptions: ${usersWithoutSubs.length}`);
    
    if (usersWithoutSubs.length > 0) {
      console.log(`\n🚨 Users who registered but have no subscriptions:`);
      for (const user of usersWithoutSubs) {
        console.log(`   - ${user.email} (${user.name || 'No name'}) - Created: ${new Date(user._createdAt).toLocaleDateString()}`);
      }
      
      console.log(`\n⚠️ This suggests ${usersWithoutSubs.length} potential failed purchases!`);
    }

    // 4. Check webhook processing capability
    console.log('\n\n4️⃣ WEBHOOK PROCESSING SIMULATION');
    console.log('==================================');
    
    console.log('Testing webhook logic for each course pass...');
    
    for (const pass of coursePassesFound) {
      console.log(`\n🧪 Testing: ${pass.name}`);
      
      // Simulate webhook processing
      const now = new Date();
      let canCreateSubscription = true;
      let failureReason = '';
      
      // Check pass existence
      if (!pass) {
        canCreateSubscription = false;
        failureReason = 'Pass not found';
      }
      
      // Check expiry configuration
      if (canCreateSubscription) {
        if (pass.validityType === 'date' && pass.expiryDate) {
          const expiryDate = new Date(pass.expiryDate);
          if (expiryDate <= now) {
            canCreateSubscription = false;
            failureReason = `Pass expired on ${expiryDate.toLocaleDateString()}`;
          }
        } else if (!pass.validityDays) {
          canCreateSubscription = false;
          failureReason = 'No valid expiry configuration';
        }
      }
      
      // Check subscription type mapping
      if (canCreateSubscription) {
        let subscriptionType;
        switch (pass.type) {
          case 'single':
            subscriptionType = 'single';
            break;
          case 'multi-pass':
            subscriptionType = 'multi-pass';
            break;
          case 'multi':
            subscriptionType = 'clipcard';
            break;
          case 'unlimited':
            subscriptionType = 'monthly';
            break;
          default:
            canCreateSubscription = false;
            failureReason = `Invalid pass type: ${pass.type}`;
        }
        
        if (canCreateSubscription) {
          console.log(`   ✅ Would create ${subscriptionType} subscription`);
          
          // Calculate end date
          let endDate;
          if (pass.validityType === 'date' && pass.expiryDate) {
            endDate = new Date(pass.expiryDate);
          } else if (pass.validityDays) {
            endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          }
          
          if (endDate) {
            const daysValid = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            console.log(`   📅 Would be valid for ${daysValid} days`);
            
            if (daysValid <= 0) {
              console.log(`   🚨 CRITICAL: Would expire immediately!`);
            }
          }
        }
      }
      
      if (!canCreateSubscription) {
        console.log(`   ❌ Webhook would FAIL: ${failureReason}`);
      }
    }

    // 5. Summary and recommendations
    console.log('\n\n5️⃣ SUMMARY & CRITICAL ISSUES');
    console.log('==============================');
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Total passes: ${allPasses.length}`);
    console.log(`   Course passes: ${coursePassesFound.length}`);
    console.log(`   Problematic passes: ${problematicPasses.length}`);
    console.log(`   Users without subscriptions: ${usersWithoutSubs.length}`);
    
    if (coursePassesFound.length === 0) {
      console.log('\n🚨 CRITICAL ISSUE: NO 2 COURSE OR 3 COURSE PASSES FOUND!');
      console.log('This explains why the webhook cannot create subscriptions for course pass purchases.');
      console.log('\n🛠️ IMMEDIATE ACTION REQUIRED:');
      console.log('1. Create proper 2 Course and 3 Course pass configurations');
      console.log('2. Ensure they have correct validityDays or expiryDate settings');
      console.log('3. Set appropriate classesLimit for multi-pass types');
    } else {
      console.log('\n✅ Course passes found, checking for issues...');
      
      const workingCoursePasses = coursePassesFound.filter(pass => 
        pass.isActive && pass.hasValidConfig && !pass.isExpired
      );
      
      if (workingCoursePasses.length === 0) {
        console.log('\n🚨 CRITICAL ISSUE: ALL COURSE PASSES HAVE CONFIGURATION PROBLEMS!');
        console.log('None of the course passes can be purchased successfully.');
      } else {
        console.log(`\n✅ ${workingCoursePasses.length} course passes are properly configured`);
        
        if (usersWithoutSubs.length > 0) {
          console.log('\n⚠️ However, there are users without subscriptions, suggesting:');
          console.log('1. Webhook processing failures');
          console.log('2. Database transaction issues');
          console.log('3. Missing Stripe metadata');
        }
      }
    }
    
    if (problematicPasses.length > 0) {
      console.log('\n🔧 PASSES NEEDING FIXES:');
      for (const { pass, problems } of problematicPasses) {
        console.log(`   - ${pass.name}: ${problems.join(', ')}`);
      }
    }
    
    console.log('\n🛠️ RECOMMENDED ACTIONS:');
    console.log('1. Fix pass configurations with missing validity settings');
    console.log('2. Activate any inactive course passes');
    console.log('3. Update passes with expired fixed dates');
    console.log('4. Manually create missing subscriptions for affected customers');
    console.log('5. Improve webhook error handling and logging');

  } catch (error) {
    console.error('❌ Error in comprehensive diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseCoursePassIssues();
