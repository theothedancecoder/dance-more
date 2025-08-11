import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function diagnoseSpecificUser() {
  console.log('🔍 Diagnosing Missing Pass for kruczku@pm.me at dancecity...\n');

  try {
    // 1. Get the tenant information
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0] {
        _id,
        schoolName,
        slug,
        stripeConnect { accountId }
      }
    `);

    if (!tenant) {
      console.error('❌ Tenant "dancecity" not found');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName} (${tenant._id})`);
    console.log(`   Stripe Account: ${tenant.stripeConnect?.accountId || 'Not configured'}`);

    // 2. Look for user by email in Sanity
    const userByEmail = await sanityClient.fetch(`
      *[_type == "user" && email == "kruczku@pm.me"][0] {
        _id,
        name,
        email,
        role,
        isActive,
        _createdAt
      }
    `);

    if (userByEmail) {
      console.log(`\n✅ Found user in Sanity by email:`);
      console.log(`   ID: ${userByEmail._id}`);
      console.log(`   Name: ${userByEmail.name || 'Not set'}`);
      console.log(`   Email: ${userByEmail.email}`);
      console.log(`   Role: ${userByEmail.role}`);
      console.log(`   Active: ${userByEmail.isActive}`);
      console.log(`   Created: ${userByEmail._createdAt}`);
    } else {
      console.log(`\n❌ User with email "kruczku@pm.me" not found in Sanity`);
      console.log(`   This could indicate the user was created with a different email or ID`);
    }

    // 3. Check for subscriptions for this user (if found)
    if (userByEmail) {
      const userSubscriptions = await sanityClient.fetch(`
        *[_type == "subscription" && user._ref == $userId] {
          _id,
          type,
          passName,
          isActive,
          startDate,
          endDate,
          remainingClips,
          stripeSessionId,
          stripePaymentId,
          tenant->{_id, schoolName},
          _createdAt
        }
      `, { userId: userByEmail._id });

      console.log(`\n📊 Found ${userSubscriptions.length} subscriptions for this user:`);
      userSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName || 'Unknown Pass'} (${sub.type})`);
        console.log(`      Tenant: ${sub.tenant?.schoolName || 'Unknown'}`);
        console.log(`      Active: ${sub.isActive}`);
        console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
        console.log(`      Remaining: ${sub.remainingClips || 'Unlimited'}`);
        console.log(`      Session: ${sub.stripeSessionId || 'N/A'}`);
        console.log(`      Created: ${sub._createdAt}`);
      });

      // Filter for active subscriptions for this tenant
      const activeSubscriptionsForTenant = userSubscriptions.filter(sub => 
        sub.isActive && 
        sub.tenant?._id === tenant._id && 
        new Date(sub.endDate) > new Date()
      );

      console.log(`\n🎯 Active subscriptions for ${tenant.schoolName}: ${activeSubscriptionsForTenant.length}`);
    }

    // 4. Check Stripe for recent sessions with this email
    if (!tenant.stripeConnect?.accountId) {
      console.log(`\n⚠️ No Stripe Connect account configured for tenant`);
      return;
    }

    console.log(`\n💳 Checking Stripe sessions for email "kruczku@pm.me"...`);
    
    const recentSessions = await stripe.checkout.sessions.list({
      limit: 50,
      created: {
        gte: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // Last 30 days
      },
      expand: ['data.line_items']
    }, {
      stripeAccount: tenant.stripeConnect.accountId,
    });

    const userSessions = recentSessions.data.filter(session => 
      (session.customer_details?.email === 'kruczku@pm.me' || 
       session.customer_email === 'kruczku@pm.me') &&
      session.payment_status === 'paid'
    );

    console.log(`📋 Found ${userSessions.length} paid sessions for this email in last 30 days:`);

    for (let i = 0; i < userSessions.length; i++) {
      const session = userSessions[i];
      console.log(`\n🎫 Session ${i + 1}: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Customer Email: ${session.customer_details?.email || session.customer_email || 'N/A'}`);
      console.log(`   Created: ${new Date(session.created * 1000).toISOString()}`);
      
      if (session.metadata) {
        console.log(`   Metadata:`, JSON.stringify(session.metadata, null, 4));
        
        // Check if this should have created a subscription
        if (session.metadata.type === 'pass_purchase') {
          console.log(`   🎯 This is a pass purchase - should create subscription`);
          
          // Check if subscription exists in Sanity
          const subscription = await sanityClient.fetch(
            `*[_type == "subscription" && stripeSessionId == $sessionId][0] {
              _id,
              type,
              passName,
              isActive,
              user->{_id, name, email}
            }`,
            { sessionId: session.id }
          );
          
          if (subscription) {
            console.log(`   ✅ Subscription exists in Sanity:`, subscription);
          } else {
            console.log(`   ❌ NO SUBSCRIPTION FOUND IN SANITY for session ${session.id}`);
            console.log(`   🚨 This is the missing subscription!`);
            
            // Check if user exists with the metadata userId
            if (session.metadata.userId) {
              const userById = await sanityClient.fetch(
                `*[_type == "user" && _id == $userId][0] {
                  _id, name, email
                }`,
                { userId: session.metadata.userId }
              );
              console.log(`   User by metadata ID (${session.metadata.userId}): ${userById ? `${userById.name} (${userById.email})` : 'NOT FOUND'}`);
              
              if (!userById) {
                console.log(`   🔍 This could be the issue - user ID in metadata doesn't exist in Sanity`);
              }
            }
            
            // Check if pass exists
            if (session.metadata.passId) {
              const pass = await sanityClient.fetch(
                `*[_type == "pass" && _id == $passId][0] {
                  _id, name, type, price, validityDays, classesLimit
                }`,
                { passId: session.metadata.passId }
              );
              console.log(`   Pass exists: ${pass ? `${pass.name} (${pass.type})` : 'NOT FOUND'}`);
            }
          }
        }
      } else {
        console.log(`   ⚠️ No metadata found - this might not be a pass purchase`);
      }
    }

    // 5. Summary and recommendations
    console.log(`\n💡 DIAGNOSIS SUMMARY:`);
    
    if (userSessions.length === 0) {
      console.log(`❌ No recent paid sessions found for kruczku@pm.me`);
      console.log(`   Possible causes:`);
      console.log(`   - Payment was made more than 30 days ago`);
      console.log(`   - Payment was made with different email`);
      console.log(`   - Payment failed or is still pending`);
      console.log(`   - Wrong Stripe account being checked`);
    } else {
      const missingSessions = userSessions.filter(async (session) => {
        if (session.metadata?.type !== 'pass_purchase') return false;
        const sub = await sanityClient.fetch(
          `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
          { sessionId: session.id }
        );
        return !sub;
      });
      
      console.log(`✅ Found ${userSessions.length} paid sessions`);
      console.log(`🔧 RECOMMENDED ACTIONS:`);
      console.log(`1. Run create-missing-subscription.mjs to fix any missing subscriptions`);
      console.log(`2. Check if user needs to be created/updated in Sanity`);
      console.log(`3. Verify webhook configuration is working for future purchases`);
      console.log(`4. Ask student to refresh their subscriptions page to trigger sync`);
    }

  } catch (error) {
    console.error('❌ Error diagnosing user issue:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the diagnosis
diagnoseSpecificUser();
