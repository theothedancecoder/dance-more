import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testTenantAPI() {
  try {
    console.log('🔍 Testing tenant API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/tenants/dancecity/public', {
      method: 'GET',
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const tenantData = await response.json();
    
    console.log('📊 API Response:');
    console.log(JSON.stringify(tenantData, null, 2));
    
    if (tenantData?.logo?.asset?.url) {
      console.log('✅ Logo found in API response:', tenantData.logo.asset.url);
    } else {
      console.log('❌ No logo found in API response');
      console.log('Logo field:', tenantData.logo);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testTenantAPI();
