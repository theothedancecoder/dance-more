#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🧪 WEBHOOK TESTING WITH REAL METADATA');
console.log('='.repeat(50));

async function testWebhookWithMetadata() {
  try {
    // Get a real tenant, pass, and user for testing
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant"][0] {
        _id,
        schoolName
      }
    `);

    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      return;
    }

    const pass = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId][0] {
        _id,
        name,
        type,
        price
      }
    `, { tenantId: tenant._id });

    if (!pass) {
      console.error('❌ No pass found for tenant. Please create a pass first.');
      return;
    }

    const user = await sanityClient.fetch(`
      *[_type == "user"][0] {
        _id,
        name,
        email
      }
    `);

    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      return;
    }

    console.log('✅ Found test data:');
    console.log('   Tenant:', tenant.schoolName, '(' + tenant._id + ')');
    console.log('   Pass:', pass.name, '(' + pass.type + ')');
    console.log('   User:', user.name, '(' + user._id + ')');

    console.log('\n🔧 TO TEST THE WEBHOOK WITH REAL DATA:');
    console.log('='.repeat(40));
    
    console.log('\n1. Make a real purchase through your app with these details:');
    console.log('   - User ID:', user._id);
    console.log('   - Pass ID:', pass._id);
    console.log('   - Tenant ID:', tenant._id);
    
    console.log('\n2. Or manually trigger a webhook with this curl command:');
    console.log('   (This simulates what Stripe would send)');
    
    const testPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_manual_' + Date.now(),
          object: 'checkout_session',
          status: 'complete',
          amount_total: pass.price * 100,
          currency: 'nok',
          customer_details: {
            name: user.name,
            email: user.email
          },
          customer_email: user.email,
          payment_intent: 'pi_test_' + Date.now(),
          created: Math.floor(Date.now() / 1000),
          metadata: {
            type: 'pass_purchase',
            passId: pass._id,
            userId: user._id,
            tenantId: tenant._id
          }
        }
      }
    };

    console.log('\n📋 Test payload metadata:');
    console.log('   type: pass_purchase');
    console.log('   passId:', pass._id);
    console.log('   userId:', user._id);
    console.log('   tenantId:', tenant._id);

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Keep your webhook listener running (stripe listen)');
    console.log('2. Keep your Next.js dev server running');
    console.log('3. Make a real purchase or use the webhook testing endpoint');
    console.log('4. Watch the logs for subscription creation');

    console.log('\n💡 PRODUCTION SETUP:');
    console.log('Once local testing works, update your production webhook:');
    console.log('1. Go to Stripe Dashboard > Webhooks');
    console.log('2. Update endpoint URL to: https://www.dancemore.app/api/stripe/webhook');
    console.log('3. Ensure STRIPE_WEBHOOK_SECRET_PROD is set in production');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWebhookWithMetadata();
