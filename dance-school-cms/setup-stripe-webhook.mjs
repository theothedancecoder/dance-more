#!/usr/bin/env node
import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔧 SETTING UP STRIPE WEBHOOK ENDPOINT');
console.log('='.repeat(50));

async function setupWebhookEndpoint() {
  try {
    // First, check if webhook endpoint already exists
    console.log('1. Checking existing webhook endpoints...');
    const existingEndpoints = await stripe.webhookEndpoints.list();
    
    console.log(`Found ${existingEndpoints.data.length} existing endpoints:`);
    existingEndpoints.data.forEach((endpoint, i) => {
      console.log(`   ${i + 1}. ${endpoint.url} (${endpoint.status})`);
    });
    
    // Define the webhook URL - this needs to be your actual domain
    // For development, you might need to use ngrok or similar
    const webhookUrl = 'https://your-domain.com/api/stripe/webhook'; // UPDATE THIS!
    
    console.log('\n2. Creating new webhook endpoint...');
    console.log(`   URL: ${webhookUrl}`);
    
    // Check if this URL already exists
    const existingEndpoint = existingEndpoints.data.find(ep => ep.url === webhookUrl);
    
    if (existingEndpoint) {
      console.log('✅ Webhook endpoint already exists!');
      console.log(`   ID: ${existingEndpoint.id}`);
      console.log(`   Status: ${existingEndpoint.status}`);
      console.log(`   Events: ${existingEndpoint.enabled_events.join(', ')}`);
      return;
    }
    
    // Create the webhook endpoint
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'invoice.payment_succeeded'
      ],
      description: 'Dance School CMS - Pass purchases and bookings'
    });
    
    console.log('\n🎉 SUCCESS! Webhook endpoint created:');
    console.log(`   ID: ${webhookEndpoint.id}`);
    console.log(`   URL: ${webhookEndpoint.url}`);
    console.log(`   Status: ${webhookEndpoint.status}`);
    console.log(`   Secret: ${webhookEndpoint.secret}`);
    console.log(`   Events: ${webhookEndpoint.enabled_events.join(', ')}`);
    
    console.log('\n🔑 IMPORTANT: Update your .env.local file with the webhook secret:');
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Update the webhookUrl variable in this script with your actual domain');
    console.log('2. Add the webhook secret to your .env.local file');
    console.log('3. Deploy your application to make the webhook endpoint accessible');
    console.log('4. Test a purchase to verify the webhook is working');
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error);
    
    if (error.message?.includes('url')) {
      console.log('\n💡 TIP: The webhook URL must be publicly accessible.');
      console.log('For local development, consider using:');
      console.log('- ngrok: https://ngrok.com/');
      console.log('- Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    }
  }
}

// Show current webhook secret for reference
console.log('Current webhook secret in .env.local:');
console.log(process.env.STRIPE_WEBHOOK_SECRET ? '✅ SET' : '❌ MISSING');

setupWebhookEndpoint();
