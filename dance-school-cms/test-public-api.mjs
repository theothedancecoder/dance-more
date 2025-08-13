#!/usr/bin/env node

/**
 * Test script for Public API endpoints
 * Tests all the newly created public tenant API endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

console.log('🧪 Testing Public API Endpoints');
console.log('================================');
console.log(`Base URL: ${API_BASE}`);
console.log('');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testEndpoint(name, url, expectedStatus = 200, validateResponse = null) {
  try {
    console.log(`\n📡 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const status = response.status;
    
    console.log(`   Status: ${status}`);
    
    if (status !== expectedStatus) {
      logTest(name, false, `Expected status ${expectedStatus}, got ${status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (validateResponse) {
      const validation = validateResponse(data);
      if (!validation.valid) {
        logTest(name, false, validation.error);
        return null;
      }
    }
    
    logTest(name, true, `Response received with ${Object.keys(data).length} properties`);
    return data;
    
  } catch (error) {
    logTest(name, false, `Network error: ${error.message}`);
    return null;
  }
}

function validateTenantListResponse(data) {
  if (!data.tenants || !Array.isArray(data.tenants)) {
    return { valid: false, error: 'Missing or invalid tenants array' };
  }
  
  if (!data.pagination) {
    return { valid: false, error: 'Missing pagination object' };
  }
  
  const requiredPaginationFields = ['total', 'limit', 'offset', 'hasMore'];
  for (const field of requiredPaginationFields) {
    if (!(field in data.pagination)) {
      return { valid: false, error: `Missing pagination field: ${field}` };
    }
  }
  
  return { valid: true };
}

function validateTenantResponse(data) {
  const requiredFields = ['_id', 'schoolName', 'slug', 'status'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  if (data.slug && !data.slug.current) {
    return { valid: false, error: 'Slug object missing current property' };
  }
  
  return { valid: true };
}

function validateSearchResponse(data) {
  if (!data.tenants || !Array.isArray(data.tenants)) {
    return { valid: false, error: 'Missing or invalid tenants array' };
  }
  
  if (!data.pagination) {
    return { valid: false, error: 'Missing pagination object' };
  }
  
  return { valid: true };
}

async function runTests() {
  console.log('Starting API tests...\n');
  
  // Test 1: Get all tenants (default parameters)
  const allTenants = await testEndpoint(
    'Get All Tenants (Default)',
    `${API_BASE}/tenants/public`,
    200,
    validateTenantListResponse
  );
  
  // Test 2: Get all tenants with custom parameters
  await testEndpoint(
    'Get All Tenants (Custom Params)',
    `${API_BASE}/tenants/public?limit=5&offset=0&sortBy=schoolName&sortOrder=asc`,
    200,
    validateTenantListResponse
  );
  
  // Test 3: Get all tenants with invalid limit (should be capped)
  await testEndpoint(
    'Get All Tenants (Invalid Limit)',
    `${API_BASE}/tenants/public?limit=100`,
    200,
    (data) => {
      const validation = validateTenantListResponse(data);
      if (!validation.valid) return validation;
      
      if (data.pagination.limit > 50) {
        return { valid: false, error: 'Limit should be capped at 50' };
      }
      
      return { valid: true };
    }
  );
  
  // Test 4: Search tenants (without query - should work)
  await testEndpoint(
    'Search Tenants (No Query)',
    `${API_BASE}/tenants/public/search`,
    200,
    validateSearchResponse
  );
  
  // Test 5: Search tenants with query
  await testEndpoint(
    'Search Tenants (With Query)',
    `${API_BASE}/tenants/public/search?q=dance&limit=10`,
    200,
    validateSearchResponse
  );
  
  // Test 6: Search tenants with empty query
  await testEndpoint(
    'Search Tenants (Empty Query)',
    `${API_BASE}/tenants/public/search?q=`,
    200,
    validateSearchResponse
  );
  
  // Test 7: Get specific tenant (if we have tenant data)
  if (allTenants && allTenants.tenants && allTenants.tenants.length > 0) {
    const firstTenant = allTenants.tenants[0];
    const tenantSlug = firstTenant.slug?.current;
    
    if (tenantSlug) {
      await testEndpoint(
        'Get Specific Tenant',
        `${API_BASE}/tenants/${tenantSlug}/public`,
        200,
        validateTenantResponse
      );
    } else {
      logTest('Get Specific Tenant', false, 'No valid tenant slug found');
    }
  } else {
    logTest('Get Specific Tenant', false, 'No tenants available for testing');
  }
  
  // Test 8: Get non-existent tenant
  await testEndpoint(
    'Get Non-existent Tenant',
    `${API_BASE}/tenants/non-existent-tenant/public`,
    404
  );
  
  // Test 9: Test invalid endpoint
  await testEndpoint(
    'Invalid Endpoint',
    `${API_BASE}/tenants/invalid-endpoint`,
    404
  );
  
  // Test 10: Test pagination with offset
  await testEndpoint(
    'Pagination with Offset',
    `${API_BASE}/tenants/public?limit=1&offset=0`,
    200,
    (data) => {
      const validation = validateTenantListResponse(data);
      if (!validation.valid) return validation;
      
      if (data.pagination.limit !== 1) {
        return { valid: false, error: 'Limit not respected' };
      }
      
      if (data.pagination.offset !== 0) {
        return { valid: false, error: 'Offset not respected' };
      }
      
      return { valid: true };
    }
  );
}

async function printSummary() {
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.details}`);
      });
  }
  
  console.log('\n🎯 Recommendations:');
  if (testResults.failed === 0) {
    console.log('   • All tests passed! API is working correctly.');
    console.log('   • Consider adding rate limiting tests.');
    console.log('   • Consider adding performance tests.');
  } else {
    console.log('   • Fix failing endpoints before deploying to production.');
    console.log('   • Check server logs for detailed error information.');
    console.log('   • Verify database connectivity and data integrity.');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('   • Test the API with real client applications');
  console.log('   • Set up monitoring and alerting for production');
  console.log('   • Document any additional endpoints as they are created');
  console.log('   • Consider implementing API versioning for future changes');
}

// Run the tests
runTests()
  .then(printSummary)
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
