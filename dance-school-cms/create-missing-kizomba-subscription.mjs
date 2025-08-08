#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

console.log('🎫 CREATING MISSING KIZOMBA SUBSCRIPTION');
console.log('='.repeat(50));

async function createMissingKizombaSubscription() {
  try {
    // Create subscription for the missing kizomba purchase
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: 'user_30wjws3MyPB9ddGIVJDiAW5TPfv',
      },
      tenant: {
        _type: 'reference',
        _ref: 'DgqhBYe1Mm6KcUArJjcYot',
      },
      type: 'single',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day validity
      remainingClips: 1,
      passId: 'inmkwmPK08EKZKQ7v2hnJj', // kizomba drop in pass ID
      passName: 'kizomba drop in',
      purchasePrice: 250,
      stripeSessionId: 'manual-kizomba-' + Date.now(),
      isActive: true,
    };

    console.log('1. Creating subscription with data:');
    console.log(`   Pass: ${subscriptionData.passName}`);
    console.log(`   Price: ${subscriptionData.purchasePrice} NOK`);
    console.log(`   Valid until: ${new Date(subscriptionData.endDate).toLocaleDateString()}`);
    
    const createdSubscription = await writeClient.create(subscriptionData);
    
    console.log('\n🎉 SUCCESS! Created missing kizomba subscription:');
    console.log(`   ID: ${createdSubscription._id}`);
    console.log(`   Pass: ${subscriptionData.passName}`);
    console.log(`   Valid until: ${new Date(subscriptionData.endDate).toLocaleDateString()}`);
    console.log(`   Remaining clips: ${subscriptionData.remainingClips}`);
    
    console.log('\n🔄 Now refresh your subscriptions page to see the new pass!');
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

createMissingKizombaSubscription();
