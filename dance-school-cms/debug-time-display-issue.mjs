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

console.log('🔍 Debugging time display issue...');

async function debugTimeDisplayIssue() {
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
    
    // Get current week
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log(`\n📅 Week range:`);
    console.log(`   Start: ${weekStart.toISOString()}`);
    console.log(`   End: ${weekEnd.toISOString()}`);
    
    // Get Level 1 class instances
    const level1Instances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate &&
         (parentClass->title match "*Level 1*" || parentClass->title match "*level 1*")] {
        _id,
        date,
        isCancelled,
        "title": parentClass->title,
        "level": parentClass->level,
        "startTime": parentClass->recurringSchedule.weeklySchedule[0].startTime,
        "endTime": parentClass->recurringSchedule.weeklySchedule[0].endTime
      }`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${level1Instances.length} Level 1 instances:`);
    
    level1Instances.forEach((instance, index) => {
      console.log(`\n${index + 1}. ${instance.title}`);
      console.log(`   Date: ${instance.date}`);
      console.log(`   Scheduled Start Time: ${instance.startTime}`);
      console.log(`   Scheduled End Time: ${instance.endTime}`);
      
      // Parse the stored date
      const instanceDate = new Date(instance.date);
      console.log(`   Parsed Date: ${instanceDate.toISOString()}`);
      console.log(`   UTC Hours: ${instanceDate.getUTCHours()}`);
      console.log(`   Local Hours: ${instanceDate.getHours()}`);
      
      // Test different timezone conversion approaches
      console.log(`\n   🔧 Testing timezone conversions:`);
      
      // Current API approach (flawed)
      const currentAPIHour = (instanceDate.getUTCHours() + 2) % 24;
      console.log(`   Current API (UTC + 2): ${currentAPIHour}:${instanceDate.getUTCMinutes().toString().padStart(2, '0')}`);
      
      // Better approach: use the scheduled time directly
      console.log(`   Scheduled time from class: ${instance.startTime}`);
      
      // Extract time from the scheduled time
      if (instance.startTime) {
        const [hours, minutes] = instance.startTime.split(':');
        console.log(`   Should display as: ${hours}:${minutes}`);
      }
    });
    
    // Check if there are missing instances that should be generated
    console.log(`\n🔍 Checking for classes that should have instances...`);
    
    const level1Classes = await client.fetch(
      `*[_type == "class" && 
         tenant._ref == $tenantId && 
         (title match "*Level 1*" || title match "*level 1*") &&
         isActive != false] {
        _id,
        title,
        isRecurring,
        recurringSchedule
      }`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📋 Found ${level1Classes.length} Level 1 classes that should have instances:`);
    
    for (const classData of level1Classes) {
      console.log(`\n📝 Class: ${classData.title}`);
      console.log(`   Is Recurring: ${classData.isRecurring}`);
      
      if (classData.recurringSchedule?.weeklySchedule) {
        console.log(`   Weekly Schedule:`);
        classData.recurringSchedule.weeklySchedule.forEach((schedule, i) => {
          console.log(`     ${i + 1}. ${schedule.dayOfWeek} at ${schedule.startTime}`);
          
          // Check if there's an instance for this schedule
          const dayMap = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
            'friday': 5, 'saturday': 6, 'sunday': 0
          };
          
          const targetDay = dayMap[schedule.dayOfWeek?.toLowerCase()];
          if (targetDay !== undefined) {
            // Calculate the date for this day in the current week
            const targetDate = new Date(weekStart);
            const daysToAdd = targetDay === 0 ? 6 : targetDay - 1; // Convert Sunday to 6, others to 0-based
            targetDate.setDate(weekStart.getDate() + daysToAdd);
            
            console.log(`     Expected instance date: ${targetDate.toISOString().split('T')[0]}`);
            
            // Check if instance exists
            const hasInstance = level1Instances.some(instance => {
              const instanceDateOnly = instance.date.split('T')[0];
              const expectedDateOnly = targetDate.toISOString().split('T')[0];
              return instanceDateOnly === expectedDateOnly && instance.title === classData.title;
            });
            
            console.log(`     Has instance: ${hasInstance ? '✅' : '❌'}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTimeDisplayIssue();
