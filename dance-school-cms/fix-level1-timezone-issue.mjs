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

console.log('🔧 Fixing timezone issue for Level 1 classes...');

async function fixLevel1TimezoneIssue() {
  try {
    // Get the Level 1 instances we just created
    const level1Instances = await client.fetch(
      `*[_type == "classInstance" && 
         (parentClass->title == "Salsa Level 1" || parentClass->title == "Kizomba Level 1") &&
         date >= "2025-09-15T00:00:00.000Z" && 
         date <= "2025-09-17T23:59:59.999Z"] {
        _id,
        date,
        "title": parentClass->title,
        "schedule": parentClass->recurringSchedule.weeklySchedule[0]
      }`
    );
    
    console.log(`\n🎯 Found ${level1Instances.length} Level 1 instances to fix:`);
    
    for (const instance of level1Instances) {
      console.log(`\n🔧 Processing ${instance.title}:`);
      console.log(`   Current date: ${instance.date}`);
      console.log(`   Schedule time: ${instance.schedule?.startTime}`);
      
      if (!instance.schedule?.startTime) {
        console.log('   ❌ No schedule time found');
        continue;
      }
      
      // Parse the current date to get the day
      const currentDate = new Date(instance.date);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = currentDate.getDate();
      
      // Create new date with correct time (18:00 local = 18:00 UTC for this timezone)
      const [hours, minutes] = instance.schedule.startTime.split(':');
      const correctedDate = new Date(year, month, day, parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log(`   Corrected date: ${correctedDate.toISOString()}`);
      console.log(`   Local time: ${correctedDate.toLocaleString()}`);
      
      // Update the instance
      try {
        await client
          .patch(instance._id)
          .set({ date: correctedDate.toISOString() })
          .commit();
        
        console.log(`   ✅ Updated ${instance.title} instance`);
      } catch (error) {
        console.error(`   ❌ Failed to update ${instance.title}:`, error.message);
      }
    }
    
    console.log('\n🎉 Timezone fix complete!');
    console.log('   The classes should now show at the correct times (18:00-19:00).');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixLevel1TimezoneIssue();
