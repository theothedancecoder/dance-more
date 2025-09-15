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

console.log('🔍 Debugging date range issue for Level 1 classes...');

async function debugDateRangeIssue() {
  try {
    // Get current date and week range
    const now = new Date();
    console.log('📅 Current date:', now.toISOString());
    console.log('📅 Current date (local):', now.toLocaleDateString());
    
    // Get week start (Monday) like the API does
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log('\n📅 Week range being used by API:');
    console.log('   Start:', weekStart.toISOString());
    console.log('   End:', weekEnd.toISOString());
    
    // Get Dancecity tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0]`
    );
    
    // Get the specific Level 1 classes
    const level1Classes = await client.fetch(
      `*[_type == "class" && 
         tenant._ref == $tenantId && 
         (title == "Salsa Level 1" || title == "Kizomba Level 1")] {
        _id,
        title,
        level,
        isActive,
        isRecurring,
        recurringSchedule
      }`,
      { tenantId: tenant._id }
    );
    
    console.log('\n🎯 Level 1 classes details:');
    
    level1Classes.forEach((classData, index) => {
      console.log(`\n${index + 1}. ${classData.title}`);
      console.log(`   Level field: "${classData.level}"`);
      console.log(`   Is Active: ${classData.isActive !== false}`);
      console.log(`   Is Recurring: ${classData.isRecurring}`);
      
      if (classData.recurringSchedule) {
        const startDate = new Date(classData.recurringSchedule.startDate);
        const endDate = new Date(classData.recurringSchedule.endDate);
        
        console.log(`   Schedule Start: ${classData.recurringSchedule.startDate} (${startDate.toLocaleDateString()})`);
        console.log(`   Schedule End: ${classData.recurringSchedule.endDate} (${endDate.toLocaleDateString()})`);
        
        // Check if current week overlaps with class schedule
        const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
        const classStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const classEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        console.log(`\n   📊 Date comparison:`);
        console.log(`      Week start: ${weekStartDate.toISOString().split('T')[0]}`);
        console.log(`      Week end: ${weekEndDate.toISOString().split('T')[0]}`);
        console.log(`      Class start: ${classStartDate.toISOString().split('T')[0]}`);
        console.log(`      Class end: ${classEndDate.toISOString().split('T')[0]}`);
        
        const hasOverlap = weekStartDate <= classEndDate && weekEndDate >= classStartDate;
        console.log(`      Has overlap: ${hasOverlap}`);
        
        if (!hasOverlap) {
          if (weekStartDate > classEndDate) {
            console.log(`      ❌ Week is AFTER class end date - class has expired!`);
          } else if (weekEndDate < classStartDate) {
            console.log(`      ❌ Week is BEFORE class start date - class hasn't started yet!`);
          }
        } else {
          console.log(`      ✅ Week overlaps with class schedule`);
        }
        
        if (classData.recurringSchedule.weeklySchedule) {
          console.log(`\n   Weekly Schedule:`);
          classData.recurringSchedule.weeklySchedule.forEach((schedule, i) => {
            console.log(`      ${i + 1}. ${schedule.dayOfWeek} at ${schedule.startTime}`);
          });
        }
      }
    });
    
    // Test the virtual instance generation logic manually
    console.log('\n🧪 Testing virtual instance generation...');
    
    for (const classData of level1Classes) {
      if (!classData.recurringSchedule || !classData.recurringSchedule.weeklySchedule) {
        console.log(`❌ ${classData.title}: No weekly schedule`);
        continue;
      }
      
      const classStartDate = new Date(classData.recurringSchedule.startDate);
      const classEndDate = new Date(classData.recurringSchedule.endDate);
      
      // Check if there's overlap
      const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
      const weekEndDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
      const classStartDateOnly = new Date(classStartDate.getFullYear(), classStartDate.getMonth(), classStartDate.getDate());
      const classEndDateOnly = new Date(classEndDate.getFullYear(), classEndDate.getMonth(), classEndDate.getDate());
      
      const effectiveStartDate = new Date(Math.max(weekStartDate.getTime(), classStartDateOnly.getTime()));
      const effectiveEndDate = new Date(Math.min(weekEndDate.getTime(), classEndDateOnly.getTime()));
      
      console.log(`\n🔧 ${classData.title} virtual instance generation:`);
      console.log(`   Effective start: ${effectiveStartDate.toISOString().split('T')[0]}`);
      console.log(`   Effective end: ${effectiveEndDate.toISOString().split('T')[0]}`);
      
      if (effectiveStartDate > effectiveEndDate) {
        console.log(`   ❌ No overlap - no instances will be generated`);
        continue;
      }
      
      // Try to generate instances for each day in the schedule
      for (const schedule of classData.recurringSchedule.weeklySchedule) {
        console.log(`\n   📅 Processing ${schedule.dayOfWeek} at ${schedule.startTime}:`);
        
        const dayMap = {
          'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
          'friday': 5, 'saturday': 6, 'sunday': 0
        };
        
        const targetDay = dayMap[schedule.dayOfWeek?.toLowerCase()];
        if (targetDay === undefined) {
          console.log(`      ❌ Invalid day: ${schedule.dayOfWeek}`);
          continue;
        }
        
        // Find the target day in the current week
        let currentWeekStart = new Date(effectiveStartDate);
        // Adjust to Monday
        const currentDayOfWeek = currentWeekStart.getDay();
        const daysToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
        
        while (currentWeekStart <= effectiveEndDate) {
          const instanceDate = new Date(currentWeekStart);
          
          // Calculate days to add to get to the target day
          let daysToAdd = targetDay - 1; // Convert to 0-based (Monday = 0)
          if (targetDay === 0) { // Sunday
            daysToAdd = 6;
          }
          
          instanceDate.setDate(currentWeekStart.getDate() + daysToAdd);
          
          // Set the time
          if (schedule.startTime) {
            const [hours, minutes] = schedule.startTime.split(':');
            instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }
          
          // Check if this instance should be included
          const instanceDateOnly = new Date(instanceDate.getFullYear(), instanceDate.getMonth(), instanceDate.getDate());
          
          if (instanceDateOnly >= weekStartDate && instanceDateOnly <= weekEndDate && 
              instanceDateOnly >= classStartDateOnly && instanceDateOnly <= classEndDateOnly) {
            console.log(`      ✅ Would generate instance: ${instanceDate.toISOString()}`);
          } else {
            console.log(`      ❌ Instance ${instanceDate.toISOString()} outside valid range`);
          }
          
          // Move to next week
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDateRangeIssue();
