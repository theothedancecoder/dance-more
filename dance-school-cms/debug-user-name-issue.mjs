import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function debugUserNameIssue() {
  console.log('🔍 Debugging User Name Issue...\n');

  try {
    // Get tenant with Stripe Connect account
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && defined(stripeConnect.accountId)][0] {
        _id,
        schoolName,
        slug,
        stripeConnect {
          accountId,
          accountStatus
        }
      }
    `);

    if (!tenant) {
      console.log('❌ No tenant found with Stripe Connect account');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName}`);
    const stripeAccountId = tenant.stripeConnect.accountId;

    // Fetch checkout sessions with metadata
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log(`\n📋 Found ${checkoutSessions.data.length} checkout sessions\n`);

    // Analyze each session
    for (let i = 0; i < Math.min(3, checkoutSessions.data.length); i++) {
      const session = checkoutSessions.data[i];
      console.log(`🎫 Session ${i + 1}:`);
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Payment Intent: ${session.payment_intent}`);
      console.log(`   Customer Email: ${session.customer_details?.email || 'N/A'}`);
      console.log(`   Customer Name: ${session.customer_details?.name || 'N/A'}`);
      
      console.log(`   Metadata:`, JSON.stringify(session.metadata, null, 4));
      
      // Check if we have userId in metadata
      if (session.metadata?.userId) {
        console.log(`   ✅ Found userId in metadata: ${session.metadata.userId}`);
        
        // Try to find this user in Sanity
        const user = await sanityClient.fetch(
          `*[_type == "user" && clerkId == $userId][0] {
            _id,
            clerkId,
            name,
            firstName,
            lastName,
            email
          }`,
          { userId: session.metadata.userId }
        );
        
        if (user) {
          console.log(`   ✅ Found user in Sanity:`, JSON.stringify(user, null, 4));
          const properName = user.name || 
                           (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                           'Unknown User';
          console.log(`   🎯 Should display name: "${properName}"`);
        } else {
          console.log(`   ❌ User not found in Sanity for clerkId: ${session.metadata.userId}`);
        }
      } else {
        console.log(`   ❌ No userId in session metadata`);
      }
      
      console.log(`   ---`);
    }

    // Also check what users exist in Sanity
    console.log(`\n👥 Users in Sanity:`);
    const allUsers = await sanityClient.fetch(`
      *[_type == "user"] {
        _id,
        clerkId,
        name,
        firstName,
        lastName,
        email
      }
    `);
    
    allUsers.forEach((user, index) => {
      console.log(`   User ${index + 1}:`);
      console.log(`     ClerkId: ${user.clerkId}`);
      console.log(`     Name: ${user.name || 'N/A'}`);
      console.log(`     First/Last: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
      console.log(`     Email: ${user.email || 'N/A'}`);
    });

    // Now let's check what the current API logic would return
    console.log(`\n🔧 Current API Logic Test:`);
    
    const userIds = Array.from(new Set(
      checkoutSessions.data
        .map(session => session.metadata?.userId)
        .filter(Boolean)
    ));
    
    console.log(`   UserIds from sessions: [${userIds.join(', ')}]`);
    
    if (userIds.length > 0) {
      const users = await sanityClient.fetch(
        `*[_type == "user" && clerkId in $userIds] {
          clerkId,
          name,
          firstName,
          lastName,
          email
        }`,
        { userIds }
      );
      
      console.log(`   Found ${users.length} matching users in Sanity`);
      
      const userMap = new Map();
      users.forEach((user) => {
        userMap.set(user.clerkId, user);
        console.log(`   Mapped: ${user.clerkId} -> ${user.name || `${user.firstName} ${user.lastName}`}`);
      });
      
      // Test the name resolution for first session
      if (checkoutSessions.data.length > 0) {
        const testSession = checkoutSessions.data[0];
        const sessionMetadata = testSession.metadata || {};
        
        console.log(`\n🧪 Testing name resolution for session: ${testSession.id}`);
        
        let studentName = 'Unknown Student';
        if (sessionMetadata.userId) {
          const user = userMap.get(sessionMetadata.userId);
          if (user) {
            studentName = user.name || 
                         (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
                         'Unknown Student';
            console.log(`   ✅ Found user in map: ${studentName}`);
          } else {
            console.log(`   ❌ User not found in map for userId: ${sessionMetadata.userId}`);
          }
        } else {
          console.log(`   ❌ No userId in session metadata`);
        }
        
        // Check what Stripe billing details show
        const charges = await stripe.charges.list({
          payment_intent: testSession.payment_intent,
          limit: 1
        }, {
          stripeAccount: stripeAccountId,
        });
        
        if (charges.data.length > 0) {
          const charge = charges.data[0];
          console.log(`   Stripe billing name: "${charge.billing_details?.name || 'N/A'}"`);
          console.log(`   Stripe billing email: "${charge.billing_details?.email || 'N/A'}"`);
        }
        
        console.log(`   Final resolved name: "${studentName}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error debugging user name issue:', error);
  }
}

// Run the debug
debugUserNameIssue();
