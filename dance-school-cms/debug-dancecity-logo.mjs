import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

async function debugDanceCityLogo() {
  try {
    console.log('🔍 Fetching DanceCity tenant data...');
    
    const tenant = await client.fetch(`
      *[_type == "tenant" && slug.current == "dancecity"][0]{
        _id,
        schoolName,
        slug,
        logo {
          asset-> {
            _id,
            url,
            originalFilename,
            size,
            mimeType
          }
        }
      }
    `);
    
    console.log('📊 DanceCity tenant data:');
    console.log(JSON.stringify(tenant, null, 2));
    
    if (tenant?.logo?.asset?.url) {
      console.log('✅ Logo found:', tenant.logo.asset.url);
    } else {
      console.log('❌ No logo found or logo structure is different');
      
      // Let's check the raw logo field
      const rawTenant = await client.fetch(`
        *[_type == "tenant" && slug.current == "dancecity"][0]{
          _id,
          schoolName,
          slug,
          logo
        }
      `);
      
      console.log('🔍 Raw logo field:');
      console.log(JSON.stringify(rawTenant.logo, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDanceCityLogo();
