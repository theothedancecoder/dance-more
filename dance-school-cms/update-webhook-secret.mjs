#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 UPDATING WEBHOOK SECRET');
console.log('='.repeat(40));

try {
  // Read current .env.local
  const envPath = './.env.local';
  let envContent = readFileSync(envPath, 'utf8');
  
  console.log('Current webhook secret in .env.local:');
  const currentMatch = envContent.match(/STRIPE_WEBHOOK_SECRET=([^\n\r]+)/);
  if (currentMatch) {
    console.log(`OLD: ${currentMatch[1]}`);
  }
  
  // New webhook secret from Stripe CLI
  const newSecret = 'whsec_be5009abec829f121ec346c51800a2871e9bfe70ea8f2fa967f2279cff1bb4f9';
  console.log(`NEW: ${newSecret}`);
  
  // Replace the webhook secret
  if (currentMatch) {
    envContent = envContent.replace(
      /STRIPE_WEBHOOK_SECRET=([^\n\r]+)/,
      `STRIPE_WEBHOOK_SECRET=${newSecret}`
    );
  } else {
    // Add if not exists
    envContent += `\nSTRIPE_WEBHOOK_SECRET=${newSecret}\n`;
  }
  
  // Write back to file
  writeFileSync(envPath, envContent);
  
  console.log('\n✅ SUCCESS! Updated .env.local with new webhook secret');
  console.log('🔄 Please restart your Next.js dev server for changes to take effect');
  console.log('   npm run dev');
  
} catch (error) {
  console.error('❌ Error updating webhook secret:', error.message);
}
