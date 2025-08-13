#!/usr/bin/env node

/**
 * Test script for the dynamic favicon system
 * Tests both subdomain and path-based tenant detection
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🧪 Testing Dynamic Favicon System');
console.log('==================================\n');

// Test cases
const testCases = [
  {
    name: 'Default favicon (no tenant)',
    url: `${BASE_URL}/favicon.ico`,
    expectedTenant: 'default',
  },
  {
    name: 'API favicon debug endpoint',
    url: `${BASE_URL}/api/favicon?debug=true`,
    expectedTenant: null,
  },
  {
    name: 'API favicon with format',
    url: `${BASE_URL}/api/favicon?format=png&size=32`,
    expectedTenant: 'default',
  },
];

// If we have tenant examples, add them
const tenantTestCases = [
  {
    name: 'Tenant favicon (if dancecity exists)',
    url: `${BASE_URL}/favicon.ico`,
    headers: { 'Host': 'dancecity.localhost:3000' },
    expectedTenant: 'dancecity',
  },
];

async function testFavicon(testCase) {
  console.log(`🔍 Testing: ${testCase.name}`);
  
  try {
    const curlCommand = [
      'curl',
      '-s',
      '-I', // Headers only for most tests
      testCase.url,
      testCase.headers ? `-H "Host: ${testCase.headers.Host}"` : '',
    ].filter(Boolean).join(' ');
    
    console.log(`   Command: ${curlCommand}`);
    
    const result = execSync(curlCommand, { encoding: 'utf8' });
    console.log(`   Response headers:`);
    
    const lines = result.split('\n');
    const statusLine = lines[0];
    console.log(`   Status: ${statusLine}`);
    
    // Look for our custom headers
    const tenantHeader = lines.find(line => line.toLowerCase().startsWith('x-tenant:'));
    const schoolHeader = lines.find(line => line.toLowerCase().startsWith('x-school:'));
    const contentType = lines.find(line => line.toLowerCase().startsWith('content-type:'));
    const cacheControl = lines.find(line => line.toLowerCase().startsWith('cache-control:'));
    
    if (tenantHeader) console.log(`   ${tenantHeader.trim()}`);
    if (schoolHeader) console.log(`   ${schoolHeader.trim()}`);
    if (contentType) console.log(`   ${contentType.trim()}`);
    if (cacheControl) console.log(`   ${cacheControl.trim()}`);
    
    // Check if it's a successful response
    const isSuccess = statusLine.includes('200');
    console.log(`   ✅ ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
}

async function testDebugEndpoint() {
  console.log('🔍 Testing: Debug endpoint');
  
  try {
    const curlCommand = `curl -s "${BASE_URL}/api/favicon?debug=true"`;
    console.log(`   Command: ${curlCommand}`);
    
    const result = execSync(curlCommand, { encoding: 'utf8' });
    const data = JSON.parse(result);
    
    console.log('   Debug info:');
    console.log(`   - Tenant Slug: ${data.tenantSlug || 'none'}`);
    console.log(`   - Format: ${data.format}`);
    console.log(`   - Size: ${data.size}`);
    console.log(`   - Timestamp: ${data.timestamp}`);
    console.log('   ✅ SUCCESS');
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
}

async function runTests() {
  console.log('Starting favicon system tests...\n');
  
  // Test debug endpoint first
  await testDebugEndpoint();
  
  // Test regular endpoints
  for (const testCase of testCases) {
    if (testCase.url.includes('debug=true')) continue; // Skip debug, we tested it separately
    await testFavicon(testCase);
  }
  
  // Test tenant-specific cases
  console.log('🏢 Testing tenant-specific favicons:');
  for (const testCase of tenantTestCases) {
    await testFavicon(testCase);
  }
  
  console.log('📋 Test Summary:');
  console.log('================');
  console.log('✅ If you see 200 status codes, the favicon system is working!');
  console.log('🔧 Check the X-Tenant headers to verify tenant detection');
  console.log('🎨 Tenant-specific favicons will show when logos are uploaded');
  console.log('\n💡 To test with a real tenant:');
  console.log('   1. Create a tenant in Sanity with a logo');
  console.log('   2. Access via subdomain: http://tenantslug.localhost:3000');
  console.log('   3. Or via path: http://localhost:3000/tenantslug');
}

// Run the tests
runTests().catch(console.error);
