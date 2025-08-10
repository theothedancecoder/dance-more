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

console.log('🔍 Checking instances for Aug 11-17 week...');

async function checkAug11Week() {
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
    
    // Define the exact week range Aug 11-17
    const weekStart = new Date('2025-08-11T00:00:00.000Z');
    const weekEnd = new Date('2025-08-17T23:59:59.999Z');
    
    console.log(`\n📅 Week range:`);
    console.log(`   Start: ${weekStart.toISOString()}`);
    console.log(`   End: ${weekEnd.toISOString()}`);
    
    // Get instances for this specific week
    const instances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate] {
        _id,
        date,
        "title": parentClass->title,
        "dayOfWeek": parentClass->recurringSchedule.weeklySchedule[0].dayOfWeek,
        "startTime": parentClass->recurringSchedule.weeklySchedule[0].startTime,
        "endTime": parentClass->recurringSchedule.weeklySchedule[0].endTime
      } | order(date asc)`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${instances.length} instances for Aug 11-17:`);
    
    // Group by day
    const dayGroups = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [],
      'Sunday': []
    };
    
    instances.forEach(instance => {
      const date = new Date(instance.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US');
      
      dayGroups[dayName].push({
        ...instance,
        dateStr,
        dayName
      });
    });
    
    // Show what we have for each day
    Object.keys(dayGroups).forEach(day => {
      console.log(`\n${day}:`);
      if (dayGroups[day].length === 0) {
        console.log('   No instances');
      } else {
        dayGroups[day].forEach(instance => {
          console.log(`   - ${instance.title} at ${instance.startTime} (${instance.dateStr})`);
        });
      }
    });
    
    // Check what classes should be on Monday and Wednesday
    console.log(`\n🔍 Expected classes by day:`);
    
    const classes = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isRecurring == true && isActive == true] {
        _id,
        title,
        recurringSchedule
      }`,
      { tenantId: tenant._id }
    );
    
    const expectedByDay = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [],
      'Sunday': []
    };
    
    classes.forEach(classItem => {
      if (classItem.recurringSchedule?.weeklySchedule) {
        classItem.recurringSchedule.weeklySchedule.forEach(schedule => {
          const day = schedule.dayOfWeek.charAt(0).toUpperCase() + schedule.dayOfWeek.slice(1);
          expectedByDay[day].push({
            title: classItem.title,
            time: schedule.startTime
          });
        });
      }
    });
    
    Object.keys(expectedByDay).forEach(day => {
      console.log(`\n${day} (Expected):`);
      if (expectedByDay[day].length === 0) {
        console.log('   No classes scheduled');
      } else {
        expectedByDay[day].forEach(cls => {
          console.log(`   - ${cls.title} at ${cls.time}`);
        });
      }
    });
    
    // Find missing instances
    console.log(`\n❌ Missing instances:`);
    Object.keys(expectedByDay).forEach(day => {
      const expected = expectedByDay[day];
      const actual = dayGroups[day];
      
      expected.forEach(expectedClass => {
        const found = actual.find(actualInstance => 
          actualInstance.title === expectedClass.title && 
          actualInstance.startTime === expectedClass.time
        );
        
        if (!found) {
          console.log(`   ${day}: ${expectedClass.title} at ${expectedClass.time}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAug11Week();
