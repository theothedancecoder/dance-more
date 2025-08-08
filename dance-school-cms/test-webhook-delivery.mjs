#!/usr/bin/env node
import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 TESTING WEBHOOK DELIVERY STATUS');
console.log('='.repeat(50));

async function testWebhookDelivery() {
  try {
    console.log('1. Checking recent webhook events...');
    
    // Get recent webhook events
    const events = await stripe.events.list({
      type: 'checkout.session.completed',
      limit: 10
    });
    
    console.log(`Found ${events.data.length} recent checkout.session.completed events:`);
    
    events.data.forEach((event, i) => {
      const session = event.data.object;
      const createdTime = new Date(event.created * 1000);
      const minutesAgo = Math.round((Date.now() - createdTime.getTime()) / (1000 * 60));
      
      console.log(`\n${i + 1}. Event: ${event.id}`);
      console.log(`   Session: ${session.id}`);
      console.log(`   Created: ${createdTime.toLocaleString()} (${minutesAgo} minutes ago)`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      console.log(`   Request ID: ${event.request?.id || 'N/A'}`);
      console.log(`   Pending Webhooks: ${event.pending_webhooks}`);
      
      if (session.metadata) {
        console.log(`   Pass ID: ${session.metadata.passId || 'MISSING'}`);
        console.log(`   User ID: ${session.metadata.userId || 'MISSING'}`);
      }
    });
    
    console.log('\n2. Checking webhook endpoints configuration...');
    
    // Get webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list();
    
    console.log(`Found ${webhookEndpoints.data.length} webhook endpoints:`);
    
    webhookEndpoints.data.forEach((endpoint, i) => {
      console.log(`\n${i + 1}. Endpoint: ${endpoint.url}`);
      console.log(`   Status: ${endpoint.status}`);
      console.log(`   Events: ${endpoint.enabled_events.join(', ')}`);
      console.log(`   Created: ${new Date(endpoint.created * 1000).toLocaleDateString()}`);
    });
    
    console.log('\n3. Checking for webhook delivery attempts...');
    
    // Check if there are any recent events that should have triggered webhooks
    const recentSession = events.data[0];
    if (recentSession) {
      console.log(`\nMost recent session: ${recentSession.data.object.id}`);
      console.log(`Pending webhooks: ${recentSession.pending_webhooks}`);
      
      if (recentSession.pending_webhooks > 0) {
        console.log('🚨 There are pending webhook deliveries!');
        console.log('This suggests Stripe is trying to deliver webhooks but they are failing.');
      } else {
        console.log('✅ No pending webhooks (either delivered successfully or not configured)');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking webhook delivery:', error);
  }
}

testWebhookDelivery();
