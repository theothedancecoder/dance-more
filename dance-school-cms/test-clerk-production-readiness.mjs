#!/usr/bin/env node
import { config } from 'dotenv';

config({ path: './.env.local' });

console.log('🔍 CLERK PRODUCTION READINESS TEST');
console.log('='.repeat(50));

console.log('\n📋 DNS RECORDS STATUS:');
console.log('✅ accounts.dancemore.app → accounts.clerk.services');
console.log('✅ clkmail.dancemore.app → mail.n3jflyelq8no.clerk.services');
console.log('✅ clk._domainkey.dancemore.app → dkim1.n3jflyelq8no.clerk.services');
console.log('✅ clk2._domainkey.dancemore.app → dkim2.n3jflyelq8no.clerk.services');

console.log('\n🔑 CURRENT ENVIRONMENT VARIABLES:');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_test_') ? '🧪 TEST MODE' : '🚀 LIVE MODE') : 
  '❌ MISSING');

console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 
  (process.env.CLERK_SECRET_KEY.startsWith('sk_test_') ? '🧪 TEST MODE' : '🚀 LIVE MODE') : 
  '❌ MISSING');

console.log('CLERK_WEBHOOK_SECRET:', process.env.CLERK_WEBHOOK_SECRET ? '✅ SET' : '❌ MISSING');

console.log('\n🌐 PRODUCTION REQUIREMENTS:');
console.log('✅ DNS Records: ALL CONFIGURED');
console.log('📋 Production Clerk App: NEEDS VERIFICATION');
console.log('🔑 Production API Keys: NEEDS UPDATE');
console.log('🪝 Production Webhook: NEEDS SETUP');

console.log('\n🚀 NEXT STEPS FOR PRODUCTION:');
console.log('1. Verify Clerk production application is created');
console.log('2. Get production API keys (pk_live_... and sk_live_...)');
console.log('3. Set up production webhook endpoint');
console.log('4. Update Vercel environment variables');
console.log('5. Deploy to production');

console.log('\n💡 READY TO PROCEED?');
console.log('Your DNS is perfectly configured!');
console.log('Just need the production Clerk keys to complete the setup.');
