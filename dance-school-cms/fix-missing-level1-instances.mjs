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

console.log('🔧 Fixing missing Level 1 class instances...');

async function fixMissingLevel1Instances() {
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
    
    // Get Level 1 classes
    const level1Classes = await client.fetch(
      `*[_type == "class" && 
         tenant._ref == $tenantId && 
         (title match "*Level 1*" || title match "*level 1*") &&
         isActive != false] {
        _id,
        title,
        isRecurring,
        recurringSchedule,
        capacity,
        price
      }`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📋 Found ${level1Classes.length} Level 1 classes:`);
    
    // Get current week
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    console.log(`\n📅 Week start: ${weekStart.toISOString()}`);
    
    const instancesToCreate = [];
    
    for (const classData of level1Classes) {
      console.log(`\n📝 Processing: ${classData.title}`);
      
      if (classData.recurringSchedule?.weeklySchedule) {
        for (const schedule of classData.recurringSchedule.weeklySchedule) {
          console.log(`   Schedule: ${schedule.dayOfWeek} at ${schedule.startTime}`);
          
          // Calculate the correct date for this week
          const dayMap = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
            'friday': 5, 'saturday': 6, 'sunday': 0
          };
          
          const targetDay = dayMap[schedule.dayOfWeek?.toLowerCase()];
          if (targetDay !== undefined) {
            const targetDate = new Date(weekStart);
            const daysToAdd = targetDay === 0 ? 6 : targetDay - 1; // Convert Sunday to 6, others to 0-based
            targetDate.setDate(weekStart.getDate() + daysToAdd);
            
            // Set the time from the schedule
            const [hours, minutes] = schedule.startTime.split(':');
            targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            console.log(`   Target date: ${targetDate.toISOString()}`);
            
            // Check if instance already exists for this exact date and class
            const existingInstance = await client.fetch(
              `*[_type == "classInstance" && 
                 parentClass._ref == $classId && 
                 date == $targetDate][0]`,
              { 
                classId: classData._id,
                targetDate: targetDate.toISOString()
              }
            );
            
            if (existingInstance) {
              console.log(`   ✅ Instance already exists: ${existingInstance._id}`);
            } else {
              console.log(`   ❌ Missing instance - will create`);
              
              instancesToCreate.push({
                _type: 'classInstance',
                parentClass: {
                  _type: 'reference',
                  _ref: classData._id
                },
                date: targetDate.toISOString(),
                isCancelled: false,
                remainingCapacity: classData.capacity || 20,
                bookings: []
              });
            }
          }
        }
      }
    }
    
    console.log(`\n🔧 Creating ${instancesToCreate.length} missing instances...`);
    
    if (instancesToCreate.length > 0) {
      for (const instance of instancesToCreate) {
        try {
          const result = await client.create(instance);
          console.log(`✅ Created instance: ${result._id} for ${instance.date}`);
        } catch (error) {
          console.error(`❌ Failed to create instance for ${instance.date}:`, error.message);
        }
      }
    } else {
      console.log('✅ No missing instances to create');
    }
    
    console.log('\n🎉 Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMissingLevel1Instances();
