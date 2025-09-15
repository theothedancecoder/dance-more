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

console.log('🔍 Deep Investigation: Why hkts989@outlook.com Pass Wasn\'t Created');
console.log('================================================================');

async function deepInvestigateHkts989() {
  try {
    const customerEmail = 'hkts989@outlook.com';
    const customerClerkId = 'user_32CIxlEH04vm3zwoE0iSFQlYq9i';
    
    // 1. Get detailed user information
    console.log('\n👤 User Details:');
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == $email][0] {
        _id,
        name,
        email,
        clerkId,
        role,
        isActive,
        tenant,
        _createdAt,
        _updatedAt
      }
    `, { email: customerEmail });

    if (user) {
      console.log(`   Name: ${user.name || 'Not set'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Role: ${user.role || 'Not set'}`);
      console.log(`   Is Active: ${user.isActive}`);
      console.log(`   Tenant: ${user.tenant ? 'Set' : 'Not set'}`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(user._updatedAt).toLocaleString()}`);
    }

    // 2. Check for ANY subscriptions that might reference this user in any way
    console.log('\n\n🔍 Comprehensive Subscription Search:');
    
    // Search by user reference
    const subscriptionsByRef = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id,
        passName,
        type,
        _createdAt,
        stripeSessionId
      }
    `, { userId: user._id });

    console.log(`Subscriptions by user reference: ${subscriptionsByRef.length}`);

    // Search by Clerk ID
    const subscriptionsByClerkId = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId] {
        _id,
        passName,
        type,
        _createdAt,
        stripeSessionId
      }
    `, { clerkId: customerClerkId });

    console.log(`Subscriptions by Clerk ID: ${subscriptionsByClerkId.length}`);

    // Search for any subscriptions created around the same time
    const userCreatedTime = new Date(user._createdAt);
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const startTime = new Date(userCreatedTime.getTime() - timeWindow);
    const endTime = new Date(userCreatedTime.getTime() + timeWindow);

    console.log(`\n🕐 Searching for subscriptions created within 30 minutes of user creation:`);
    console.log(`   User created: ${userCreatedTime.toLocaleString()}`);
    console.log(`   Search window: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);

    const nearbySubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= $startTime && _createdAt <= $endTime] | order(_createdAt asc) {
        _id,
        passName,
        type,
        user->{_id, email, clerkId},
        _createdAt,
        stripeSessionId,
        stripePaymentId
      }
    `, { 
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    console.log(`Found ${nearbySubscriptions.length} subscriptions in time window:`);
    for (const sub of nearbySubscriptions) {
      console.log(`\n   🎫 ${sub.passName} (${sub.type})`);
      console.log(`      User: ${sub.user?.email || 'No email'}`);
      console.log(`      Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`      Stripe Session: ${sub.stripeSessionId || 'None'}`);
      
      if (sub.user?.email === customerEmail) {
        console.log(`      🎯 MATCH FOUND! This subscription belongs to our customer!`);
      }
    }

    // 3. Check for any failed webhook attempts or orphaned data
    console.log('\n\n🔍 Checking for Webhook Processing Issues:');
    
    // Look for any subscriptions without proper user references
    const orphanedSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= "2025-09-03T18:00:00Z" && (user == null || !defined(user._ref))] {
        _id,
        passName,
        type,
        _createdAt,
        stripeSessionId,
        stripePaymentId
      }
    `);

    console.log(`Orphaned subscriptions (no user reference): ${orphanedSubscriptions.length}`);
    for (const sub of orphanedSubscriptions) {
      console.log(`   - ${sub.passName} created ${new Date(sub._createdAt).toLocaleString()}`);
    }

    // 4. Analyze the webhook logic for potential failure points
    console.log('\n\n🔧 Webhook Logic Analysis:');
    console.log('Checking what could cause subscription creation to fail...');
    
    // The webhook creates subscriptions in createSubscriptionFromSession function
    // Let's check what conditions must be met:
    console.log('\nWebhook Requirements for Subscription Creation:');
    console.log('1. ✅ Event type: checkout.session.completed');
    console.log('2. ✅ Metadata type: pass_purchase');
    console.log('3. ❓ Required metadata: passId, userId, tenantId');
    console.log('4. ❓ Pass must exist in database');
    console.log('5. ❓ User must exist or be creatable');
    console.log('6. ❓ Pass must have valid expiry configuration');

    // 5. Check current pass configurations that could cause issues
    console.log('\n\n📋 Current Pass Configurations:');
    const allPasses = await sanityClient.fetch(`
      *[_type == "pass" && isActive == true] | order(name asc) {
        _id,
        name,
        type,
        validityType,
        validityDays,
        expiryDate,
        isActive,
        "hasValidConfig": defined(validityDays) || defined(expiryDate)
      }
    `);

    for (const pass of allPasses) {
      console.log(`\n🎫 ${pass.name} (${pass.type})`);
      console.log(`   Validity Type: ${pass.validityType || 'Not set'}`);
      console.log(`   Validity Days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Expiry Date: ${pass.expiryDate || 'Not set'}`);
      console.log(`   Has Valid Config: ${pass.hasValidConfig ? '✅' : '❌'}`);
      
      if (!pass.hasValidConfig) {
        console.log(`   🚨 ISSUE: Pass has no valid expiry configuration!`);
        console.log(`   🚨 Webhook would fail to create subscriptions for this pass!`);
      }
    }

    // 6. Final diagnosis
    console.log('\n\n🎯 DIAGNOSIS:');
    console.log('=============');
    
    if (subscriptionsByRef.length === 0 && subscriptionsByClerkId.length === 0) {
      console.log('❌ NO SUBSCRIPTION FOUND for hkts989@outlook.com');
      console.log('\nPossible reasons:');
      console.log('1. 💳 Payment failed or was incomplete');
      console.log('2. 🔧 Webhook received but failed due to missing/invalid metadata');
      console.log('3. 📋 Pass configuration issue prevented subscription creation');
      console.log('4. 🚫 User created but checkout session never completed');
      console.log('5. 🔄 Webhook processed but subscription creation failed silently');
      
      console.log('\n🛠️ NEXT STEPS:');
      console.log('1. Check Stripe dashboard for payment from hkts989@outlook.com');
      console.log('2. Look for the specific checkout session and its metadata');
      console.log('3. Check webhook logs for any errors during processing');
      console.log('4. If payment succeeded, manually create subscription');
    } else {
      console.log('✅ SUBSCRIPTION FOUND - investigating why it might not be visible');
    }

  } catch (error) {
    console.error('❌ Error in deep investigation:', error);
  }
}

// Run the investigation
deepInvestigateHkts989();
