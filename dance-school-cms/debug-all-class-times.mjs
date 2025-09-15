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

console.log('🔍 Debugging all class times to identify incorrect conversions...');

async function debugAllClassTimes() {
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
    
    // Get all class instances with their parent class data
    const instances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate] {
        _id,
        date,
        isCancelled,
        "title": parentClass->title,
        "scheduledTime": parentClass->recurringSchedule.weeklySchedule[0].startTime,
        "hasRecurringSchedule": defined(parentClass->recurringSchedule.weeklySchedule[0].startTime)
      } | order(date asc)`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${instances.length} instances:`);
    
    instances.forEach((instance, index) => {
      const instanceDate = new Date(instance.date);
      const utcHours = instanceDate.getUTCHours();
      const utcMinutes = instanceDate.getUTCMinutes();
      
      console.log(`\n${index + 1}. ${instance.title}`);
      console.log(`   Stored Date: ${instance.date}`);
      console.log(`   UTC Time: ${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`);
      console.log(`   Has Recurring Schedule: ${instance.hasRecurringSchedule}`);
      console.log(`   Scheduled Time: ${instance.scheduledTime || 'Not available'}`);
      
      // Show what the current API logic would do
      let apiDisplayTime;
      if (instance.hasRecurringSchedule && instance.scheduledTime) {
        apiDisplayTime = instance.scheduledTime;
        console.log(`   API Logic: Use scheduled time -> ${apiDisplayTime}`);
      } else {
        // Fallback logic
        let displayHours = utcHours;
        if (utcHours === 16) {
          displayHours = 18; // 16:00 UTC -> 18:00 local
        } else if (utcHours === 17) {
          displayHours = 19; // 17:00 UTC -> 19:00 local
        }
        apiDisplayTime = `${displayHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
        console.log(`   API Logic: Fallback conversion ${utcHours}:${utcMinutes.toString().padStart(2, '0')} -> ${apiDisplayTime}`);
      }
      
      // Expected time (what it should be)
      let expectedTime;
      if (instance.scheduledTime) {
        expectedTime = instance.scheduledTime;
      } else {
        // For classes without scheduled time, we need to determine the correct time
        // Based on the pattern, most classes at 18:00 UTC should stay 18:00, 19:00 UTC should stay 19:00
        expectedTime = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
      }
      
      const isCorrect = apiDisplayTime === expectedTime;
      console.log(`   Expected Time: ${expectedTime}`);
      console.log(`   API Display Time: ${apiDisplayTime}`);
      console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      
      if (!isCorrect) {
        console.log(`   ⚠️  PROBLEM: This class will show wrong time!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAllClassTimes();
