#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

// Use the EXACT same configuration as the webhook
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

console.log('🔍 TESTING EXACT WEBHOOK SANITY CONFIGURATION');
console.log('='.repeat(50));

async function testWebhookSanityExact() {
  try {
    console.log('1. Configuration:');
    console.log(`   Project ID: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
    console.log(`   Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET}`);
    console.log(`   API Version: 2024-01-01`);
    console.log(`   Use CDN: ${process.env.NODE_ENV === 'production'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    
    console.log('\n2. Testing pass lookup with EXACT webhook query...');
    const passId = '7Csmu86aV4MF06f2xe9x4d';
    
    // This is the EXACT query from the webhook
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId && isActive == true][0]`,
      { passId }
    );
    
    console.log(`   Pass ID: ${passId}`);
    console.log(`   Pass found: ${pass ? '✅ YES' : '❌ NO'}`);
    
    if (pass) {
      console.log(`   Pass name: "${pass.name}"`);
      console.log(`   Pass type: "${pass.type}"`);
      console.log(`   Pass price: ${pass.price}`);
      console.log(`   Validity days: ${pass.validityDays}`);
      console.log(`   Is active: ${pass.isActive}`);
    } else {
      console.log('   ❌ Pass not found with webhook configuration!');
      
      // Try with different API version
      console.log('\n3. Trying with 2023-05-03 API version...');
      const sanityClientOld = createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
        apiVersion: '2023-05-03',
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      });
      
      const passOld = await sanityClientOld.fetch(
        `*[_type == "pass" && _id == $passId && isActive == true][0]`,
        { passId }
      );
      
      if (passOld) {
        console.log('   ✅ Pass found with 2023-05-03 API version!');
        console.log('   🚨 API version mismatch is the issue!');
      }
    }
    
    console.log('\n4. Testing subscription creation simulation...');
    
    if (pass) {
      // Simulate the subscription data that would be created
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
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        remainingClips: 1,
        passId: pass._id,
        passName: pass.name,
        purchasePrice: 1290,
        stripeSessionId: 'test-session-id',
        isActive: true,
      };
      
      console.log('   Subscription data that would be created:');
      console.log(`   Pass Name: "${subscriptionData.passName}"`);
      console.log(`   Pass ID: "${subscriptionData.passId}"`);
      console.log('   ✅ This should work correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook Sanity configuration:', error);
  }
}

testWebhookSanityExact();
