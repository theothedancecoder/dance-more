#!/usr/bin/env node

/**
 * Recover Pass for Siri Lund
 * Email: siri.lund@yahoo.de
 * Purchase Date: January 18, 2026
 */

import { createClient } from '@sanity/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔧 Recovering Pass for Siri Lund\n');
console.log('═══════════════════════════════════════\n');

const STUDENT_EMAIL = 'siri.lund@yahoo.de';
const PURCHASE_DATE = '2026-01-18';

async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`  ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

async function recoverSiriLundPass() {
  try {
    console.log(`📧 Student Email: ${STUDENT_EMAIL}`);
    console.log(`📅 Purchase Date: ${PURCHASE_DATE}\n`);

    // Step 1: Check if subscription already exists
    console.log('1️⃣ Checking if subscription already exists...\n');
    
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && user->email == $email && startDate >= $startDate][0] {
        _id,
        passName,
        startDate,
        endDate,
        isActive,
        remainingClips
      }`,
      { 
        email: STUDENT_EMAIL,
        startDate: new Date(PURCHASE_DATE).toISOString()
      }
    );

    if (existingSubscription) {
      console.log('✅ Subscription already exists!');
      console.log(`   Pass: ${existingSubscription.passName}`);
      console.log(`   Active: ${existingSubscription.isActive ? 'Yes' : 'No'}`);
      console.log(`   Valid until: ${new Date(existingSubscription.endDate).toLocaleDateString()}`);
      if (existingSubscription.remainingClips !== undefined) {
        console.log(`   Classes remaining: ${existingSubscription.remainingClips}`);
      }
      console.log(`   Subscription ID: ${existingSubscription._id}\n`);
      console.log('ℹ️  Student should be able to see this pass.');
      console.log('   If they don\'t, ask them to:');
      console.log('   1. Refresh their browser');
      console.log('   2. Click "Missing Pass?" button');
      console.log('   3. Sign out and sign back in\n');
      return;
    }

    console.log('⚠️  No subscription found. Searching Stripe...\n');

    // Step 2: Find the purchase in Stripe
    console.log('2️⃣ Searching Stripe for purchase...\n');
    
    // Search around January 18, 2026
    const purchaseDate = new Date(PURCHASE_DATE);
    const startOfDay = Math.floor(purchaseDate.getTime() / 1000);
    const endOfDay = startOfDay + (24 * 60 * 60);

    const sessions = await stripe.checkout.sessions.list({
      created: { gte: startOfDay, lte: endOfDay },
      limit: 100,
    });

    console.log(`   Found ${sessions.data.length} checkout sessions on ${PURCHASE_DATE}\n`);

    // Find session for this email
    const studentSession = sessions.data.find(session => 
      (session.customer_details?.email === STUDENT_EMAIL || 
       session.customer_email === STUDENT_EMAIL) &&
      session.payment_status === 'paid'
    );

    if (!studentSession) {
      console.log('❌ No Stripe purchase found for this email on this date.\n');
      console.log('Possible reasons:');
      console.log('1. Purchase was on a different date');
      console.log('2. Different email was used');
      console.log('3. Using wrong Stripe mode (test vs live)\n');
      console.log('Please check:');
      console.log('- Stripe Dashboard (make sure you\'re in LIVE mode)');
      console.log('- Student\'s purchase confirmation email');
      console.log('- Exact purchase date\n');
      return;
    }

    console.log('✅ Found Stripe purchase!');
    console.log(`   Session ID: ${studentSession.id}`);
    console.log(`   Amount: ${studentSession.amount_total / 100} ${studentSession.currency.toUpperCase()}`);
    console.log(`   Customer: ${studentSession.customer_details?.name || 'Unknown'}`);
    console.log(`   Payment Status: ${studentSession.payment_status}\n`);

    // Step 3: Get metadata
    console.log('3️⃣ Extracting purchase details...\n');
    
    const { passId, userId, tenantId, type } = studentSession.metadata || {};
    
    console.log(`   Pass ID: ${passId || 'Missing ⚠️'}`);
    console.log(`   User ID: ${userId || 'Missing ⚠️'}`);
    console.log(`   Tenant ID: ${tenantId || 'Missing ⚠️'}`);
    console.log(`   Type: ${type || 'Missing ⚠️'}\n`);

    if (!passId || !userId || !tenantId) {
      console.log('❌ Missing required metadata in Stripe session.\n');
      console.log('This means the purchase was made before metadata was properly configured.');
      console.log('We\'ll need to create the subscription manually.\n');
      
      // Manual creation flow
      console.log('4️⃣ Manual subscription creation required...\n');
      console.log('Please run: node create-subscription-for-user.mjs');
      console.log('And provide the following information:');
      console.log(`- Email: ${STUDENT_EMAIL}`);
      console.log(`- Amount paid: ${studentSession.amount_total / 100} ${studentSession.currency.toUpperCase()}`);
      console.log(`- Purchase date: ${PURCHASE_DATE}\n`);
      return;
    }

    // Step 4: Get pass details
    console.log('4️⃣ Fetching pass details...\n');
    
    const pass = await retryOperation(async () => {
      return await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId][0] {
          _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
        }`,
        { passId }
      );
    });

    if (!pass) {
      console.error(`❌ Pass not found: ${passId}\n`);
      return;
    }

    console.log(`✅ Found pass: ${pass.name}`);
    console.log(`   Type: ${pass.type}`);
    console.log(`   Price: ${pass.price} kr`);
    if (pass.classesLimit) {
      console.log(`   Classes: ${pass.classesLimit}`);
    }
    console.log('');

    // Step 5: Ensure user exists
    console.log('5️⃣ Checking user account...\n');
    
    let user = await retryOperation(async () => {
      return await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId][0]`,
        { userId }
      );
    });

    if (!user) {
      console.log(`⚠️  User not found. Creating user account...\n`);
      user = await retryOperation(async () => {
        return await sanityClient.create({
          _type: 'user',
          clerkId: userId,
          name: studentSession.customer_details?.name || 'Siri Lund',
          email: STUDENT_EMAIL,
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      console.log(`✅ User created: ${user._id}\n`);
    } else {
      console.log(`✅ User exists: ${user.name} (${user._id})\n`);
    }

    // Step 6: Calculate subscription details
    console.log('6️⃣ Calculating subscription details...\n');
    
    const purchaseDateObj = new Date(studentSession.created * 1000);
    let endDate;

    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
    } else if (pass.validityType === 'days' && pass.validityDays) {
      endDate = new Date(purchaseDateObj.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
    } else if (pass.validityDays) {
      endDate = new Date(purchaseDateObj.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
    } else {
      console.error('❌ Pass has no valid expiry configuration\n');
      return;
    }

    let subscriptionType;
    let remainingClips;

    switch (pass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = pass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = pass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined;
        break;
      default:
        console.error(`❌ Invalid pass type: ${pass.type}\n`);
        return;
    }

    console.log(`   Type: ${subscriptionType}`);
    console.log(`   Start: ${purchaseDateObj.toLocaleDateString()}`);
    console.log(`   End: ${endDate.toLocaleDateString()}`);
    console.log(`   Classes: ${remainingClips || 'Unlimited'}\n`);

    // Step 7: Create subscription
    console.log('7️⃣ Creating subscription...\n');
    
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: subscriptionType,
      startDate: purchaseDateObj.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: studentSession.amount_total ? studentSession.amount_total / 100 : pass.price,
      stripePaymentId: studentSession.payment_intent,
      stripeSessionId: studentSession.id,
      isActive: true,
      createdViaRecovery: true,
      recoveredAt: new Date().toISOString(),
      recoveredBy: 'manual-script',
    };

    const createdSubscription = await retryOperation(async () => {
      return await sanityClient.create(subscriptionData);
    });
    
    console.log('═══════════════════════════════════════');
    console.log('🎉 SUCCESS!');
    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Created subscription: ${createdSubscription._id}`);
    console.log(`✅ Student: ${user.name} (${STUDENT_EMAIL})`);
    console.log(`✅ Pass: ${pass.name}`);
    console.log(`✅ Valid until: ${endDate.toLocaleDateString()}`);
    if (remainingClips !== undefined) {
      console.log(`✅ Classes remaining: ${remainingClips}`);
    }
    console.log('');
    console.log('📧 Next Steps:');
    console.log('1. Email Siri Lund to let her know her pass is ready');
    console.log('2. Ask her to refresh her browser');
    console.log('3. She should see the pass at /subscriptions\n');
    console.log('Email template:');
    console.log('─────────────────────────────────────');
    console.log(`Subject: Your Dance Pass is Ready!`);
    console.log('');
    console.log(`Hi Siri,`);
    console.log('');
    console.log(`Good news! Your ${pass.name} is now active and ready to use.`);
    console.log('');
    console.log(`You can view it here: [Your School URL]/subscriptions`);
    console.log('');
    console.log(`If you don't see it immediately:`);
    console.log(`1. Refresh your browser (Ctrl+R or Cmd+R)`);
    console.log(`2. Or click the "Missing Pass?" button on the page`);
    console.log('');
    console.log(`Happy dancing!`);
    console.log('─────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error during recovery:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

recoverSiriLundPass();
