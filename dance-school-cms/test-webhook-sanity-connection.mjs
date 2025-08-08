#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

console.log('🔍 TESTING WEBHOOK SANITY CONNECTION');
console.log('='.repeat(50));

// Test the exact same Sanity client configuration as the webhook
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function testWebhookSanityConnection() {
  try {
    console.log('1. Testing environment variables...');
    console.log(`   SANITY_PROJECT_ID: ${process.env.SANITY_PROJECT_ID ? '✅ SET' : '❌ MISSING'}`);
    console.log(`   SANITY_DATASET: ${process.env.SANITY_DATASET ? '✅ SET' : '❌ MISSING'}`);
    console.log(`   SANITY_API_TOKEN: ${process.env.SANITY_API_TOKEN ? '✅ SET' : '❌ MISSING'}`);
    
    console.log('\n2. Testing pass lookup (same as webhook)...');
    const passId = '7Csmu86aV4MF06f2xe9x4d'; // The pass from recent purchase
    
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && _id == $passId && isActive == true][0]`,
      { passId }
    );
    
    console.log(`   Looking for pass ID: ${passId}`);
    console.log(`   Pass found: ${pass ? '✅ YES' : '❌ NO'}`);
    
    if (pass) {
      console.log(`   Pass name: "${pass.name}"`);
      console.log(`   Pass type: "${pass.type}"`);
      console.log(`   Pass price: ${pass.price}`);
      console.log(`   Validity days: ${pass.validityDays}`);
    } else {
      console.log('   ❌ This explains why webhook uses fallback name!');
      
      // Try without the isActive filter
      console.log('\n3. Trying without isActive filter...');
      const passWithoutFilter = await sanityClient.fetch(
        `*[_type == "pass" && _id == $passId][0]`,
        { passId }
      );
      
      if (passWithoutFilter) {
        console.log(`   ✅ Pass found without isActive filter!`);
        console.log(`   Pass name: "${passWithoutFilter.name}"`);
        console.log(`   isActive: ${passWithoutFilter.isActive}`);
        console.log('   🚨 The pass exists but isActive might be false!');
      } else {
        console.log('   ❌ Pass not found even without filter');
      }
    }
    
    console.log('\n4. Testing write permissions...');
    try {
      // Test if we can read subscriptions
      const testSub = await sanityClient.fetch(`*[_type == "subscription"][0]`);
      console.log(`   Read subscriptions: ${testSub ? '✅ SUCCESS' : '❌ NO DATA'}`);
      
      // Test write permissions by trying to patch a subscription
      console.log('   Testing write permissions...');
      const result = await writeClient.fetch(`*[_type == "subscription"][0]._id`);
      if (result) {
        console.log('   Write client connection: ✅ SUCCESS');
      }
    } catch (error) {
      console.log(`   Write permissions: ❌ ERROR - ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook Sanity connection:', error);
  }
}

testWebhookSanityConnection();
