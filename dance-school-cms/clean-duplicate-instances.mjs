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

console.log('🧹 Cleaning up duplicate class instances...');

async function cleanDuplicateInstances() {
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
    
    // Get all class instances for this tenant
    const instances = await client.fetch(
      `*[_type == "classInstance" && parentClass->tenant._ref == $tenantId] {
        _id,
        date,
        startTime,
        endTime,
        "parentClassId": parentClass._ref,
        "parentClassTitle": parentClass->title
      } | order(date asc, startTime asc)`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📊 Found ${instances.length} total instances`);
    
    // Group instances by unique combination of date, time, and class
    const instanceGroups = new Map();
    
    instances.forEach(instance => {
      const key = `${instance.parentClassId}-${instance.date}-${instance.startTime}-${instance.endTime}`;
      
      if (!instanceGroups.has(key)) {
        instanceGroups.set(key, []);
      }
      instanceGroups.get(key).push(instance);
    });
    
    console.log(`\n🔍 Found ${instanceGroups.size} unique time slots`);
    
    // Find duplicates
    let duplicatesFound = 0;
    let instancesToDelete = [];
    
    instanceGroups.forEach((group, key) => {
      if (group.length > 1) {
        duplicatesFound++;
        console.log(`\n🔄 Duplicate found for ${group[0].parentClassTitle}:`);
        console.log(`   Date: ${group[0].date}`);
        console.log(`   Time: ${group[0].startTime} - ${group[0].endTime}`);
        console.log(`   Duplicates: ${group.length}`);
        
        // Keep the first instance, mark others for deletion
        const [keep, ...toDelete] = group;
        console.log(`   Keeping: ${keep._id}`);
        toDelete.forEach(instance => {
          console.log(`   Deleting: ${instance._id}`);
          instancesToDelete.push(instance._id);
        });
      }
    });
    
    if (duplicatesFound === 0) {
      console.log('\n✅ No duplicates found!');
      return;
    }
    
    console.log(`\n📋 Summary:`);
    console.log(`   Duplicate groups: ${duplicatesFound}`);
    console.log(`   Instances to delete: ${instancesToDelete.length}`);
    
    // Delete duplicates in batches
    if (instancesToDelete.length > 0) {
      console.log('\n🗑️ Deleting duplicate instances...');
      
      const batchSize = 10;
      for (let i = 0; i < instancesToDelete.length; i += batchSize) {
        const batch = instancesToDelete.slice(i, i + batchSize);
        
        const transaction = client.transaction();
        batch.forEach(id => {
          transaction.delete(id);
        });
        
        await transaction.commit();
        console.log(`   Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(instancesToDelete.length/batchSize)}`);
      }
      
      console.log(`\n✅ Successfully deleted ${instancesToDelete.length} duplicate instances!`);
    }
    
    // Final count
    const finalInstances = await client.fetch(
      `count(*[_type == "classInstance" && parentClass->tenant._ref == $tenantId])`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n🎯 Final result: ${finalInstances} instances remaining`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanDuplicateInstances();
