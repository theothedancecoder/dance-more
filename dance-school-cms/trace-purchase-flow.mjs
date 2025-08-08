#!/usr/bin/env node

console.log('🔍 TRACING PURCHASE FLOW - ROOT CAUSE ANALYSIS');
console.log('='.repeat(60));

console.log('\n📋 PURCHASE FLOW ANALYSIS:');
console.log('1. Customer clicks "Purchase" on subscriptions page');
console.log('2. Frontend calls /api/stripe/checkout-pass with passId');
console.log('3. Checkout endpoint fetches pass data from Sanity');
console.log('4. Creates Stripe session with metadata:');
console.log('   - passId: from database');
console.log('   - passName: from passData.name');
console.log('   - userId: from auth');
console.log('   - tenantId: from pass.tenant._id');
console.log('5. Customer completes payment on Stripe');
console.log('6. Stripe webhook fires with session data');
console.log('7. Webhook should create subscription in Sanity');
console.log('8. Customer should see subscription in "Active Passes"');

console.log('\n🚨 POTENTIAL FAILURE POINTS:');
console.log('A. Pass data fetch fails (wrong passId)');
console.log('B. Stripe session creation fails');
console.log('C. Webhook not receiving events');
console.log('D. Webhook fails to create subscription');
console.log('E. Subscription created with wrong data');
console.log('F. Frontend fails to fetch subscriptions');
console.log('G. Pass name lookup fails in display');

console.log('\n🔧 IMMEDIATE DEBUGGING STEPS:');
console.log('1. Check recent Stripe webhook logs');
console.log('2. Check if subscriptions exist in database');
console.log('3. Verify pass names are stored correctly');
console.log('4. Test the subscription fetch API');

console.log('\n💡 HYPOTHESIS:');
console.log('Based on the symptoms (missing subscriptions + wrong pass names),');
console.log('the most likely issues are:');
console.log('- Webhook is not firing or failing silently');
console.log('- Pass name is not being stored during subscription creation');
console.log('- User/tenant relationships are broken');

console.log('\n🎯 NEXT STEPS:');
console.log('1. Check server logs for webhook activity');
console.log('2. Manually verify recent purchases in Stripe dashboard');
console.log('3. Check Sanity database for recent subscriptions');
console.log('4. Test the subscription sync mechanism');

console.log('\n✅ Run these commands to investigate:');
console.log('cd dance-school-cms && npm run dev');
console.log('# Check server logs for webhook activity');
console.log('# Try purchasing a test pass');
console.log('# Check if subscription appears in database');
