import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function testUserManagementAPI() {
  try {
    console.log('🔍 Testing User Management API...');
    
    // First, let's see what users exist in Sanity
    const allUsers = await client.fetch(`*[_type == "user"]{
      _id,
      name,
      email,
      role,
      isActive,
      tenant,
      _createdAt
    }`);
    
    console.log('\n📊 All users in Sanity:');
    console.log(JSON.stringify(allUsers, null, 2));
    
    // Check the tenant
    const tenant = await client.fetch(`*[_type == "tenant" && slug.current == "dance-with-dancecity"][0]{ _id, schoolName }`);
    console.log('\n🏢 Tenant info:');
    console.log(JSON.stringify(tenant, null, 2));
    
    if (tenant) {
      // Check users for this specific tenant (using the fixed query)
      const tenantUsers = await client.fetch(`*[_type == "user" && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        name,
        email,
        role,
        isActive,
        _createdAt,
        "firstName": name,
        "lastName": "",
        "createdAt": _createdAt
      }`, { tenantId: tenant._id });
      
      console.log('\n👥 Users for tenant "dance-with-dancecity":');
      console.log(JSON.stringify(tenantUsers, null, 2));
      
      if (tenantUsers.length === 0) {
        console.log('\n❌ No users found for this tenant!');
        console.log('💡 This explains why the User Management page shows 0 users.');
        
        // Let's check if users exist but don't have tenant references
        const usersWithoutTenant = await client.fetch(`*[_type == "user" && !defined(tenant)]{
          _id,
          name,
          email,
          role
        }`);
        
        console.log('\n🔍 Users without tenant reference:');
        console.log(JSON.stringify(usersWithoutTenant, null, 2));
        
        if (usersWithoutTenant.length > 0) {
          console.log('\n💡 Found users without tenant references! These need to be linked to the tenant.');
        }
      }
    } else {
      console.log('\n❌ Tenant "dance-with-dancecity" not found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUserManagementAPI();
