import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 COMPREHENSIVE FILIP DIAGNOSIS');
console.log('================================');
console.log('Checking all aspects of Filip\'s account and pass status...\n');

async function comprehensiveFilipDiagnosis() {
  try {
    // 1. Search for Filip in all possible ways
    console.log('👤 STEP 1: Finding Filip\'s User Records');
    console.log('========================================');
    
    const allFilipUsers = await sanityClient.fetch(`
      *[_type == "user" && (
        email match "*filip*" || 
        email match "*fjmichalski*" || 
        name match "*Filip*" ||
        name match "*Michalski*"
      )] {
        _id, name, email, clerkId, role, _createdAt, _updatedAt
      }
    `);
    
    console.log(`Found ${allFilipUsers.length} potential Filip user records:`);
    allFilipUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(user._updatedAt).toLocaleString()}`);
    });
    
    if (allFilipUsers.length === 0) {
      console.log('❌ No Filip user records found!');
      return;
    }
    
    // 2. Check subscriptions for each Filip user
    console.log('\n\n🎫 STEP 2: Checking Subscriptions for Each Filip User');
    console.log('====================================================');
    
    for (const user of allFilipUsers) {
      console.log(`\n--- Subscriptions for ${user.name} (${user.email}) ---`);
      
      const subscriptions = await sanityClient.fetch(`
        *[_type == "subscription" && user._ref == $userId] | order(_createdAt desc) {
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
          stripePaymentId,
          purchasePrice,
          _createdAt,
          _updatedAt,
          "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
          "isExpired": dateTime(endDate) < dateTime(now()),
          "pass": *[_type == "pass" && _id == ^.passId][0]{
            _id, name, type, price, validityDays, classesLimit, isActive
          }
        }
      `, { userId: user._id });
      
      console.log(`   Found ${subscriptions.length} subscriptions:`);
      
      subscriptions.forEach((sub, index) => {
        console.log(`\n   ${index + 1}. Subscription ID: ${sub._id}`);
        console.log(`      Pass Name: ${sub.passName}`);
        console.log(`      Type: ${sub.type}`);
        console.log(`      Start Date: ${sub.startDate}`);
        console.log(`      End Date: ${sub.endDate}`);
        console.log(`      Is Active: ${sub.isActive}`);
        console.log(`      Is Expired: ${sub.isExpired}`);
        console.log(`      Remaining Days: ${sub.remainingDays}`);
        console.log(`      Classes Used: ${sub.classesUsed || 0} / ${sub.classesLimit || '∞'}`);
        console.log(`      Remaining Clips: ${sub.remainingClips || 'N/A'}`);
        console.log(`      Purchase Price: ${sub.purchasePrice || 'N/A'}`);
        console.log(`      Stripe Session: ${sub.stripeSessionId || 'N/A'}`);
        console.log(`      Stripe Payment: ${sub.stripePaymentId || 'N/A'}`);
        console.log(`      Created: ${new Date(sub._createdAt).toLocaleString()}`);
        console.log(`      Updated: ${new Date(sub._updatedAt).toLocaleString()}`);
        
        if (sub.pass) {
          console.log(`      Pass Details: ${sub.pass.name} (${sub.pass.type}) - ${sub.pass.price} kr`);
          console.log(`      Pass Active: ${sub.pass.isActive}`);
        } else {
          console.log(`      ⚠️  Pass not found for passId: ${sub.passId}`);
        }
      });
      
      // Check what the API would return for this user
      console.log(`\n   --- API Response Simulation for ${user.name} ---`);
      const apiSimulation = await sanityClient.fetch(`
        *[_type == "subscription" && user->clerkId == $clerkId] | order(_createdAt desc) {
          _id,
          passName,
          passId,
          type,
          startDate,
          endDate,
          isActive,
          classesUsed,
          classesLimit,
          "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
          "isExpired": dateTime(endDate) < dateTime(now())
        }
      `, { clerkId: user.clerkId });
      
      console.log(`   API would return ${apiSimulation.length} subscriptions for Clerk ID: ${user.clerkId}`);
      apiSimulation.forEach((sub, index) => {
        const status = sub.isExpired ? 'EXPIRED' : (sub.isActive ? 'ACTIVE' : 'INACTIVE');
        console.log(`   ${index + 1}. ${sub.passName} - ${status} (${sub.remainingDays} days remaining)`);
      });
    }
    
    // 3. Search Stripe for Filip's payments
    console.log('\n\n💳 STEP 3: Searching Stripe for Filip\'s Payments');
    console.log('===============================================');
    
    // Search last 90 days
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: ninetyDaysAgo },
      limit: 100,
    });
    
    const filipSessions = sessions.data.filter(session => {
      const email = session.customer_details?.email?.toLowerCase() || '';
      const name = session.customer_details?.name?.toLowerCase() || '';
      return (
        email.includes('filip') ||
        email.includes('fjmichalski') ||
        name.includes('filip') ||
        name.includes('michalski')
      );
    });
    
    console.log(`Found ${filipSessions.length} Stripe sessions for Filip in last 90 days:`);
    
    for (const session of filipSessions) {
      console.log(`\n--- Stripe Session: ${session.id} ---`);
      console.log(`   Status: ${session.status}/${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'} ${session.currency || 'N/A'}`);
      console.log(`   Customer: ${session.customer_details?.name} (${session.customer_details?.email})`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log(`   Payment Intent: ${session.payment_intent || 'N/A'}`);
      console.log(`   Metadata:`, session.metadata || {});
      
      // Check if subscription exists for this session
      const existingSubscription = await sanityClient.fetch(`
        *[_type == "subscription" && stripeSessionId == $sessionId][0]
      `, { sessionId: session.id });
      
      if (existingSubscription) {
        console.log(`   ✅ Subscription exists: ${existingSubscription._id}`);
      } else {
        console.log(`   ❌ NO SUBSCRIPTION FOUND FOR THIS SESSION!`);
      }
    }
    
    // 4. Check for orphaned payments
    console.log('\n\n🔍 STEP 4: Checking for Orphaned Payments');
    console.log('=========================================');
    
    const allSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && stripeSessionId != null] {
        _id, stripeSessionId, user->{name, email}
      }
    `);
    
    const sessionIds = allSubscriptions.map(sub => sub.stripeSessionId);
    const orphanedSessions = filipSessions.filter(session => !sessionIds.includes(session.id));
    
    console.log(`Found ${orphanedSessions.length} orphaned Filip sessions (payments without subscriptions):`);
    orphanedSessions.forEach(session => {
      console.log(`- ${session.id}: ${session.customer_details?.name} - ${session.amount_total / 100} ${session.currency}`);
    });
    
    // 5. Summary and Recommendations
    console.log('\n\n📋 STEP 5: Summary and Recommendations');
    console.log('=====================================');
    
    console.log(`\n🔍 DIAGNOSIS SUMMARY:`);
    console.log(`- Found ${allFilipUsers.length} Filip user record(s)`);
    console.log(`- Found ${filipSessions.length} Stripe payment(s) in last 90 days`);
    console.log(`- Found ${orphanedSessions.length} orphaned payment(s) (no subscription created)`);
    
    let totalActiveSubscriptions = 0;
    for (const user of allFilipUsers) {
      const subs = await sanityClient.fetch(`
        *[_type == "subscription" && user._ref == $userId && isActive == true && dateTime(endDate) > dateTime(now())]
      `, { userId: user._id });
      totalActiveSubscriptions += subs.length;
    }
    
    console.log(`- Found ${totalActiveSubscriptions} currently active subscription(s)`);
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (totalActiveSubscriptions === 0 && orphanedSessions.length > 0) {
      console.log(`1. ❗ CRITICAL: Filip has paid but has no active subscriptions!`);
      console.log(`2. 🔧 ACTION NEEDED: Create subscriptions for orphaned payments`);
      console.log(`3. 🎯 PRIORITY: Most recent payment should be processed first`);
    } else if (totalActiveSubscriptions === 0) {
      console.log(`1. ❗ Filip has no active subscriptions`);
      console.log(`2. 🔍 Check if he needs to make a new purchase`);
    } else if (totalActiveSubscriptions > 0) {
      console.log(`1. ✅ Filip has ${totalActiveSubscriptions} active subscription(s)`);
      console.log(`2. 🔍 Issue might be with Clerk ID mismatch or frontend display`);
      console.log(`3. 🔧 Check if user is logging in with correct account`);
    }
    
    if (allFilipUsers.length > 1) {
      console.log(`4. ⚠️  Multiple user records found - may need to merge accounts`);
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`1. If orphaned payments exist, run fix script to create subscriptions`);
    console.log(`2. If multiple users exist, identify the correct one and merge if needed`);
    console.log(`3. Verify Clerk ID matches between authentication and database`);
    console.log(`4. Test Filip's login and pass display after fixes`);
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run the comprehensive diagnosis
comprehensiveFilipDiagnosis();
