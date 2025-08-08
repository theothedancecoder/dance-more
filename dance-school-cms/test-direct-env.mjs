#!/usr/bin/env node
import { config } from 'dotenv';

console.log('🔍 TESTING DIRECT .env.local LOADING');
console.log('='.repeat(50));

// Load .env.local directly
const result = config({ path: './.env.local' });

console.log('\n📋 DOTENV RESULT:');
if (result.error) {
  console.log('❌ Error loading .env.local:', result.error.message);
} else {
  console.log('✅ .env.local loaded successfully');
  console.log('📊 Parsed variables:', Object.keys(result.parsed || {}).length);
}

console.log('\n🔍 CHECKING SPECIFIC VARIABLES:');
const testVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET', 
  'SANITY_PROJECT_ID',
  'SANITY_DATASET',
  'SANITY_API_TOKEN',
  'CLERK_SECRET_KEY'
];

testVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const preview = exists ? `${value.substring(0, 10)}...` : 'MISSING';
  console.log(`${exists ? '✅' : '❌'} ${varName}: ${preview}`);
});

console.log('\n🔍 ALL LOADED VARIABLES:');
if (result.parsed) {
  Object.keys(result.parsed).forEach(key => {
    const value = result.parsed[key];
    const preview = value ? `${value.substring(0, 15)}...` : 'empty';
    console.log(`  ${key}: ${preview}`);
  });
} else {
  console.log('  No variables parsed from .env.local');
}
