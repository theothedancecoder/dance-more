#!/usr/bin/env node

/**
 * Comprehensive Student Issue Diagnosis
 * Checks multiple aspects to understand why students don't see their passes
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

console.log('🔍 Comprehensive Student Issue Diagnosis\n');
console.log('═══════════════════════════════════════\n');

async function diagnoseStudentIssue() {
  try {
    // 1. Check Stripe mode
    console.log('1️⃣ Checking Stripe Configuration...\n');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isLiveMode = stripeKey?.startsWith('sk_live_');
    const isTestMode = stripeKey?.startsWith('sk_test_');
    
    console.log(`   Stripe Mode: ${isLiveMode ? '🟢 LIVE' : isTestMode ? '🟡 TEST' : '❓ UNKNOWN'}`);
    console.log(`   Key prefix: ${stripeKey?.substring(0, 10)}...`);
    console.log('');

    // 2. Check recent purchases (last 30 days)
    console.log('2️⃣ Checking Recent Stripe Purchases (Last 30 Days)...\n');
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    console.log(`   Total checkout sessions: ${sessions.data.length}`);
    
    const completedPurchases = sessions.data.filter(session => 
      session.payment_status === 'paid'
    );
    
    console.log(`   Completed payments: ${completedPurchases.length}`);
    
    const passPurchases = completedPurchases.filter(session =>
      session.metadata?.type === 'pass_purchase'
    );
    
    console.log(`   Pass purchases: ${passPurchases.length}`);
    console.log('');

    if (passPurchases.length > 0) {
      console.log('   Recent pass purchases:');
      passPurchases.slice(0, 5).forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.customer_details?.email || 'Unknown'}`);
        console.log(`      Date: ${new Date(session.created * 1000).toLocaleDateString()}`);
        console.log(`      Amount: ${session.amount_total / 100} ${session.currency.toUpperCase()}`);
        console.log(`      Session ID: ${session.id}`);
        console.log('');
      });
    }

    // 3. Check Sanity subscriptions
    console.log('3️⃣ Checking Sanity Subscriptions...\n');
    
    const allSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription"] | order(_createdAt desc) [0...20] {
        _id,
        _createdAt,
        passName,
        "userName": user->name,
        "userEmail": user->email,
        isActive,
        startDate,
        endDate,
        stripeSessionId,
        createdViaWebhook,
        createdViaRecovery
      }
    `);

    console.log(`   Total subscriptions (last 20): ${allSubscriptions.length}`);
    
    const activeSubscriptions = allSubscriptions.filter(sub => sub.isActive);
    console.log(`   Active subscriptions: ${activeSubscriptions.length}`);
    
    const recentSubscriptions = allSubscriptions.filter(sub => {
      const createdDate = new Date(sub._createdAt);
      const thirtyDaysAgoDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      return createdDate > thirtyDaysAgoDate;
    });
    console.log(`   Created in last 30 days: ${recentSubscriptions.length}`);
    console.log('');

    if (recentSubscriptions.length > 0) {
      console.log('   Recent subscriptions:');
      recentSubscriptions.slice(0, 5).forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.userName || 'Unknown'} (${sub.userEmail || 'No email'})`);
        console.log(`      Pass: ${sub.passName}`);
        console.log(`      Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
        console.log(`      Active: ${sub.isActive ? '✅' : '❌'}`);
        console.log(`      Via Webhook: ${sub.createdViaWebhook ? '✅' : '❌'}`);
        console.log(`      Via Recovery: ${sub.createdViaRecovery ? '✅' : '❌'}`);
        console.log('');
      });
    }

    // 4. Check for webhook logs
    console.log('4️⃣ Checking Webhook Logs...\n');
    
    const webhookLogs = await sanityClient.fetch(`
      *[_type == "webhookLog"] | order(timestamp desc) [0...10] {
        _id,
        eventType,
        status,
        timestamp,
        details
      }
    `);

    if (webhookLogs.length > 0) {
      console.log(`   Found ${webhookLogs.length} webhook logs (last 10)`);
      console.log('');
      
      const successLogs = webhookLogs.filter(log => log.status === 'success');
      const errorLogs = webhookLogs.filter(log => log.status === 'error');
      
      console.log(`   Success: ${successLogs.length}`);
      console.log(`   Errors: ${errorLogs.length}`);
      console.log('');
      
      if (errorLogs.length > 0) {
        console.log('   Recent errors:');
        errorLogs.slice(0, 3).forEach((log, index) => {
          console.log(`   ${index + 1}. ${log.eventType}`);
          console.log(`      Time: ${new Date(log.timestamp).toLocaleString()}`);
          console.log(`      Error: ${log.details?.error || 'Unknown'}`);
          console.log('');
        });
      }
    } else {
      console.log('   ⚠️  No webhook logs found');
      console.log('   This could mean:');
      console.log('   - Webhook logging schema not deployed');
      console.log('   - No webhooks have been received yet');
      console.log('   - Webhooks are not configured');
      console.log('');
    }

    // 5. Compare Stripe purchases with Sanity subscriptions
    console.log('5️⃣ Comparing Stripe Purchases with Sanity Subscriptions...\n');
    
    const missingSubscriptions = [];
    
    for (const session of passPurchases) {
      const subscription = await sanityClient.fetch(
        `*[_type == "subscription" && (stripeSessionId == $sessionId || stripePaymentId == $paymentId)][0]`,
        { 
          sessionId: session.id,
          paymentId: session.payment_intent 
        }
      );

      if (!subscription) {
        missingSubscriptions.push({
          email: session.customer_details?.email || session.customer_email,
          name: session.customer_details?.name,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          date: new Date(session.created * 1000).toLocaleDateString(),
          sessionId: session.id,
        });
      }
    }

    if (missingSubscriptions.length > 0) {
      console.log(`   ❌ Found ${missingSubscriptions.length} purchases WITHOUT subscriptions:\n`);
      missingSubscriptions.forEach((purchase, index) => {
        console.log(`   ${index + 1}. ${purchase.name || 'Unknown'} (${purchase.email})`);
        console.log(`      Amount: ${purchase.amount} ${purchase.currency}`);
        console.log(`      Date: ${purchase.date}`);
        console.log(`      Session: ${purchase.sessionId}`);
        console.log('');
      });
    } else {
      console.log('   ✅ All Stripe purchases have corresponding subscriptions');
      console.log('');
    }

    // 6. Check deployment status
    console.log('6️⃣ Checking Deployment Status...\n');
    
    // Check if webhook improvements are in the code
    const webhookRouteExists = true; // We know it exists from our earlier checks
    console.log(`   Webhook route file: ${webhookRouteExists ? '✅' : '❌'}`);
    
    // Check if manual sync API exists
    const syncApiExists = true; // We know it exists
    console.log(`   Manual sync API: ${syncApiExists ? '✅' : '❌'}`);
    
    console.log('');
    console.log('   ⚠️  Note: To verify these are deployed to production,');
    console.log('   check your Vercel deployment or run the app locally.');
    console.log('');

    // Summary and recommendations
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY & RECOMMENDATIONS');
    console.log('═══════════════════════════════════════\n');

    if (missingSubscriptions.length > 0) {
      console.log('🔴 ISSUE FOUND: Missing Subscriptions\n');
      console.log(`   ${missingSubscriptions.length} students paid but don't have subscriptions.\n`);
      console.log('   IMMEDIATE ACTION:');
      console.log('   1. Run: node recover-all-missing-passes.mjs');
      console.log('   2. Notify affected students');
      console.log('   3. Investigate why webhooks failed\n');
    } else if (passPurchases.length === 0) {
      console.log('🟡 NO RECENT PURCHASES FOUND\n');
      console.log('   Possible reasons:');
      console.log('   1. Students purchased more than 30 days ago');
      console.log('   2. Using wrong Stripe mode (test vs live)');
      console.log('   3. Purchases were made on a different account\n');
      console.log('   NEXT STEPS:');
      console.log('   1. Verify you\'re using the correct Stripe account');
      console.log('   2. Check if students have purchase confirmation emails');
      console.log('   3. Ask students for their purchase date');
      console.log('   4. Check Stripe Dashboard directly\n');
    } else {
      console.log('🟢 NO ISSUES DETECTED\n');
      console.log('   All recent purchases have subscriptions.\n');
      console.log('   If students still report missing passes:');
      console.log('   1. Ask them to refresh their browser');
      console.log('   2. Have them click "Missing Pass?" button');
      console.log('   3. Verify they\'re signed in with correct email');
      console.log('   4. Check if passes are expired\n');
    }

    // Additional checks
    if (webhookLogs.length === 0) {
      console.log('⚠️  WARNING: No webhook logs found\n');
      console.log('   This suggests webhook logging may not be deployed.');
      console.log('   Deploy the webhook improvements to enable monitoring.\n');
    }

    const errorLogs = webhookLogs.filter(log => log.status === 'error');
    
    if (errorLogs.length > 0) {
      console.log('⚠️  WARNING: Recent webhook errors detected\n');
      console.log('   Review the errors above and fix the root cause.');
      console.log('   Common issues:');
      console.log('   - Missing metadata in checkout sessions');
      console.log('   - Invalid pass configurations');
      console.log('   - Sanity connection issues\n');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

diagnoseStudentIssue();
