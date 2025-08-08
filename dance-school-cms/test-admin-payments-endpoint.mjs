import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testAdminPaymentsEndpoint() {
  console.log('🧪 Testing Admin Payments API Endpoint...\n');

  try {
    // Test the actual API endpoint
    const response = await fetch('http://localhost:3000/api/admin/payments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need proper authentication headers
        // For now, this will test the basic structure
      },
    });

    console.log(`📡 Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response received successfully');
      console.log(`📊 Found ${data.payments?.length || 0} payments`);
      console.log(`💰 Monthly Revenue: ${data.monthlyRevenue || 0} NOK`);
      console.log(`💰 Total Revenue: ${data.totalRevenue || 0} NOK`);
      console.log(`📈 Data Source: ${data.source || 'unknown'}`);
      
      if (data.payments && data.payments.length > 0) {
        console.log('\n📋 Sample payment:');
        const sample = data.payments[0];
        console.log(`   Customer: ${sample.customerName}`);
        console.log(`   Email: ${sample.customerEmail}`);
        console.log(`   Pass: ${sample.passName}`);
        console.log(`   Amount: ${sample.amount} ${sample.currency}`);
        console.log(`   Status: ${sample.status}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ API Error: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
    console.log('\n💡 Make sure your development server is running on localhost:3000');
    console.log('   Run: npm run dev');
  }
}

// Run the test
testAdminPaymentsEndpoint();
