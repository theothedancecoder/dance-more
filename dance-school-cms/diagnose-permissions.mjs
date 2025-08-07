#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly load the .env.local file
config({ path: join(__dirname, '.env.local') });

console.log('Environment check:');
console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
console.log('DATASET:', process.env.NEXT_PUBLIC_SANITY_DATASET);
console.log('TOKEN exists:', !!process.env.SANITY_API_TOKEN);

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔍 Diagnosing Sanity permissions issue...\n');

async function testPermissions() {
  try {
    // Test 1: Try creating a simple tenant document
    console.log('Test 1: Creating tenant document...');
    const tenantDoc = {
      _type: 'tenant',
      schoolName: 'Test School',
      slug: { current: 'test-school-' + Date.now() },
      status: 'active',
      ownerId: 'test-owner',
      contactEmail: 'test@example.com'
    };

    const tenantResult = await writeClient.create(tenantDoc);
    console.log('✅ Tenant creation successful:', tenantResult._id);
    await writeClient.delete(tenantResult._id);
    console.log('✅ Tenant cleanup successful\n');

    // Test 2: Try creating a pass document
    console.log('Test 2: Creating pass document...');
    const passDoc = {
      _type: 'pass',
      name: 'Test Pass',
      type: 'single',
      price: 100,
      isActive: true
    };

    const passResult = await writeClient.create(passDoc);
    console.log('✅ Pass creation successful:', passResult._id);
    await writeClient.delete(passResult._id);
    console.log('✅ Pass cleanup successful\n');

    // Test 3: Try creating a subscription document (the problematic one)
    console.log('Test 3: Creating subscription document...');
    const subscriptionDoc = {
      _type: 'subscription',
      type: 'single',
      passName: 'Test Pass',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      remainingClips: 1,
      isActive: true,
      stripePaymentId: 'test_payment_' + Date.now(),
      purchasePrice: 250
    };

    const subResult = await writeClient.create(subscriptionDoc);
    console.log('✅ Subscription creation successful:', subResult._id);
    await writeClient.delete(subResult._id);
    console.log('✅ Subscription cleanup successful\n');

    console.log('🎉 ALL TESTS PASSED! The token has proper permissions.');
    console.log('💡 The issue might be with the specific document structure or references.');

  } catch (error) {
    console.error('❌ Permission test failed:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('\n🔧 PERMISSION ISSUES DETECTED:');
      console.log('1. The token does not have "create" permissions');
      console.log('2. Check if the token is assigned to the correct role');
      console.log('3. Verify the role has "create" permissions for all document types');
      console.log('4. Try creating a new token with "Administrator" permissions');
    } else if (error.message.includes('schema')) {
      console.log('\n📋 SCHEMA ISSUES DETECTED:');
      console.log('1. The document type might not exist in your schema');
      console.log('2. Required fields might be missing');
      console.log('3. Field validation might be failing');
    } else {
      console.log('\n🤔 UNKNOWN ERROR:');
      console.log('Full error:', error);
    }
  }
}

testPermissions();
