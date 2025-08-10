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

console.log('🔍 Debugging weekly schedule API...');

async function debugWeeklyScheduleAPI() {
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
    
    // Get current week start (Monday)
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
    
    // Fetch class instances like the API does
    const instances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate &&
         !isCancelled] {
        _id,
        date,
        isCancelled,
        remainingCapacity,
        "title": parentClass->title,
        "instructor": parentClass->instructor->name,
        "startTime": parentClass->recurringSchedule.weeklySchedule[0].startTime,
        "endTime": parentClass->recurringSchedule.weeklySchedule[0].endTime,
        "capacity": parentClass->capacity,
        "price": parentClass->price,
        "level": parentClass->level,
        "location": parentClass->location,
        "booked": count(bookings)
      } | order(date asc)`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${instances.length} instances for this week:`);
    
    // Group by day like the component does
    const dayMap = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      dayMap[day] = [];
    });
    
    instances.forEach(instance => {
      const instanceDate = new Date(instance.date);
      const dayName = instanceDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      console.log(`\n📝 Instance: ${instance.title}`);
      console.log(`   Date: ${instance.date}`);
      console.log(`   Parsed Date: ${instanceDate.toISOString()}`);
      console.log(`   Day Name: ${dayName}`);
      console.log(`   Start Time: ${instance.startTime}`);
      console.log(`   End Time: ${instance.endTime}`);
      
      if (dayMap[dayName]) {
        dayMap[dayName].push(instance);
      } else {
        console.log(`   ⚠️  Day name "${dayName}" not found in dayMap!`);
      }
    });
    
    console.log(`\n📋 Classes by day:`);
    days.forEach(day => {
      console.log(`   ${day}: ${dayMap[day].length} classes`);
      dayMap[day].forEach(instance => {
        console.log(`     - ${instance.title} at ${instance.startTime}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugWeeklyScheduleAPI();
