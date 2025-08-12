import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function checkTenants() {
  try {
    console.log('🔍 Looking for all tenants...');
    
    const tenants = await client.fetch(`
      *[_type == "tenant"] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        status
      }
    `);
    
    console.log('🏢 All tenants:', tenants);
    
    // Also check for any tenant with "dance" in the name
    const danceTenants = await client.fetch(`
      *[_type == "tenant" && (schoolName match "*dance*" || subdomain.current match "*dance*")] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        status
      }
    `);
    
    console.log('💃 Dance-related tenants:', danceTenants);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTenants();
