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

console.log('🔍 Finding Missing hkts989@outlook.com Purchase');
console.log('==============================================');

async function findMissingHkts989Purchase() {
  try {
    const customerEmail = 'hkts989@outlook.com';
    const customerClerkId = 'user_32CIxlEH04vm3zwoE0iSFQlYq9i';
    
    // 1. Check for any subscriptions with this email in metadata or user references
    console.log('\n🔍 Searching for any traces of this customer in subscriptions...');
    
    const allSubscriptionsToday = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-09-03T00:00:00Z"] | order(_createdAt desc) {
        _id,
        passName,
        type,
        user->{_id, name, email, clerkId},
        stripeSessionId,
        stripePaymentId,
        _createdAt,
        "customerEmail": user->email
      }
    `);

    console.log(`Found ${allSubscriptionsToday.length} subscriptions created today:`);
    
    let foundCustomer = false;
    for (const sub of allSubscriptionsToday) {
      console.log(`\n💳 ${sub.passName} (${sub.type})`);
      console.log(`   User: ${sub.user?.name || 'No name'} (${sub.user?.email || 'No email'})`);
      console.log(`   Clerk ID: ${sub.user?.clerkId || 'No Clerk ID'}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
      
      if (sub.user?.email === customerEmail || sub.user?.clerkId === customerClerkId) {
        console.log(`   🎯 FOUND CUSTOMER MATCH!`);
        foundCustomer = true;
      }
    }

    if (!foundCustomer) {
      console.log(`\n❌ Customer ${customerEmail} not found in any subscriptions today`);
    }

    // 2. Check if there are any orphaned Stripe sessions
    console.log('\n\n🔍 Looking for potential Stripe webhook issues...');
    
    // Check recent webhook logs or any failed transactions
    // Since we can't access Stripe directly, let's look for patterns
    
    const recentUsers = await sanityClient.fetch(`
      *[_type == "user" && _createdAt > "2025-09-03T18:00:00Z"] | order(_createdAt desc) {
        _id,
        name,
        email,
        clerkId,
        _createdAt,
        "subscriptionCount": count(*[_type == "subscription" && user._ref == ^._id])
      }
    `);

    console.log(`\nUsers created after 6 PM today:`);
    for (const user of recentUsers) {
      console.log(`\n👤 ${user.name || 'No name'} (${user.email})`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
      console.log(`   Subscriptions: ${user.subscriptionCount}`);
      
      if (user.subscriptionCount === 0) {
        console.log(`   🚨 USER HAS NO SUBSCRIPTIONS - potential webhook failure!`);
        
        if (user.email === customerEmail) {
          console.log(`   🎯 THIS IS OUR CUSTOMER - webhook definitely failed for their purchase!`);
        }
      }
    }

    // 3. Check what type of pass they likely bought
    console.log('\n\n🔍 Determining what pass was likely purchased...');
    
    // Look at the timing - user created at 6:52 PM
    const userCreatedTime = new Date('2025-09-03T18:52:58Z');
    console.log(`User created at: ${userCreatedTime.toLocaleString()}`);
    
    // Check if there were any successful purchases around that time
    const nearbyPurchases = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= "2025-09-03T18:45:00Z" && _createdAt <= "2025-09-03T19:00:00Z"] {
        _id,
        passName,
        type,
        user->{email},
        _createdAt,
        stripeSessionId
      }
    `);

    if (nearbyPurchases.length > 0) {
      console.log(`\nPurchases around the same time (6:45-7:00 PM):`);
      for (const purchase of nearbyPurchases) {
        console.log(`   - ${purchase.passName} by ${purchase.user?.email} at ${new Date(purchase._createdAt).toLocaleString()}`);
      }
    }

    // 4. Provide recommendations
    console.log('\n\n💡 DIAGNOSIS & RECOMMENDATIONS:');
    console.log('=====================================');
    
    console.log('🔍 ISSUE IDENTIFIED:');
    console.log(`   - User ${customerEmail} was created today at 6:52 PM`);
    console.log(`   - User has Clerk ID: ${customerClerkId}`);
    console.log(`   - User has NO subscriptions despite making a purchase`);
    console.log(`   - This indicates a Stripe webhook failure`);
    
    console.log('\n🔧 POSSIBLE CAUSES:');
    console.log('   1. Stripe webhook failed to process the payment');
    console.log('   2. Webhook processed but failed to create subscription');
    console.log('   3. Payment was incomplete or failed');
    console.log('   4. Metadata missing in Stripe session');
    
    console.log('\n🛠️ RECOMMENDED ACTIONS:');
    console.log('   1. Check Stripe dashboard for payments from hkts989@outlook.com today');
    console.log('   2. Look for webhook delivery failures in Stripe');
    console.log('   3. If payment succeeded, manually create the subscription');
    console.log('   4. Verify webhook endpoint is working properly');
    
    console.log('\n📋 MANUAL SUBSCRIPTION CREATION:');
    console.log('   If the payment was successful in Stripe, I can create a manual subscription');
    console.log('   Need to know: What type of pass did they buy? (clip card, drop-in, etc.)');

  } catch (error) {
    console.error('❌ Error finding missing purchase:', error);
  }
}

// Run the search
findMissingHkts989Purchase();
