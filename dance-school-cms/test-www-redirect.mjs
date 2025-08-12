import fetch from 'node-fetch';

console.log('🔍 TESTING WWW vs NON-WWW WEBHOOK ENDPOINTS');

async function testBothUrls() {
  try {
    console.log('\n🌐 Testing www.dancemore.app...');
    
    const wwwResponse = await fetch('https://www.dancemore.app/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'www-test' })
    });

    console.log('📊 www.dancemore.app status:', wwwResponse.status);
    console.log('📊 www.dancemore.app redirected to:', wwwResponse.url);

    console.log('\n🌐 Testing dancemore.app...');
    
    const nonWwwResponse = await fetch('https://dancemore.app/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'non-www-test' })
    });

    console.log('📊 dancemore.app status:', nonWwwResponse.status);
    console.log('📊 dancemore.app response:', nonWwwResponse.status === 400 ? 'WORKING (expected 400)' : 'ISSUE');

    console.log('\n🎯 CONCLUSION:');
    if (wwwResponse.status === nonWwwResponse.status) {
      console.log('✅ Both URLs work the same - redirect is working');
      console.log('❌ Problem is elsewhere (webhook secret, events, etc.)');
    } else {
      console.log('❌ URL mismatch is the problem!');
      console.log('🔧 Fix: Update Stripe webhook URL to remove www.');
    }

  } catch (error) {
    console.error('❌ Error testing URLs:', error.message);
  }
}

testBothUrls();
