#!/usr/bin/env node
import 'dotenv/config';

console.log('🔍 TESTING ENVIRONMENT VARIABLE LOADING');
console.log('='.repeat(50));

const testVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET', 
  'SANITY_PROJECT_ID',
  'SANITY_DATASET',
  'SANITY_API_TOKEN',
  'CLERK_SECRET_KEY'
];

console.log('\n📋 DIRECT ENVIRONMENT CHECK:');
testVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const preview = exists ? `${value.substring(0, 10)}...` : 'MISSING';
  console.log(`${exists ? '✅' : '❌'} ${varName}: ${preview}`);
});

console.log('\n🔍 ALL ENVIRONMENT KEYS CONTAINING TARGET WORDS:');
const allKeys = Object.keys(process.env);
const relevantKeys = allKeys.filter(key => 
  key.includes('STRIPE') || 
  key.includes('SANITY') || 
  key.includes('CLERK') ||
  key.includes('NEXT_PUBLIC')
);

if (relevantKeys.length > 0) {
  relevantKeys.forEach(key => {
    const value = process.env[key];
    const preview = value ? `${value.substring(0, 15)}...` : 'empty';
    console.log(`  ${key}: ${preview}`);
  });
} else {
  console.log('  No relevant environment variables found');
}

console.log('\n💡 DIAGNOSIS:');
if (relevantKeys.length === 0) {
  console.log('❌ No environment variables are loading at all');
  console.log('🔧 Check if .env.local file format is correct');
  console.log('🔧 Ensure no spaces around = signs');
  console.log('🔧 Ensure no quotes around values unless needed');
} else if (testVars.every(v => !process.env[v])) {
  console.log('⚠️  Some env vars loading but not the required ones');
  console.log('🔧 Check variable names match exactly');
} else {
  console.log('✅ Environment variables are loading correctly');
}
