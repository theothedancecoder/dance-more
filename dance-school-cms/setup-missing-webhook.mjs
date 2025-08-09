import { config } from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupWebhook() {
  console.log('🔧 Setting up missing webhook endpoint...\n');

  const webhookUrl = 'https://www.dancemore.app/api/stripe/webhook';
  
  try {
    // Check if webhook already exists
    const existingEndpoints = await stripe.webhookEndpoints.list();
    const existingWebhook = existingEndpoints.data.find(endpoint => 
      endpoint.url === webhookUrl
    );

    if (existingWebhook) {
      console.log('✅ Webhook endpoint already exists:', existingWebhook.id);
      console.log('   URL:', existingWebhook.url);
      console.log('   Status:', existingWebhook.status);
      console.log('   Events:', existingWebhook.enabled_events.length);
      return;
    }

    // Create new webhook endpoint
    console.log('🆕 Creating new webhook endpoint...');
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'invoice.payment_succeeded',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ],
      description: 'Dance More Platform - Handles payment confirmations and subscription creation'
    });

    console.log('🎉 SUCCESS! Webhook endpoint created:');
    console.log('   ID:', webhook.id);
    console.log('   URL:', webhook.url);
    console.log('   Status:', webhook.status);
    console.log('   Secret:', webhook.secret);
    console.log('');
    
    console.log('🔑 IMPORTANT: Add this to your .env.local file:');
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    console.log('');
    
    console.log('📝 Next steps:');
    console.log('1. Update your .env.local with the webhook secret above');
    console.log('2. Restart your development server');
    console.log('3. Test a purchase to verify webhook triggers');
    console.log('4. Run sync-all-missing-subscriptions.mjs to fix existing purchases');

  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    
    if (error.code === 'url_invalid') {
      console.log('💡 The webhook URL might not be accessible. Make sure:');
      console.log('   • Your app is deployed and accessible at https://www.dancemore.app');
      console.log('   • The /api/stripe/webhook endpoint is working');
      console.log('   • There are no firewall or network restrictions');
    }
  }
}

setupWebhook().catch(console.error);
