#!/usr/bin/env node
import { config } from 'dotenv';

// Load environment variables
config({ path: './.env.local' });

console.log('🔍 WEBHOOK REQUIREMENTS CHECK');
console.log('='.repeat(50));

const requiredVars = {
  'STRIPE_SECRET_KEY': 'Required for Stripe API calls',
  'STRIPE_WEBHOOK_SECRET': 'Required for webhook signature verification',
  'SANITY_PROJECT_ID': 'Required for Sanity database connection',
  'SANITY_DATASET': 'Required for Sanity database connection',
  'SANITY_API_TOKEN': 'Required for creating subscriptions (MUST have Editor permissions)',
  'CLERK_SECRET_KEY': 'Required for user authentication'
};

console.log('\n📋 ENVIRONMENT VARIABLES STATUS:');
let missingCount = 0;
let hasIssues = false;

for (const [varName, description] of Object.entries(requiredVars)) {
  const exists = !!process.env[varName];
  const status = exists ? '✅' : '❌';
  const value = exists ? 'SET' : 'MISSING';
  
  console.log(`${status} ${varName}: ${value}`);
  console.log(`   ${description}`);
  
  if (!exists) {
    missingCount++;
    hasIssues = true;
  }
  
  // Check for common issues
  if (exists) {
    if (varName === 'SANITY_API_TOKEN' && !process.env[varName].startsWith('sk')) {
      console.log(`   ⚠️  WARNING: Token should start with 'sk' (Editor token)`);
      hasIssues = true;
    }
    if (varName === 'STRIPE_WEBHOOK_SECRET' && !process.env[varName].startsWith('whsec_')) {
      console.log(`   ⚠️  WARNING: Should start with 'whsec_'`);
      hasIssues = true;
    }
  }
  console.log('');
}

console.log('📊 SUMMARY:');
console.log(`Missing variables: ${missingCount}`);
console.log(`Status: ${hasIssues ? '❌ ISSUES FOUND' : '✅ ALL GOOD'}`);

if (hasIssues) {
  console.log('\n🚨 CRITICAL ISSUES DETECTED!');
  console.log('This explains why subscriptions are not being created.');
  console.log('\n🔧 IMMEDIATE ACTIONS NEEDED:');
  
  if (missingCount > 0) {
    console.log('1. Add missing environment variables to .env.local');
  }
  
  if (!process.env.SANITY_API_TOKEN) {
    console.log('2. Create Sanity API token with Editor permissions');
    console.log('   - Go to https://sanity.io/manage');
    console.log('   - Select your project → API → Tokens');
    console.log('   - Create new token with "Editor" permissions');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('3. Get Stripe webhook secret from dashboard');
    console.log('   - Go to Stripe Dashboard → Webhooks');
    console.log('   - Find your webhook → Reveal signing secret');
    console.log('   - Copy the whsec_... value');
  }
  
  console.log('\n4. Restart your development server after fixing');
  console.log('5. Test a purchase to verify the fix');
  
} else {
  console.log('\n✅ Environment looks good!');
  console.log('If subscriptions still fail, check server logs during purchase.');
}

console.log('\n💡 NEXT STEPS:');
console.log('1. Fix any missing/incorrect environment variables');
console.log('2. Run: npm run dev (restart server)');
console.log('3. Test a purchase and check server logs');
console.log('4. Run: node fix-missing-subscription.mjs (to catch past failures)');
