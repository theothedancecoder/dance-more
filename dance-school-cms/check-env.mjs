#!/usr/bin/env node

import 'dotenv/config';

console.log('Environment variables check:');
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
console.log('SANITY_API_TOKEN exists:', !!process.env.SANITY_API_TOKEN);
console.log('CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);

console.log('\nAll environment variables:');
Object.keys(process.env)
  .filter(key => key.includes('STRIPE') || key.includes('SANITY') || key.includes('CLERK'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  });
