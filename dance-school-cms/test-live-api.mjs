import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Testing LIVE API after deployment\n');

const testUsers = [
  'jayson.ang12@gmail.com',
  'miiamer88@gmail.com'
];

async function testLiveAPI() {
  try {
    // Test both API endpoints that the frontend uses
    const endpoints = [
      'https://dancemore.app/api/subscriptions',
      'https://dancemore.app/api/user/subscriptions'
    ];
    
    console.log('🌐 Testing live API endpoints after deployment\n');

    for (const apiUrl of endpoints) {
      console.log(`\n🔍 Testing: ${apiUrl}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-slug': 'dancecity'
          }
        });

        console.log('📊 Status:', response.status);
        
        if (response.status === 401) {
          console.log('✅ API responding correctly (401 Unauthorized without auth)');
          console.log('✅ Deployment successful for this endpoint');
        } else {
          console.log('⚠️ Unexpected response status');
          const text = await response.text();
          console.log('📄 Response:', text.substring(0, 200));
        }
      } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
      }
    }

    console.log('\n🔍 DEPLOYMENT CHECK SUMMARY:');
    console.log('If both endpoints return 401, the deployment worked.');
    console.log('If passes still not showing, there might be:');
    console.log('1. Browser caching - tell users to hard refresh (Ctrl+F5)');
    console.log('2. CDN caching - may take a few minutes to propagate');
    console.log('3. Another API endpoint we missed');

  } catch (error) {
    console.error('❌ Error testing live API:', error.message);
    console.log('💡 This might indicate deployment issues or network problems');
  }
}

testLiveAPI();
