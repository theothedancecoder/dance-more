#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

console.log('🔄 COMPREHENSIVE SUBSCRIPTION SYNC');
console.log('='.repeat(50));

async function syncAllMissingSubscriptions() {
  try {
    console.log('1. Fetching recent Stripe checkout sessions...');
    
    // Get all completed checkout sessions from the last 30 days
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      status: 'complete',
      expand: ['data.line_items']
    });
    
    console.log(`Found ${sessions.data.length} completed sessions in last 30 days`);
    
    // Filter for pass purchases only
    const passPurchases = sessions.data.filter(session => 
      session.metadata?.type === 'pass_purchase' && 
      session.metadata?.passId &&
      session.metadata?.userId &&
      session.metadata?.tenantId
    );
    
    console.log(`Found ${passPurchases.length} pass purchase sessions`);
    
    console.log('\n2. Checking which sessions already have subscriptions...');
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const session of passPurchases) {
      const { passId, userId, tenantId } = session.metadata;
      const sessionId = session.id;
      const createdTime = new Date(session.created * 1000);
      
      console.log(`\n📋 Processing session: ${sessionId}`);
      console.log(`   Created: ${createdTime.toLocaleString()}`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      console.log(`   Pass ID: ${passId}`);
      console.log(`   User ID: ${userId}`);
      
      // Check if subscription already exists
      const existingSubscription = await sanityClient.fetch(
        `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
        { sessionId }
      );
      
      if (existingSubscription) {
        console.log(`   ✅ Subscription already exists: ${existingSubscription._id}`);
        skippedCount++;
        continue;
      }
      
      console.log(`   🔍 No subscription found - creating new one...`);
      
      try {
        // Get pass details
        const pass = await sanityClient.fetch(
          `*[_type == "pass" && _id == $passId && isActive == true][0]`,
          { passId }
        );
        
        if (!pass) {
          console.log(`   ❌ Pass not found: ${passId}`);
          errorCount++;
          continue;
        }
        
        console.log(`   📋 Pass: ${pass.name} (${pass.type})`);
        
        // Calculate subscription details
        const now = new Date(session.created * 1000); // Use session creation time
        const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
        
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
            console.log(`   ❌ Invalid pass type: ${pass.type}`);
            errorCount++;
            continue;
        }
        
        // Create subscription
        const subscriptionData = {
          _type: 'subscription',
          user: {
            _type: 'reference',
            _ref: userId,
          },
          tenant: {
            _type: 'reference',
            _ref: tenantId,
          },
          type: subscriptionType,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          remainingClips,
          passId: pass._id,
          passName: pass.name,
          purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
          stripeSessionId: sessionId,
          isActive: true,
        };
        
        const createdSubscription = await writeClient.create(subscriptionData);
        
        console.log(`   🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
        console.log(`   📋 Details: ${pass.name} - ${subscriptionType} - ${remainingClips || 'unlimited'} clips`);
        createdCount++;
        
      } catch (error) {
        console.error(`   ❌ Error creating subscription:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 SYNC SUMMARY:');
    console.log('='.repeat(20));
    console.log(`✅ Created: ${createdCount} subscriptions`);
    console.log(`⏭️  Skipped: ${skippedCount} (already exist)`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${passPurchases.length} sessions`);
    
    if (createdCount > 0) {
      console.log('\n🎉 SUCCESS! Missing subscriptions have been created.');
      console.log('🔄 Refresh your subscriptions page to see the new passes!');
    } else if (skippedCount > 0) {
      console.log('\n✅ All subscriptions are up to date - no missing subscriptions found.');
    } else {
      console.log('\n⚠️  No pass purchases found in the last 30 days.');
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

syncAllMissingSubscriptions();
