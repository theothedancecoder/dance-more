import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🧪 Testing API endpoint for Solomiya\n');

const CLERK_ID = 'user_2zYHmsOLHH3hj5cH93XnEfdYkVJ';
const TENANT_SLUG = 'dancecity';

async function testApiEndpoint() {
  try {
    // Test the user subscriptions API endpoint
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/subscriptions`;
    
    console.log('🔍 Testing API endpoint:');
    console.log(`   URL: ${apiUrl}`);
    console.log(`   Tenant: ${TENANT_SLUG}`);
    console.log(`   Expected Clerk ID: ${CLERK_ID}`);
    
    // Note: We can't actually authenticate as the user from this script,
    // but we can test if the endpoint is accessible and returns proper error messages
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': TENANT_SLUG,
        // Note: In a real frontend call, Clerk would provide the Authorization header
      }
    });
    
    console.log(`\n📡 API Response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`   Body: ${responseText}`);
    
    if (response.status === 401) {
      console.log('\n✅ Expected 401 Unauthorized - API is working correctly');
      console.log('   This confirms the API endpoint exists and requires authentication');
      console.log('   The issue is likely in the frontend authentication or API call');
    } else {
      console.log('\n🤔 Unexpected response - investigating further...');
    }
    
    // Test if the API is accessible at all
    const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`, {
      method: 'GET'
    }).catch(() => null);
    
    if (healthCheck) {
      console.log(`\n🏥 Health check: ${healthCheck.status} ${healthCheck.statusText}`);
    } else {
      console.log('\n❌ Server appears to be down or unreachable');
    }
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION: The development server is not running');
      console.log('   Please start the development server with: npm run dev');
      console.log('   Then Solomiya should be able to see her passes');
    }
  }
}

// Also provide instructions for Solomiya
console.log('📋 TROUBLESHOOTING STEPS FOR SOLOMIYA:');
console.log('');
console.log('1. 🔄 **Clear browser cache and cookies**');
console.log('   - Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)');
console.log('   - Clear all browsing data');
console.log('   - Restart browser');
console.log('');
console.log('2. 🔐 **Re-authenticate**');
console.log('   - Log out completely from the dance school website');
console.log('   - Log back in with your email: miiamer88@gmail.com');
console.log('');
console.log('3. 🌐 **Try different browser/incognito mode**');
console.log('   - Open an incognito/private window');
console.log('   - Go to the dance school website');
console.log('   - Log in and check if passes appear');
console.log('');
console.log('4. 📱 **Check on mobile device**');
console.log('   - Try accessing the website from your phone');
console.log('   - This helps identify if it\'s a browser-specific issue');
console.log('');
console.log('5. 🔍 **Check browser console for errors**');
console.log('   - Press F12 to open developer tools');
console.log('   - Go to Console tab');
console.log('   - Look for any red error messages');
console.log('   - Take a screenshot and share with support');
console.log('');

testApiEndpoint();
