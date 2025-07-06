// Test script to simulate the registration flow and debug the issue
const fetch = require('node-fetch');

async function testRegistration() {
  console.log('🧪 Testing tenant registration flow...');
  
  try {
    // Test the registration API endpoint
    const response = await fetch('http://localhost:3000/api/tenants/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real scenario, this would include Clerk auth headers
      },
      body: JSON.stringify({
        schoolName: 'Test Dance Studio',
        email: 'test@example.com',
        description: 'A test dance studio for debugging'
      })
    });

    const result = await response.json();
    console.log('📊 Registration API Response:', {
      status: response.status,
      success: result.success,
      error: result.error,
      tenant: result.tenant,
      urls: result.urls
    });

    if (result.success && result.urls) {
      console.log('✅ Registration successful, testing admin access...');
      
      // Test accessing the admin URL
      const adminResponse = await fetch(`http://localhost:3000${result.urls.pathBased}`);
      console.log('🔐 Admin access test:', {
        status: adminResponse.status,
        redirected: adminResponse.redirected,
        finalUrl: adminResponse.url
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRegistration();
