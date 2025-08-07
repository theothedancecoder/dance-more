#!/usr/bin/env node

import 'dotenv/config';
import { sanityClient, writeClient } from './src/lib/sanity.ts';

console.log('🔍 Testing Sanity permissions...');
console.log('Token exists:', !!process.env.SANITY_API_TOKEN);
console.log('Token length:', process.env.SANITY_API_TOKEN?.length || 0);

try {
  // Test read operation
  console.log('📖 Testing read operation...');
  const tenant = await sanityClient.fetch('*[_type == "tenant"][0]');
  console.log('✅ Read successful, found tenant:', tenant?.schoolName || 'No tenant found');
  
  // Test write operation
  console.log('📝 Testing write operation...');
  const testDoc = {
    _type: 'subscription',
    type: 'test',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    isActive: false,
    user: { _type: 'reference', _ref: 'test-user' },
    tenant: { _type: 'reference', _ref: tenant?._id || 'test-tenant' }
  };
  
  const result = await writeClient.create(testDoc);
  console.log('✅ Write successful! Created:', result._id);
  
  // Clean up
  console.log('🧹 Cleaning up...');
  await writeClient.delete(result._id);
  console.log('✅ Cleanup successful');
  
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('✅ Your Sanity permissions are working correctly');
  console.log('💡 The issue might be elsewhere - let\'s check the webhook');
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  
  if (error.message.includes('permission') || error.message.includes('Insufficient')) {
    console.error('\n🔧 PERMISSION ISSUE DETECTED:');
    console.error('1. Go to https://sanity.io/manage');
    console.error('2. Navigate to your project → API → Tokens');
    console.error('3. Find your token and ensure it has "Editor" permissions');
    console.error('4. If it\'s already "Editor", try creating a new token');
    console.error('5. Update SANITY_API_TOKEN in .env.local');
    console.error('6. Restart your dev server');
  } else {
    console.error('🤔 Unexpected error:', error);
  }
}
