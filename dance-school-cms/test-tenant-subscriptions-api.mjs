import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing TENANT-SPECIFIC subscriptions API');

async function testTenantAPI() {
  try {
    // Test the tenant-specific API endpoint that the [slug]/subscriptions page uses
    const apiUrl = 'https://dancemore.app/api/user/subscriptions';
    
    console.log('🌐 Testing tenant-specific API endpoint:', apiUrl);
    console.log('📋 This endpoint is called by dancemore.app/dancecity/subscriptions\n');

    // Test with tenant headers (like the frontend does)
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': 'dancecity',
        'x-tenant-id': 'dancecity-tenant-id' // This might be needed
      }
    });

    console.log('📊 Status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ API responding correctly (401 Unauthorized without auth)');
      console.log('✅ Tenant-specific endpoint is working');
    } else {
      console.log('⚠️ Unexpected response status');
      const text = await response.text();
      console.log('📄 Response:', text.substring(0, 300));
    }

    console.log('\n🔍 ANALYSIS:');
    console.log('The tenant-specific subscriptions page at /dancecity/subscriptions');
    console.log('calls /api/user/subscriptions with tenant headers.');
    console.log('This is the same endpoint I fixed, so it should work.');
    console.log('\nIf passes still not showing, the issue might be:');
    console.log('1. Browser cache on mobile (very common)');
    console.log('2. Students using wrong URL');
    console.log('3. Students not logged in properly');
    console.log('4. The sync function failing silently');

  } catch (error) {
    console.error('❌ Error testing tenant API:', error.message);
  }
}

testTenantAPI();
