/**
 * Comprehensive Tenant Isolation Testing Script
 * Tests multi-tenant data isolation, permissions, and session management
 */

const puppeteer = require('puppeteer');

class TenantIsolationTester {
  constructor() {
    this.browser = null;
    this.baseUrl = 'http://localhost:3000';
    this.testResults = [];
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false, 
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.testResults.push(logEntry);
  }

  async createNewPage() {
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    return page;
  }

  async testPlatformHomepage() {
    this.log('🏠 Testing Platform Homepage Access');
    const page = await this.createNewPage();
    
    try {
      await page.goto(this.baseUrl);
      await page.waitForSelector('h1', { timeout: 10000 });
      
      const title = await page.$eval('h1', el => el.textContent);
      if (title.includes('DANCE-MORE SCHOOL MANAGEMENT SYSTEM')) {
        this.log('✅ Platform homepage loads correctly with proper branding');
      } else {
        this.log('❌ Platform homepage title incorrect', 'error');
      }

      // Check for platform features
      const features = await page.$$eval('.grid .bg-white', els => 
        els.map(el => el.textContent)
      );
      
      if (features.some(f => f.includes('Custom Branding'))) {
        this.log('✅ Platform features displayed correctly');
      } else {
        this.log('❌ Platform features not found', 'error');
      }

    } catch (error) {
      this.log(`❌ Platform homepage test failed: ${error.message}`, 'error');
    } finally {
      await page.close();
    }
  }

  async testTenantAccess(tenantSlug) {
    this.log(`🏫 Testing Tenant Access: ${tenantSlug}`);
    const page = await this.createNewPage();
    
    try {
      const tenantUrl = `${this.baseUrl}/${tenantSlug}`;
      await page.goto(tenantUrl);
      
      // Wait for either tenant content or error page
      await page.waitForSelector('h1, .text-2xl', { timeout: 10000 });
      
      const pageContent = await page.content();
      
      if (pageContent.includes('School Not Found') || pageContent.includes('404')) {
        this.log(`⚠️  Tenant ${tenantSlug} not found - this is expected for non-existent tenants`);
        return { exists: false, accessible: false };
      }
      
      // Check if tenant-specific content loads
      const heading = await page.$eval('h1', el => el.textContent);
      if (heading.includes(tenantSlug) || heading.includes('Welcome to')) {
        this.log(`✅ Tenant ${tenantSlug} loads with proper branding`);
        return { exists: true, accessible: true };
      }
      
    } catch (error) {
      this.log(`❌ Tenant access test failed for ${tenantSlug}: ${error.message}`, 'error');
      return { exists: false, accessible: false, error: error.message };
    } finally {
      await page.close();
    }
  }

  async testExistingTenant() {
    this.log('🧪 Testing Existing Tenant (test-school)');
    return await this.testTenantAccess('test-school');
  }

  async testNonExistentTenant() {
    this.log('🚫 Testing Non-Existent Tenant Access');
    return await this.testTenantAccess('non-existent-school');
  }

