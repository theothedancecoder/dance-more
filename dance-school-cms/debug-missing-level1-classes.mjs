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

console.log('🔍 Debugging missing Salsa Level 1 and Kizomba Level 1 classes...');

async function debugMissingLevel1Classes() {
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
    console.log('   Tenant ID:', tenant._id);
    
    // Search for all classes containing "salsa" or "kizomba" (case insensitive)
    console.log('\n🔍 Searching for all Salsa and Kizomba classes...');
    
    const allSalsaKizombaClasses = await client.fetch(
      `*[_type == "class" && 
         tenant._ref == $tenantId && 
         (title match "*salsa*" || title match "*Salsa*" || title match "*kizomba*" || title match "*Kizomba*")] {
        _id,
        title,
        danceStyle,
        level,
        isActive,
        isRecurring,
        recurringSchedule,
        instructor->{
          name
        },
        capacity,
        price,
        location
      }`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📊 Found ${allSalsaKizombaClasses.length} Salsa/Kizomba classes:`);
    
    allSalsaKizombaClasses.forEach((classData, index) => {
      console.log(`\n${index + 1}. ${classData.title}`);
      console.log(`   Level: ${classData.level || 'Not specified'}`);
      console.log(`   Dance Style: ${classData.danceStyle || 'Not specified'}`);
      console.log(`   Is Active: ${classData.isActive !== false ? 'Yes' : 'No'}`);
      console.log(`   Is Recurring: ${classData.isRecurring ? 'Yes' : 'No'}`);
      console.log(`   Instructor: ${classData.instructor?.name || 'Not assigned'}`);
      console.log(`   Capacity: ${classData.capacity || 'Not set'}`);
      console.log(`   Price: ${classData.price || 'Not set'}`);
      console.log(`   Location: ${classData.location || 'Not set'}`);
      
      if (classData.recurringSchedule) {
        console.log(`   Recurring Schedule:`);
        console.log(`     Start Date: ${classData.recurringSchedule.startDate || 'Not set'}`);
        console.log(`     End Date: ${classData.recurringSchedule.endDate || 'Not set'}`);
        
        if (classData.recurringSchedule.weeklySchedule) {
          console.log(`     Weekly Schedule:`);
          classData.recurringSchedule.weeklySchedule.forEach((schedule, i) => {
            console.log(`       ${i + 1}. ${schedule.dayOfWeek || 'No day'} at ${schedule.startTime || 'No time'}`);
          });
        } else {
          console.log(`     Weekly Schedule: Not configured`);
        }
      } else {
        console.log(`   Recurring Schedule: Not configured`);
      }
    });
    
    // Specifically look for Level 1 classes
    console.log('\n🎯 Filtering for Level 1 classes...');
    
    const level1Classes = allSalsaKizombaClasses.filter(classData => 
      classData.level && classData.level.toLowerCase().includes('1')
    );
    
    console.log(`\n📋 Found ${level1Classes.length} Level 1 classes:`);
    
    if (level1Classes.length === 0) {
      console.log('❌ No Level 1 classes found! This explains why they\'re not showing on the schedule.');
      
      // Check if there are classes with level containing "level 1" or similar variations
      const possibleLevel1Classes = allSalsaKizombaClasses.filter(classData => 
        classData.title && (
          classData.title.toLowerCase().includes('level 1') ||
          classData.title.toLowerCase().includes('level1') ||
          classData.title.toLowerCase().includes('beginner')
        )
      );
      
      if (possibleLevel1Classes.length > 0) {
        console.log(`\n🔍 Found ${possibleLevel1Classes.length} classes that might be Level 1 (based on title):`);
        possibleLevel1Classes.forEach((classData, index) => {
          console.log(`   ${index + 1}. "${classData.title}" (level field: "${classData.level || 'empty'}")`);
        });
      }
    } else {
      level1Classes.forEach((classData, index) => {
        console.log(`\n${index + 1}. ${classData.title}`);
        console.log(`   Level: ${classData.level}`);
        console.log(`   Is Active: ${classData.isActive !== false ? 'Yes' : 'No'}`);
        console.log(`   Is Recurring: ${classData.isRecurring ? 'Yes' : 'No'}`);
        
        if (!classData.isRecurring) {
          console.log(`   ⚠️  This class is not set as recurring - it won't generate virtual instances!`);
        }
        
        if (classData.isActive === false) {
          console.log(`   ⚠️  This class is inactive - it won't appear on the schedule!`);
        }
        
        if (!classData.recurringSchedule || !classData.recurringSchedule.weeklySchedule) {
          console.log(`   ⚠️  This class has no weekly schedule configured!`);
        }
      });
    }
    
    // Check for existing class instances for Level 1 classes
    console.log('\n🔍 Checking for existing class instances...');
    
    const currentWeek = new Date();
    const weekStart = new Date(currentWeek);
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(currentWeek.getDate() + 7);
    
    const level1Instances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate &&
         (parentClass->title match "*level 1*" || parentClass->title match "*Level 1*" || parentClass->level match "*1*")] {
        _id,
        date,
        isCancelled,
        "title": parentClass->title,
        "level": parentClass->level
      }`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${level1Instances.length} Level 1 class instances for the next week:`);
    
    level1Instances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.title} on ${instance.date} (cancelled: ${instance.isCancelled})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugMissingLevel1Classes();
