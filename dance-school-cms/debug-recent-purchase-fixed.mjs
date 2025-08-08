#!/usr/bin/env node
import { config } from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🔍 DEBUGGING RECENT PURCHASE');
console.log('='.repeat(50));

async function debugRecentPurchase() {
  try {
    console.log('1. Fetching recent Stripe checkout sessions...');
    
    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      expand: ['data.line_items']
    });
    
    console.log(`Found ${sessions.data.length} recent sessions:`);
    console.log(`Current time: ${new Date().toLocaleString()}`);
    
    sessions.data.forEach((session, i) => {
      const createdTime = new Date(session.created * 1000);
      const minutesAgo = Math.round((Date.now() - createdTime.getTime()) / (1000 * 60));
      
      console.log(`\n${i + 1}. Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      console.log(`   Customer Email: ${session.customer_email}`);
      console.log(`   Created: ${createdTime.toLocaleString()} (${minutesAgo} minutes ago)`);
      console.log(`   Metadata:`, session.metadata);
      
      if (session.line_items?.data) {
        console.log(`   Items:`, session.line_items.data.map(item => item.description));
      }
    });
    
    // Get the most recent completed session
    const recentSession = sessions.data.find(s => s.status === 'complete');
    
    if (!recentSession) {
      console.log('\n❌ No completed sessions found');
      return;
    }
    
    console.log(`\n2. Checking if subscription exists for most recent session: ${recentSession.id}`);
    
    // Check if subscription was created for this session
    const existingSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && stripeSessionId == $sessionId][0] {
        _id,
        passName,
        type,
        user->{_id, name, email},
        createdAt
      }
    `, { sessionId: recentSession.id });
    
    if (existingSubscription) {
      console.log('✅ Subscription found in Sanity:');
      console.log(`   ID: ${existingSubscription._id}`);
      console.log(`   Pass: ${existingSubscription.passName}`);
      console.log(`   User: ${existingSubscription.user?.name} (${existingSubscription.user?.email})`);
      console.log(`   Created: ${existingSubscription.createdAt}`);
    } else {
      console.log('❌ NO SUBSCRIPTION FOUND IN SANITY!');
      console.log('🚨 This confirms the webhook is not creating subscriptions for this session');
    }
    
  } catch (error) {
    console.error('❌ Error debugging purchase:', error);
  }
}

debugRecentPurchase();
