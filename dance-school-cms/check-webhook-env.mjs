#!/usr/bin/env node
import { config } from 'dotenv';

config({ path: './.env.local' });

console.log('🔍 CHECKING WEBHOOK ENVIRONMENT VARIABLES');
console.log('='.repeat(50));
console.log('Variables the webhook actually uses:');
console.log('NEXT_PUBLIC_SANITY_PROJECT_ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? '✅ SET' : '❌ MISSING');
console.log('NEXT_PUBLIC_SANITY_DATASET:', process.env.NEXT_PUBLIC_SANITY_DATASET ? '✅ SET' : '❌ MISSING');
console.log('SANITY_API_TOKEN:', process.env.SANITY_API_TOKEN ? '✅ SET' : '❌ MISSING');
console.log('');
console.log('Values:');
console.log('NEXT_PUBLIC_SANITY_PROJECT_ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'UNDEFINED');
console.log('NEXT_PUBLIC_SANITY_DATASET:', process.env.NEXT_PUBLIC_SANITY_DATASET || 'UNDEFINED');
console.log('');
console.log('Variables our test scripts use:');
console.log('SANITY_PROJECT_ID:', process.env.SANITY_PROJECT_ID ? '✅ SET' : '❌ MISSING');
console.log('SANITY_DATASET:', process.env.SANITY_DATASET ? '✅ SET' : '❌ MISSING');

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.NEXT_PUBLIC_SANITY_DATASET) {
  console.log('\n🚨 CRITICAL ISSUE FOUND!');
  console.log('The webhook is trying to use NEXT_PUBLIC_ environment variables that are missing!');
  console.log('This explains why the webhook creates subscriptions with wrong data.');
  console.log('\n🔧 SOLUTION: Add these to your .env.local file:');
  console.log(`NEXT_PUBLIC_SANITY_PROJECT_ID=${process.env.SANITY_PROJECT_ID}`);
  console.log(`NEXT_PUBLIC_SANITY_DATASET=${process.env.SANITY_DATASET}`);
}
