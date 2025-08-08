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

async function fixUserAssociation() {
  console.log('🔧 Analyzing User Association Issue...\n');

  try {
    // Get tenant
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && defined(stripeConnect.accountId)][0] {
        _id,
        schoolName,
        stripeConnect { accountId }
      }
    `);

    const stripeAccountId = tenant.stripeConnect.accountId;

    // Get checkout sessions
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    }, {
      stripeAccount: stripeAccountId,
    });

    // Get charges to see billing details
    const charges = await stripe.charges.list({
      limit: 10,
    }, {
      stripeAccount: stripeAccountId,
    });

    console.log('📧 Email Analysis:');
    
    // Group by email to see the pattern
    const emailGroups = {};
    
    charges.data.forEach(charge => {
      const email = charge.billing_details?.email || charge.receipt_email || 'unknown';
      const name = charge.billing_details?.name || 'unknown';
      
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push({
        chargeId: charge.id,
        name: name,
        amount: charge.amount / 100,
        date: new Date(charge.created * 1000).toISOString().split('T')[0]
      });
    });

    Object.entries(emailGroups).forEach(([email, charges]) => {
      console.log(`\n📧 Email: ${email}`);
      console.log(`   Charges: ${charges.length}`);
      charges.forEach(charge => {
        console.log(`     ${charge.date}: ${charge.name} - ${charge.amount} NOK (${charge.chargeId})`);
      });
      
      // Find matching Sanity user
      console.log(`   Looking for Sanity user with email: ${email}`);
    });

    // Check Sanity users by email
    console.log('\n👥 Sanity Users by Email:');
    const usersByEmail = await sanityClient.fetch(`
      *[_type == "user"] {
        _id,
        clerkId,
        name,
        firstName,
        lastName,
        email
      }
    `);
    
    const emailToUserMap = {};
    usersByEmail.forEach(user => {
      if (user.email) {
        emailToUserMap[user.email] = user;
        console.log(`   ${user.email} -> ${user.name || `${user.firstName} ${user.lastName}`} (${user.clerkId})`);
      }
    });

    console.log('\n🔍 Mismatch Analysis:');
    
    // Check for mismatches
    Object.entries(emailGroups).forEach(([email, charges]) => {
      const sanityUser = emailToUserMap[email];
      
      if (sanityUser) {
        const sanityName = sanityUser.name || `${sanityUser.firstName} ${sanityUser.lastName}`;
        const stripeName = charges[0].name; // Use first charge's name
        
        if (stripeName !== sanityName && stripeName !== 'unknown') {
          console.log(`\n⚠️  MISMATCH for ${email}:`);
          console.log(`     Stripe billing name: "${stripeName}"`);
          console.log(`     Sanity user name: "${sanityName}"`);
          console.log(`     Sanity clerkId: ${sanityUser.clerkId}`);
          
          // Check if this clerkId is being used in checkout sessions
          const sessionsWithThisUser = checkoutSessions.data.filter(
            session => session.metadata?.userId === sanityUser.clerkId
          );
          
          console.log(`     Sessions using this clerkId: ${sessionsWithThisUser.length}`);
          
          if (sessionsWithThisUser.length === 0) {
            console.log(`     🚨 PROBLEM: No sessions found with clerkId ${sanityUser.clerkId}`);
            console.log(`     This means purchases with email ${email} are not being linked to the right user!`);
          }
        }
      } else {
        console.log(`\n❌ No Sanity user found for email: ${email}`);
      }
    });

    // Recommendation
    console.log('\n💡 RECOMMENDATION:');
    console.log('The issue is likely that:');
    console.log('1. Purchases are being made with real emails (mollergata9@gmail.com)');
    console.log('2. But the checkout sessions have userId pointing to a test user ("Dance Customer")');
    console.log('3. We should match by EMAIL instead of relying on session metadata userId');
    
    console.log('\n🔧 SOLUTION OPTIONS:');
    console.log('Option 1: Match users by email from Stripe billing details');
    console.log('Option 2: Fix the checkout session metadata to use correct userId');
    console.log('Option 3: Use Stripe billing name as primary (what customer actually entered)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the analysis
fixUserAssociation();
