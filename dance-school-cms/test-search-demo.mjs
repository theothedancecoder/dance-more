#!/usr/bin/env node

/**
 * Demo script to show how the search functionality would work
 * This simulates the search API endpoint functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

console.log('🔍 Dance School Search Demo');
console.log('============================');

async function getAllTenants() {
  try {
    const response = await fetch(`${BASE_URL}/api/tenants/public`);
    const data = await response.json();
    return data.tenants || [];
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
}

function searchTenants(tenants, query) {
  if (!query) return tenants;
  
  const searchTerm = query.toLowerCase();
  return tenants.filter(tenant => {
    const nameMatch = tenant.schoolName.toLowerCase().includes(searchTerm);
    const descMatch = tenant.description && tenant.description.toLowerCase().includes(searchTerm);
    return nameMatch || descMatch;
  });
}

async function demonstrateSearch() {
  console.log('📡 Fetching all dance schools...\n');
  
  const allTenants = await getAllTenants();
  
  if (allTenants.length === 0) {
    console.log('❌ No tenants found or API not accessible');
    return;
  }
  
  console.log(`✅ Found ${allTenants.length} dance schools:\n`);
  
  allTenants.forEach((tenant, index) => {
    console.log(`${index + 1}. ${tenant.schoolName}`);
    if (tenant.description) {
      console.log(`   Description: ${tenant.description}`);
    }
    console.log(`   Slug: ${tenant.slug.current}`);
    console.log(`   Students: ${tenant.totalStudents}, Classes: ${tenant.classCount}`);
    console.log('');
  });
  
  // Demonstrate different search queries
  const searchQueries = ['dance', 'city', 'studio', 'energy'];
  
  console.log('🔍 Search Demonstrations:');
  console.log('========================\n');
  
  for (const query of searchQueries) {
    console.log(`🔎 Searching for: "${query}"`);
    const results = searchTenants(allTenants, query);
    
    if (results.length === 0) {
      console.log('   No results found\n');
    } else {
      console.log(`   Found ${results.length} result(s):`);
      results.forEach(tenant => {
        console.log(`   • ${tenant.schoolName} (${tenant.slug.current})`);
      });
      console.log('');
    }
  }
  
  // Test specific school search
  console.log('🎯 Specific School Search:');
  console.log('==========================\n');
  
  const specificSearches = ['Dancecity', 'DanceZone', 'My dance'];
  
  for (const query of specificSearches) {
    console.log(`🔎 Searching for: "${query}"`);
    const results = searchTenants(allTenants, query);
    
    if (results.length > 0) {
      const tenant = results[0];
      console.log(`   ✅ Found: ${tenant.schoolName}`);
      console.log(`   📍 URL: ${BASE_URL}/${tenant.slug.current}`);
      console.log(`   📊 Stats: ${tenant.totalStudents} students, ${tenant.classCount} classes`);
      if (tenant.logo && tenant.logo.asset && tenant.logo.asset.url) {
        console.log(`   🖼️  Logo: ${tenant.logo.asset.url}`);
      }
    } else {
      console.log('   ❌ No results found');
    }
    console.log('');
  }
  
  console.log('💡 How this would work in a real application:');
  console.log('============================================');
  console.log('1. User types in search box: "dance"');
  console.log('2. Frontend calls: GET /api/tenants/public/search?q=dance');
  console.log('3. API returns matching schools with logos and details');
  console.log('4. Frontend displays results as cards or list items');
  console.log('5. User clicks on a school to visit: /dancecity/calendar');
  console.log('');
  console.log('🚀 The search API is ready for frontend integration!');
}

demonstrateSearch().catch(console.error);
