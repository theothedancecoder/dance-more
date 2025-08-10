import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔄 Creating missing instances...');

async function createMissingInstances() {
  try {
    // Get Dancecity tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0]`
    );
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant.schoolName);
    
    // Get the classes that are missing instances
    const contemporaryDance = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && title == "Contemporary Dance"][0]`,
      { tenantId: tenant._id }
    );
    
    const bachataSensualLevel2 = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && title == "Bachata Sensual Level 2"][0]`,
      { tenantId: tenant._id }
    );
    
    console.log('Found Contemporary Dance class:', !!contemporaryDance);
    console.log('Found Bachata Sensual Level 2 class:', !!bachataSensualLevel2);
    
    const instancesToCreate = [];
    
    // Create Contemporary Dance instance for Tuesday Aug 12 at 17:00
    if (contemporaryDance) {
      const tuesdayDate = new Date('2025-08-12T17:00:00.000Z');
      instancesToCreate.push({
        _type: 'classInstance',
        parentClass: { _ref: contemporaryDance._id },
        date: tuesdayDate.toISOString(),
        isCancelled: false,
        remainingCapacity: contemporaryDance.capacity,
        bookings: []
      });
    }
    
    // Create Bachata Sensual Level 2 instance for Wednesday Aug 13 at 19:00
    if (bachataSensualLevel2) {
      const wednesdayDate = new Date('2025-08-13T19:00:00.000Z');
      instancesToCreate.push({
        _type: 'classInstance',
        parentClass: { _ref: bachataSensualLevel2._id },
        date: wednesdayDate.toISOString(),
        isCancelled: false,
        remainingCapacity: bachataSensualLevel2.capacity,
        bookings: []
      });
    }
    
    console.log(`\n🔄 Creating ${instancesToCreate.length} missing instances...`);
    
    for (const instance of instancesToCreate) {
      try {
        const result = await client.create(instance);
        console.log(`✅ Created instance: ${result._id}`);
      } catch (error) {
        console.log(`❌ Error creating instance:`, error.message);
      }
    }
    
    console.log('\n✅ Done creating missing instances!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createMissingInstances();
