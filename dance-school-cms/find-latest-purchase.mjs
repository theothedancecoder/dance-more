#!/usr/bin/env node
import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 SEARCHING FOR YOUR LATEST PURCHASE');
console.log('='.repeat(50));

async function findLatestPurchase() {
  try {
    // Get sessions from the last hour
    const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
    
    console.log('Checking sessions from the last hour...');
    console.log(`Looking for sessions after: ${new Date(oneHourAgo * 1000).toLocaleString()}`);
    
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      created: { gte: oneHourAgo },
      expand: ['data.line_items']
    });
    
    console.log(`\nFound ${sessions.data.length} sessions in the last hour:`);
    
    sessions.data.forEach((session, i) => {
      const createdTime = new Date(session.created * 1000);
      const minutesAgo = Math.round((Date.now() - createdTime.getTime()) / (1000 * 60));
      
      console.log(`\n${i + 1}. Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created: ${createdTime.toLocaleString()} (${minutesAgo} minutes ago)`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      
      if (session.line_items?.data?.length > 0) {
        console.log(`   Items: ${session.line_items.data.map(item => item.description).join(', ')}`);
      }
      
      if (session.metadata) {
        console.log(`   Pass ID: ${session.metadata.passId || 'MISSING'}`);
        console.log(`   User ID: ${session.metadata.userId || 'MISSING'}`);
        console.log(`   Type: ${session.metadata.type || 'MISSING'}`);
      }
    });
    
    // Find the most recent completed pass purchase
    const recentPassPurchase = sessions.data.find(session => 
      session.status === 'complete' && 
      session.metadata?.type === 'pass_purchase'
    );
    
    if (recentPassPurchase) {
      console.log('\n🎯 MOST RECENT PASS PURCHASE FOUND:');
      console.log('='.repeat(40));
      console.log(`Session: ${recentPassPurchase.id}`);
      console.log(`Pass: ${recentPassPurchase.line_items?.data?.[0]?.description || 'Unknown'}`);
      console.log(`Amount: ${recentPassPurchase.amount_total / 100} ${recentPassPurchase.currency?.toUpperCase()}`);
      console.log(`Time: ${new Date(recentPassPurchase.created * 1000).toLocaleString()}`);
      console.log(`Pass ID: ${recentPassPurchase.metadata?.passId}`);
      
      return recentPassPurchase;
    } else {
      console.log('\n❌ No recent pass purchases found in the last hour');
      console.log('The purchase might be older or still processing');
    }
    
  } catch (error) {
    console.error('❌ Error searching for purchases:', error);
  }
}

findLatestPurchase();
