// Test script to verify tenant signup flow
const fetch = require('node-fetch');

async function testTenantSignupFlow() {
  console.log('🧪 Testing Tenant Signup Flow...\n');

  const baseUrl = 'http://localhost:3001';
  const tenantSlug = 'dance-with-dancecity'; // Replace with your actual tenant slug

  // Test 1: Check if tenant exists
  console.log('1. Testing tenant existence...');
  try {
    const response = await fetch(`${baseUrl}/api/tenants/${tenantSlug}/public`);
    
    if (response.ok) {
      const tenantData = await response.json();
      console.log('✅ Tenant found:', tenantData.tenant.schoolName);
    } else {
      console.log('❌ Tenant not found or inactive');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking tenant:', error.message);
    return;
  }

  // Test 2: Check if public passes API works
  console.log('\n2. Testing public passes API...');
  try {
    const response = await fetch(`${baseUrl}/api/passes/public`, {
      headers: {
        'x-tenant-slug': tenantSlug,
      },
    });

    if (response.ok) {
      const passesData = await response.json();
      console.log('✅ Passes API working, found', passesData.passes.length, 'passes');
      
      if (passesData.passes.length === 0) {
        console.log('⚠️  No passes found. You need to create passes through the admin dashboard first.');
        console.log(`   Visit: ${baseUrl}/${tenantSlug}/admin/passes`);
      } else {
        console.log('   Available passes:');
        passesData.passes.forEach(pass => {
          console.log(`   - ${pass.name}: ${pass.price} kr (${pass.type})`);
        });
      }
    } else {
      console.log('❌ Passes API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing passes API:', error.message);
  }

  // Test 3: Check if Stripe checkout API exists
  console.log('\n3. Testing Stripe checkout API...');
  try {
    const response = await fetch(`${baseUrl}/api/stripe/checkout-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passId: 'test-pass-id',
        successUrl: `${baseUrl}/${tenantSlug}/payment/success`,
        cancelUrl: `${baseUrl}/${tenantSlug}/subscriptions`,
      }),
    });

    // We expect this to fail with 401 (unauthorized) since we're not signed in
    if (response.status === 401) {
      console.log('✅ Stripe checkout API exists and requires authentication');
    } else {
      console.log('⚠️  Unexpected response from Stripe API:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing Stripe API:', error.message);
  }

  console.log('\n🎉 Test completed!');
  console.log('\n📋 Next steps:');
  console.log(`1. Visit: ${baseUrl}/${tenantSlug}/subscriptions`);
  console.log('2. Click "Sign In to Purchase" (should go to tenant-specific sign-in)');
  console.log('3. Sign up/in and you should stay in the tenant context');
  console.log('4. Purchase a pass and then try booking classes');
  console.log('\n💡 If no passes are available, create them at:');
  console.log(`   ${baseUrl}/${tenantSlug}/admin/passes`);
}

// Run the test
testTenantSignupFlow().catch(console.error);
