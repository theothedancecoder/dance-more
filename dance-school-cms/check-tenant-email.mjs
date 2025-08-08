import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function checkTenantEmails() {
  console.log('🔍 Checking tenant contact emails...\n');

  try {
    const tenants = await sanityClient.fetch(`
      *[_type == "tenant"] {
        _id,
        schoolName,
        slug,
        contactEmail,
        ownerId,
        status
      }
    `);

    console.log(`Found ${tenants.length} tenants:\n`);

    for (const tenant of tenants) {
      console.log(`📍 ${tenant.schoolName} (${tenant.slug?.current || 'no-slug'})`);
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Owner ID: ${tenant.ownerId || 'Not set'}`);
      console.log(`   Contact Email: ${tenant.contactEmail || '❌ NOT SET'}`);
      console.log('');
    }

    // Check if any tenants are missing contact emails
    const missingEmails = tenants.filter(t => !t.contactEmail);
    if (missingEmails.length > 0) {
      console.log(`⚠️  ${missingEmails.length} tenant(s) missing contact email:`);
      missingEmails.forEach(t => {
        console.log(`   - ${t.schoolName} (${t._id})`);
      });
    } else {
      console.log('✅ All tenants have contact emails set');
    }

  } catch (error) {
    console.error('❌ Error checking tenant emails:', error);
  }
}

checkTenantEmails().catch(console.error);
