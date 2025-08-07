import { client } from './src/lib/sanity.ts';

async function checkTenant() {
  try {
    const tenant = await client.fetch(`*[_type == "tenant" && _id == "DgqhBYe1Mm6KcUArJjcYot"][0]{
      _id,
      schoolName,
      "slug": slug.current,
      status
    }`);
    
    console.log('Tenant data:', JSON.stringify(tenant, null, 2));
    
    // Also check all tenants
    const allTenants = await client.fetch(`*[_type == "tenant"]{
      _id,
      schoolName,
      "slug": slug.current,
      status
    }`);
    
    console.log('\nAll tenants:', JSON.stringify(allTenants, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTenant();