  async testCrossTenantAccess() {
    this.log('🔒 Testing Cross-Tenant Access Protection');
    const page = await this.createNewPage();
    
    try {
      // Test accessing admin routes without proper authentication
      const adminUrls = [
        `${this.baseUrl}/test-school/admin`,
        `${this.baseUrl}/fake-school/admin`,
      ];

      for (const url of adminUrls) {
        await page.goto(url);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        if (currentUrl.includes('/sign-in') || pageContent.includes('Sign In')) {
          this.log(`✅ Admin route ${url} properly redirects to authentication`);
        } else if (pageContent.includes('unauthorized') || pageContent.includes('404')) {
          this.log(`✅ Admin route ${url} properly blocks unauthorized access`);
        } else {
          this.log(`❌ Admin route ${url} may have security issue`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`❌ Cross-tenant access test failed: ${error.message}`, 'error');
    } finally {
      await page.close();
    }
  }

  async testAPIEndpointSecurity() {
    this.log('🔐 Testing API Endpoint Security');
    const page = await this.createNewPage();
    
    try {
      // Test API endpoints without authentication
      const apiEndpoints = [
        `${this.baseUrl}/api/admin/classes`,
        `${this.baseUrl}/api/admin/passes`,
        `${this.baseUrl}/api/tenants/test-school`,
      ];

      for (const endpoint of apiEndpoints) {
        const response = await page.goto(endpoint);
        const status = response.status();
        
        if (status === 401 || status === 403 || status === 404) {
          this.log(`✅ API endpoint ${endpoint} properly secured (${status})`);
        } else if (status === 200) {
          const content = await page.content();
          if (content.includes('error') || content.includes('unauthorized')) {
            this.log(`✅ API endpoint ${endpoint} returns error for unauthorized access`);
          } else {
            this.log(`❌ API endpoint ${endpoint} may be exposing data (${status})`, 'error');
          }
        } else {
          this.log(`⚠️  API endpoint ${endpoint} returned unexpected status: ${status}`);
        }
      }
      
    } catch (error) {
      this.log(`❌ API security test failed: ${error.message}`, 'error');
    } finally {
      await page.close();
    }
  }

  async testMiddlewareProtection() {
    this.log('🛡️  Testing Middleware Protection');
    const page = await this.createNewPage();
    
    try {
      // Test protected routes
      const protectedRoutes = [
        `${this.baseUrl}/dashboard`,
        `${this.baseUrl}/my-classes`,
        `${this.baseUrl}/payment`,
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        if (currentUrl.includes('/sign-in') || pageContent.includes('Sign In')) {
          this.log(`✅ Protected route ${route} properly redirects to authentication`);
        } else if (pageContent.includes('register-school')) {
          this.log(`✅ Protected route ${route} redirects to school registration`);
        } else {
          this.log(`❌ Protected route ${route} may not be properly protected`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`❌ Middleware protection test failed: ${error.message}`, 'error');
    } finally {
      await page.close();
    }
  }

  async testSessionIsolation() {
    this.log('🔄 Testing Session Isolation');
    
    // Create two separate browser contexts to simulate different users
    const context1 = await this.browser.createIncognitoBrowserContext();
    const context2 = await this.browser.createIncognitoBrowserContext();
    
    try {
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Navigate to different tenants in each context
      await page1.goto(`${this.baseUrl}/test-school`);
      await page2.goto(`${this.baseUrl}/another-school`);
      
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);
      
      // Check that sessions are isolated
      const page1Content = await page1.content();
      const page2Content = await page2.content();
      
      if (page1Content !== page2Content) {
        this.log('✅ Sessions appear to be isolated between different contexts');
      } else {
        this.log('⚠️  Session isolation test inconclusive');
      }
      
      await page1.close();
      await page2.close();
      
    } catch (error) {
      this.log(`❌ Session isolation test failed: ${error.message}`, 'error');
    } finally {
      await context1.close();
      await context2.close();
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Tenant Isolation Testing');
    
    try {
      await this.init();
      
      // Run all test scenarios
      await this.testPlatformHomepage();
      await this.testExistingTenant();
      await this.testNonExistentTenant();
      await this.testCrossTenantAccess();
      await this.testAPIEndpointSecurity();
      await this.testMiddlewareProtection();
      await this.testSessionIsolation();
      
      this.log('✅ All tests completed');
      
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
    }
    
    // Generate test report
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TENANT ISOLATION TEST REPORT');
    console.log('='.repeat(80));
    
    const errors = this.testResults.filter(r => r.includes('[ERROR]'));
    const warnings = this.testResults.filter(r => r.includes('⚠️'));
    const successes = this.testResults.filter(r => r.includes('✅'));
    
    console.log(`✅ Successful Tests: ${successes.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      errors.forEach(error => console.log(error));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(warning));
    }
    
    console.log('\n📋 FULL TEST LOG:');
    this.testResults.forEach(result => console.log(result));
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run the tests
async function runTests() {
  const tester = new TenantIsolationTester();
  await tester.runAllTests();
}

// Export for use as module or run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = TenantIsolationTester;
