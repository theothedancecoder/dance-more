#!/usr/bin/env node

/**
 * Production Tenant Diagnostic Script
 * Tests the production tenant API and mobile responsiveness issues
 */

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://www.dancemore.app';
const TENANT_SLUG = 'dancecity';

console.log('🔍 Production Tenant Diagnostic Script');
console.log('=====================================');
console.log(`Testing tenant: ${TENANT_SLUG}`);
console.log(`Production URL: ${PRODUCTION_URL}`);
console.log('');

async function testTenantAPI() {
  console.log('📡 Testing Tenant API...');
  
  try {
    const apiUrl = `${PRODUCTION_URL}/api/tenants/${TENANT_SLUG}/public`;
    console.log(`Fetching: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TenantDiagnostic/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Tenant API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Check for logo
      if (data.logo && data.logo.asset && data.logo.asset.url) {
        console.log(`\n🖼️  Logo URL found: ${data.logo.asset.url}`);
        
        // Test logo accessibility
        try {
          const logoResponse = await fetch(data.logo.asset.url, { method: 'HEAD' });
          console.log(`Logo accessibility: ${logoResponse.status} ${logoResponse.statusText}`);
        } catch (logoError) {
          console.log(`❌ Logo fetch error: ${logoError.message}`);
        }
      } else {
        console.log('⚠️  No logo found in tenant data');
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.log(`❌ API Error: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return null;
  }
}

async function testCalendarPage() {
  console.log('\n📅 Testing Calendar Page...');
  
  try {
    const calendarUrl = `${PRODUCTION_URL}/${TENANT_SLUG}/calendar`;
    console.log(`Fetching: ${calendarUrl}`);
    
    const response = await fetch(calendarUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for viewport meta tag
      const hasViewport = html.includes('viewport') || html.includes('device-width');
      console.log(`📱 Viewport meta tag: ${hasViewport ? '✅ Found' : '❌ Missing'}`);
      
      // Check for responsive classes
      const hasResponsiveClasses = html.includes('sm:') || html.includes('md:') || html.includes('lg:');
      console.log(`📐 Responsive classes: ${hasResponsiveClasses ? '✅ Found' : '❌ Missing'}`);
      
      // Check for tenant data in HTML
      const hasTenantData = html.includes(TENANT_SLUG) || html.includes('tenant');
      console.log(`🏢 Tenant data in HTML: ${hasTenantData ? '✅ Found' : '❌ Missing'}`);
      
      // Check for loading states
      const hasLoadingStates = html.includes('loading') || html.includes('spinner');
      console.log(`⏳ Loading states: ${hasLoadingStates ? '✅ Found' : '❌ Missing'}`);
      
      return true;
    } else {
      console.log(`❌ Calendar page error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Calendar page network error: ${error.message}`);
    return false;
  }
}

async function testMobileUserAgent() {
  console.log('\n📱 Testing Mobile User Agent Response...');
  
  try {
    const calendarUrl = `${PRODUCTION_URL}/${TENANT_SLUG}/calendar`;
    
    // Test with mobile user agent
    const mobileResponse = await fetch(calendarUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Test with desktop user agent
    const desktopResponse = await fetch(calendarUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log(`Mobile response: ${mobileResponse.status} ${mobileResponse.statusText}`);
    console.log(`Desktop response: ${desktopResponse.status} ${desktopResponse.statusText}`);
    
    if (mobileResponse.ok && desktopResponse.ok) {
      const mobileHtml = await mobileResponse.text();
      const desktopHtml = await desktopResponse.text();
      
      const mobileSame = mobileHtml === desktopHtml;
      console.log(`📊 Mobile/Desktop content identical: ${mobileSame ? '✅ Yes' : '⚠️  No (this is normal)'}`);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Mobile user agent test error: ${error.message}`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('Starting production diagnostics...\n');
  
  const tenantData = await testTenantAPI();
  const calendarWorking = await testCalendarPage();
  const mobileWorking = await testMobileUserAgent();
  
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('====================');
  console.log(`Tenant API: ${tenantData ? '✅ Working' : '❌ Failed'}`);
  console.log(`Calendar Page: ${calendarWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`Mobile Response: ${mobileWorking ? '✅ Working' : '❌ Failed'}`);
  
  if (tenantData && tenantData.logo) {
    console.log(`Logo URL: ${tenantData.logo.asset?.url || 'Not found'}`);
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  if (!tenantData) {
    console.log('- Check Sanity database for dancecity tenant');
    console.log('- Verify API route is working correctly');
  }
  if (!calendarWorking) {
    console.log('- Check calendar page routing');
    console.log('- Verify tenant context is loading');
  }
  if (!mobileWorking) {
    console.log('- Check mobile responsiveness');
    console.log('- Verify viewport meta tag is present');
  }
  
  console.log('\n✨ Next steps:');
  console.log('1. Deploy the viewport meta tag fix');
  console.log('2. Test the production URL again');
  console.log('3. Check browser developer tools for any console errors');
  console.log('4. Test on actual mobile devices');
}

// Run the diagnostics
runDiagnostics().catch(console.error);
