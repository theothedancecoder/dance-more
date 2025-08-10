import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function debugGenerateInstances() {
  try {
    console.log('🔍 Debugging generate instances issue...');
    
    // Check if we can connect to Sanity
    console.log('📡 Testing Sanity connection...');
    const testQuery = await client.fetch('*[_type == "tenant"] | order(_createdAt desc) [0..2] { _id, schoolName }');
    console.log('✅ Sanity connection successful:', testQuery);
    
    // Find classes for Dancecity tenant
    console.log('\n🔍 Looking for Dancecity classes...');
    const dancecityTenant = await client.fetch(`*[_type == "tenant" && slug.current == "dancecity"][0]`);
    
    if (!dancecityTenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found Dancecity tenant:', dancecityTenant._id);
    
    // Find classes for this tenant
    const classes = await client.fetch(`
      *[_type == "class" && tenant._ref == $tenantId] {
        _id,
        title,
        isRecurring,
        recurringSchedule,
        capacity
      }
    `, { tenantId: dancecityTenant._id });
    
    console.log(`\n📚 Found ${classes.length} classes for Dancecity:`);
    classes.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.title} (${cls.isRecurring ? 'Recurring' : 'Single'})`);
      if (cls.isRecurring && cls.recurringSchedule) {
        console.log(`   Schedule: ${cls.recurringSchedule.startDate} to ${cls.recurringSchedule.endDate}`);
        console.log(`   Weekly: ${cls.recurringSchedule.weeklySchedule?.length || 0} time slots`);
      }
    });
    
    // Check for existing instances
    console.log('\n🔍 Checking existing class instances...');
    const instances = await client.fetch(`
      *[_type == "classInstance" && parentClass._ref in $classIds] {
        _id,
        "parentClassTitle": parentClass->title,
        date,
        isCancelled
      } | order(date asc)
    `, { classIds: classes.map(c => c._id) });
    
    console.log(`📅 Found ${instances.length} existing instances:`);
    instances.slice(0, 5).forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.parentClassTitle} - ${new Date(instance.date).toLocaleDateString()}`);
    });
    
    if (instances.length > 5) {
      console.log(`   ... and ${instances.length - 5} more`);
    }
    
    // Test generate instances for first recurring class
    const recurringClass = classes.find(c => c.isRecurring && c.recurringSchedule);
    if (recurringClass) {
      console.log(`\n🧪 Testing instance generation for: ${recurringClass.title}`);
      
      // Simulate the generation logic
      const { startDate, endDate, weeklySchedule } = recurringClass.recurringSchedule;
      console.log(`   Start: ${startDate}, End: ${endDate}`);
      console.log(`   Weekly schedule: ${JSON.stringify(weeklySchedule, null, 2)}`);
      
      // Check if dates are valid
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log('❌ Invalid dates detected!');
        console.log(`   Start date: ${startDate} -> ${start}`);
        console.log(`   End date: ${endDate} -> ${end}`);
      } else {
        console.log('✅ Dates are valid');
        
        // Count how many instances would be generated
        let instanceCount = 0;
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 7)) {
          for (const schedule of weeklySchedule || []) {
            instanceCount++;
          }
        }
        console.log(`   Would generate approximately ${instanceCount} instances`);
      }
    } else {
      console.log('\n⚠️ No recurring classes found to test');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugGenerateInstances();
