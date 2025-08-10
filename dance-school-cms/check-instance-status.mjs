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

console.log('🔍 Checking class instance status...');

async function checkInstanceStatus() {
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
    
    // Get all classes for this tenant
    const classes = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isRecurring == true && isActive == true] {
        _id,
        title,
        isRecurring,
        capacity,
        recurringSchedule,
        "futureInstancesCount": count(*[_type == "classInstance" && parentClass._ref == ^._id && date > now()]),
        "totalInstancesCount": count(*[_type == "classInstance" && parentClass._ref == ^._id])
      }`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📚 Found ${classes.length} recurring classes:`);
    
    classes.forEach((classItem, index) => {
      console.log(`\n${index + 1}. ${classItem.title}`);
      console.log(`   Future instances: ${classItem.futureInstancesCount}`);
      console.log(`   Total instances: ${classItem.totalInstancesCount}`);
      console.log(`   Has schedule: ${!!classItem.recurringSchedule?.weeklySchedule?.length}`);
      
      if (classItem.recurringSchedule?.weeklySchedule?.length) {
        classItem.recurringSchedule.weeklySchedule.forEach(schedule => {
          console.log(`   - ${schedule.dayOfWeek}s at ${schedule.startTime}`);
        });
      }
    });
    
    // Check if there are any classes without instances that should have them
    const classesNeedingInstances = classes.filter(c => 
      c.futureInstancesCount === 0 && 
      c.recurringSchedule?.weeklySchedule?.length > 0
    );
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total classes: ${classes.length}`);
    console.log(`   Classes with future instances: ${classes.filter(c => c.futureInstancesCount > 0).length}`);
    console.log(`   Classes needing instances: ${classesNeedingInstances.length}`);
    
    if (classesNeedingInstances.length > 0) {
      console.log(`\n🎯 Classes that need instances:`);
      classesNeedingInstances.forEach(c => {
        console.log(`   - ${c.title}`);
      });
    } else {
      console.log(`\n✅ All classes already have future instances - this is why 0 were generated!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkInstanceStatus();
