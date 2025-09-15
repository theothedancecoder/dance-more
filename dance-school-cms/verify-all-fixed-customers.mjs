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

console.log('✅ FINAL VERIFICATION: All Fixed Customers');
console.log('==========================================');

async function verifyAllFixedCustomers() {
  try {
    const fixedCustomers = [
      'hh-aaber@online.no',
      'svein.h.aaberge@gmail.com', 
      'giljefamily@gmail.com',
      'kaosman3@gmail.com',
      'j.fromyr@gmail.com'
    ];

    console.log(`Verifying ${fixedCustomers.length} fixed customers:\n`);

    for (const email of fixedCustomers) {
      console.log(`🔍 Checking: ${email}`);
      
      // Test the exact same API query used by the student interface
      const user = await sanityClient.fetch(`
        *[_type == "user" && email == $email][0] {
          _id,
          email,
          name,
          clerkId
        }
      `, { email });

      if (!user) {
        console.log(`   ❌ User not found`);
        continue;
      }

      // Use the exact API query from /api/student/passes/route.ts
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
          remainingClips,
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
      
      console.log(`   📊 API Results:`);
      console.log(`      Total subscriptions: ${apiResult.length}`);
      console.log(`      Active & non-expired: ${activeSubscriptions.length}`);
      
      if (activeSubscriptions.length > 0) {
        console.log(`   ✅ WILL BE VISIBLE in student interface:`);
        for (const sub of activeSubscriptions) {
          console.log(`      - ${sub.passName} (${sub.type})`);
          console.log(`        Days remaining: ${sub.remainingDays}`);
          console.log(`        Classes remaining: ${sub.remainingClips || 'Unlimited'}`);
          console.log(`        Valid until: ${new Date(sub.endDate).toLocaleDateString()}`);
        }
      } else {
        console.log(`   ❌ NO ACTIVE PASSES - will not be visible`);
        
        if (apiResult.length > 0) {
          console.log(`   🔍 Issues with existing subscriptions:`);
          for (const sub of apiResult) {
            console.log(`      - ${sub.passName}: Active=${sub.isActive}, Expired=${sub.isExpired}`);
          }
        }
      }
      
      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('\n📊 FINAL SUMMARY');
    console.log('=================');
    
    let totalFixed = 0;
    let totalVisible = 0;
    
    for (const email of fixedCustomers) {
      const user = await sanityClient.fetch(`
        *[_type == "user" && email == $email][0] { clerkId }
      `, { email });
      
      if (user) {
        const activeCount = await sanityClient.fetch(`
          count(*[_type == "subscription" && user->clerkId == $userId && isActive == true && dateTime(endDate) >= dateTime(now())])
        `, { userId: user.clerkId });
        
        totalFixed++;
        if (activeCount > 0) {
          totalVisible++;
        }
      }
    }
    
    console.log(`✅ Customers processed: ${totalFixed}/${fixedCustomers.length}`);
    console.log(`✅ Customers with visible passes: ${totalVisible}/${fixedCustomers.length}`);
    
    if (totalVisible === fixedCustomers.length) {
      console.log('\n🎉 SUCCESS: All fixed customers now have visible active passes!');
    } else {
      console.log(`\n⚠️ ${fixedCustomers.length - totalVisible} customers still have issues`);
    }

    // Check remaining users without subscriptions
    console.log('\n\n🔍 REMAINING USERS WITHOUT SUBSCRIPTIONS');
    console.log('=========================================');
    
    const remainingUsers = await sanityClient.fetch(`
      *[_type == "user" && _createdAt >= "2025-09-01T00:00:00Z" && count(*[_type == "subscription" && user._ref == ^._id]) == 0] {
        _id,
        email,
        name,
        _createdAt
      }
    `);

    console.log(`Remaining users without subscriptions: ${remainingUsers.length}`);
    
    const usersWithEmails = remainingUsers.filter(u => u.email && u.email.includes('@'));
    const usersWithoutEmails = remainingUsers.filter(u => !u.email || !u.email.includes('@'));
    
    console.log(`   With valid emails: ${usersWithEmails.length}`);
    console.log(`   Without emails (incomplete registrations): ${usersWithoutEmails.length}`);
    
    if (usersWithEmails.length > 0) {
      console.log('\n   Users with emails still needing investigation:');
      for (const user of usersWithEmails) {
        console.log(`   - ${user.email} (Created: ${new Date(user._createdAt).toLocaleDateString()})`);
      }
    }

  } catch (error) {
    console.error('❌ Error in final verification:', error);
  }
}

// Run the verification
verifyAllFixedCustomers();
