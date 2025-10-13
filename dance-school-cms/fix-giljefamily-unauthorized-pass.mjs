import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🔧 FIXING UNAUTHORIZED PASS: giljefamily@gmail.com');
console.log('Action: Deactivating the 2 COURSE PASS (clipcard) with no payment data\n');

const userEmail = 'giljefamily@gmail.com';

async function fixUnauthorizedPass() {
  try {
    console.log('Step 1: Finding user and subscriptions...');
    
    // Find user
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User: ${user.name || user.email}`);

    // Get all subscriptions for this user
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, 
        passName, 
        type, 
        startDate, 
        endDate, 
        remainingClips, 
        isActive,
        stripePaymentId,
        stripeSessionId,
        purchasePrice,
        _createdAt
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`\nFound ${subscriptions.length} subscriptions:`);
    
    let unauthorizedSubscription = null;
    let legitimateSubscriptions = [];

    subscriptions.forEach((sub, index) => {
      const hasPaymentData = sub.stripePaymentId || sub.stripeSessionId;
      const status = sub.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      
      console.log(`\n${index + 1}. ${sub.passName} - ${status}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Price: ${sub.purchasePrice} NOK`);
      console.log(`   Payment Data: ${hasPaymentData ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
      
      // Identify the problematic subscription
      if (sub.type === 'clipcard' && sub.passName.includes('COURSE PASS') && !hasPaymentData) {
        console.log(`   🚨 UNAUTHORIZED - No payment data!`);
        unauthorizedSubscription = sub;
      } else if (hasPaymentData) {
        console.log(`   ✅ LEGITIMATE - Has payment data`);
        legitimateSubscriptions.push(sub);
      } else if (!hasPaymentData) {
        console.log(`   ⚠️  SUSPICIOUS - No payment data`);
        // Check if this might be the unauthorized one
        if (sub.type === 'clipcard' || sub.passName.includes('COURSE')) {
          unauthorizedSubscription = sub;
        }
      }
    });

    if (!unauthorizedSubscription) {
      console.log('\n✅ No unauthorized subscriptions found. All subscriptions have payment data.');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('DEACTIVATING UNAUTHORIZED SUBSCRIPTION');
    console.log('='.repeat(60));

    console.log(`\n🎯 Target subscription to deactivate:`);
    console.log(`   ID: ${unauthorizedSubscription._id}`);
    console.log(`   Pass: ${unauthorizedSubscription.passName}`);
    console.log(`   Type: ${unauthorizedSubscription.type}`);
    console.log(`   Value: ${unauthorizedSubscription.purchasePrice} NOK`);
    console.log(`   Currently Active: ${unauthorizedSubscription.isActive}`);

    // Deactivate the unauthorized subscription
    console.log(`\n🔧 Deactivating subscription...`);
    
    const result = await sanityClient
      .patch(unauthorizedSubscription._id)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
        deactivationReason: 'No payment record found - unauthorized access detected and removed',
        deactivatedBy: 'system_admin',
        deactivatedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ SUCCESS! Unauthorized subscription deactivated');
    console.log(`   Subscription ID: ${result._id}`);
    console.log(`   Status: Now INACTIVE`);

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));

    // Verify the fix
    const updatedSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, 
        passName, 
        type, 
        isActive,
        stripePaymentId,
        stripeSessionId,
        deactivationReason
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`\n📋 Updated subscription status:`);
    updatedSubscriptions.forEach((sub, index) => {
      const hasPaymentData = sub.stripePaymentId || sub.stripeSessionId;
      const status = sub.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      
      console.log(`\n${index + 1}. ${sub.passName} - ${status}`);
      console.log(`   Payment Data: ${hasPaymentData ? '✅ Present' : '❌ Missing'}`);
      
      if (sub.deactivationReason) {
        console.log(`   Deactivation Reason: ${sub.deactivationReason}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const activeSubscriptions = updatedSubscriptions.filter(sub => sub.isActive);
    const activeWithPayment = activeSubscriptions.filter(sub => sub.stripePaymentId || sub.stripeSessionId);

    console.log(`\n📊 Final Status:`);
    console.log(`   Total subscriptions: ${updatedSubscriptions.length}`);
    console.log(`   Active subscriptions: ${activeSubscriptions.length}`);
    console.log(`   Active with payment data: ${activeWithPayment.length}`);
    console.log(`   Unauthorized access removed: ${activeSubscriptions.length === activeWithPayment.length ? '✅' : '❌'}`);

    if (activeSubscriptions.length === activeWithPayment.length) {
      console.log('\n🎉 SUCCESS! All active subscriptions now have proper payment records.');
      console.log('   The user can only access services they have legitimately paid for.');
    } else {
      console.log('\n⚠️  WARNING! There may still be active subscriptions without payment data.');
    }

    console.log('\n💡 What this means:');
    console.log('   - User can still access their legitimate Drop-in Class (paid 250 NOK)');
    console.log('   - User can no longer access the 2 COURSE PASS (unpaid 2290 NOK)');
    console.log('   - If they want the course pass, they need to purchase it properly');

  } catch (error) {
    console.error('❌ Error fixing unauthorized pass:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixUnauthorizedPass();
