#!/usr/bin/env node

/**
 * Diagnose Missing Passes
 * Finds students who paid for passes but don't have subscriptions in Sanity
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

console.log('🔍 Diagnosing Missing Passes\n');
console.log('═══════════════════════════════════════\n');

async function diagnoseMissingPasses() {
  try {
    // Get all successful checkout sessions from the last 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    console.log('📊 Fetching Stripe checkout sessions from last 7 days...');
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    });

    console.log(`✅ Found ${sessions.data.length} checkout sessions\n`);

    // Filter for completed pass purchases
    const completedPurchases = sessions.data.filter(session => 
      session.payment_status === 'paid' && 
      session.metadata?.type === 'pass_purchase'
    );

    console.log(`💰 Found ${completedPurchases.length} completed pass purchases\n`);

    if (completedPurchases.length === 0) {
      console.log('ℹ️  No pass purchases found in the last 7 days.');
      return;
    }

    // Check each purchase for corresponding subscription
    const missingSubscriptions = [];
    const foundSubscriptions = [];

    for (const session of completedPurchases) {
      const { userId, passId, tenantId } = session.metadata || {};
      
      // Check if subscription exists
      const subscription = await sanityClient.fetch(
        `*[_type == "subscription" && (stripeSessionId == $sessionId || stripePaymentId == $paymentId)][0]`,
        { 
          sessionId: session.id,
          paymentId: session.payment_intent 
        }
      );

      const purchaseInfo = {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_details?.email || session.customer_email,
        customerName: session.customer_details?.name,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        created: new Date(session.created * 1000).toLocaleString(),
        userId,
        passId,
        tenantId,
      };

      if (subscription) {
        foundSubscriptions.push({
          ...purchaseInfo,
          subscriptionId: subscription._id,
          passName: subscription.passName,
        });
      } else {
        missingSubscriptions.push(purchaseInfo);
      }
    }

    // Display results
    console.log('═══════════════════════════════════════\n');
    console.log('📊 DIAGNOSIS RESULTS\n');
    console.log('═══════════════════════════════════════\n');

    if (foundSubscriptions.length > 0) {
      console.log(`✅ ${foundSubscriptions.length} purchases with subscriptions:\n`);
      foundSubscriptions.forEach((purchase, index) => {
        console.log(`${index + 1}. ${purchase.customerName || 'Unknown'} (${purchase.customerEmail})`);
        console.log(`   Pass: ${purchase.passName}`);
        console.log(`   Amount: ${purchase.amount} ${purchase.currency}`);
        console.log(`   Date: ${purchase.created}`);
        console.log(`   Subscription ID: ${purchase.subscriptionId}`);
        console.log('');
      });
    }

    if (missingSubscriptions.length > 0) {
      console.log(`❌ ${missingSubscriptions.length} purchases WITHOUT subscriptions:\n`);
      missingSubscriptions.forEach((purchase, index) => {
        console.log(`${index + 1}. ${purchase.customerName || 'Unknown'} (${purchase.customerEmail})`);
        console.log(`   Amount: ${purchase.amount} ${purchase.currency}`);
        console.log(`   Date: ${purchase.created}`);
        console.log(`   Session ID: ${purchase.sessionId}`);
        console.log(`   Payment Intent: ${purchase.paymentIntent}`);
        console.log(`   User ID: ${purchase.userId || 'Missing'}`);
        console.log(`   Pass ID: ${purchase.passId || 'Missing'}`);
        console.log(`   Tenant ID: ${purchase.tenantId || 'Missing'}`);
        console.log('');
      });

      console.log('═══════════════════════════════════════\n');
      console.log('🔧 RECOVERY OPTIONS\n');
      console.log('═══════════════════════════════════════\n');
      console.log('Option 1: Recover all missing passes at once:');
      console.log('  node dance-school-cms/recover-all-missing-passes.mjs\n');
      console.log('Option 2: Recover individual student:');
      console.log('  node dance-school-cms/recover-student-pass.mjs <email>\n');
      console.log('Option 3: Ask student to use "Missing Pass?" button on website\n');
    } else {
      console.log('✅ All purchases have corresponding subscriptions!\n');
      console.log('If students still report missing passes, they may need to:');
      console.log('1. Refresh their browser');
      console.log('2. Click the "Missing Pass?" button on the subscriptions page');
      console.log('3. Sign out and sign back in\n');
    }

    // Summary
    console.log('═══════════════════════════════════════\n');
    console.log('📈 SUMMARY\n');
    console.log('═══════════════════════════════════════\n');
    console.log(`Total purchases (7 days): ${completedPurchases.length}`);
    console.log(`With subscriptions: ${foundSubscriptions.length}`);
    console.log(`Missing subscriptions: ${missingSubscriptions.length}`);
    console.log(`Success rate: ${((foundSubscriptions.length / completedPurchases.length) * 100).toFixed(1)}%\n`);

    if (missingSubscriptions.length > 0) {
      console.log('⚠️  ACTION REQUIRED: Run recovery script to fix missing subscriptions\n');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

diagnoseMissingPasses();
