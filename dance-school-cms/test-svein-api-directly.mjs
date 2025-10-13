import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function testSveinApiDirectly() {
  const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
  
  console.log('🔍 Testing API query directly for Svein...');
  console.log('Clerk ID:', clerkId);
  console.log('=' .repeat(60));

  try {
    // This is the exact query used by the student passes API
    const subscriptions = await sanityClient.fetch(`
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
    `, { userId: clerkId });

    console.log(`\n📊 API Query Result: Found ${subscriptions.length} subscriptions`);
    
    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions returned by API query');
      
      // Let's debug the user reference
      console.log('\n🔍 Debugging user reference...');
      const userCheck = await sanityClient.fetch(`
        *[_type == "user" && clerkId == $clerkId] {
          _id,
          clerkId,
          email
        }
      `, { clerkId });
      
      console.log('User check result:', userCheck);
      
      // Check subscriptions with user reference
      const subCheck = await sanityClient.fetch(`
        *[_type == "subscription"] {
          _id,
          passName,
          "userClerkId": user->clerkId,
          "userEmail": user->email,
          isActive
        }
      `);
      
      console.log('\nAll subscriptions with user references:');
      subCheck.forEach(sub => {
        console.log(`- ${sub._id}: ${sub.passName} (User: ${sub.userEmail}, ClerkID: ${sub.userClerkId}, Active: ${sub.isActive})`);
      });
      
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`\n✅ Subscription ${index + 1}:`);
        console.log(`   - ID: ${sub._id}`);
        console.log(`   - Pass Name: ${sub.passName}`);
        console.log(`   - Pass ID: ${sub.passId}`);
        console.log(`   - Type: ${sub.type}`);
        console.log(`   - Active: ${sub.isActive}`);
        console.log(`   - Expired: ${sub.isExpired}`);
        console.log(`   - Start Date: ${sub.startDate}`);
        console.log(`   - End Date: ${sub.endDate}`);
        console.log(`   - Remaining Days: ${sub.remainingDays}`);
        console.log(`   - Classes Used: ${sub.classesUsed}`);
        console.log(`   - Classes Limit: ${sub.classesLimit}`);
        console.log(`   - Payment Status: ${sub.paymentStatus}`);
        console.log(`   - Amount: ${sub.amount}`);
        console.log(`   - Currency: ${sub.currency}`);
        console.log(`   - Stripe Session: ${sub.stripeSessionId}`);
        console.log(`   - Created: ${sub._createdAt}`);
        console.log(`   - Updated: ${sub._updatedAt}`);
      });
    }

    // Let's also check what the frontend would see
    console.log('\n🖥️  Frontend Display Logic:');
    subscriptions.forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1} Display Status:`);
      
      // Check if it would be filtered out
      const wouldShow = sub.isActive && !sub.isExpired;
      console.log(`   - Would show in app: ${wouldShow ? '✅ YES' : '❌ NO'}`);
      
      if (!wouldShow) {
        const reasons = [];
        if (!sub.isActive) reasons.push('not active');
        if (sub.isExpired) reasons.push('expired');
        console.log(`   - Reasons hidden: ${reasons.join(', ')}`);
      }
      
      // Check status badge logic
      let statusBadge = 'Unknown';
      if (sub.isExpired) {
        statusBadge = 'Expired';
      } else if (!sub.isActive) {
        statusBadge = 'Inactive';
      } else if (sub.remainingDays <= 7) {
        statusBadge = 'Expires Soon';
      } else {
        statusBadge = 'Active';
      }
      console.log(`   - Status Badge: ${statusBadge}`);
    });

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testSveinApiDirectly();
