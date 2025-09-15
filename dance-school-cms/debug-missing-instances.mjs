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

console.log('🔍 Debugging missing class instances...');

async function debugMissingInstances() {
  try {
    // Get Dancecity tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0]`
    );
    
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
    
    console.log('\n📅 Current week range:');
    console.log('   Start:', weekStart.toISOString());
    console.log('   End:', weekEnd.toISOString());
    
    // Get all class instances for this week
    const allInstances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate] {
        _id,
        date,
        isCancelled,
        "title": parentClass->title,
        "level": parentClass->level,
        "danceStyle": parentClass->danceStyle,
        "classId": parentClass->_id
      } | order(date asc)`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Found ${allInstances.length} class instances for this week:`);
    allInstances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.title} (${instance.level}) on ${instance.date}`);
    });
    
    // Get all classes (including Level 1 ones)
    const allClasses = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId] {
        _id,
        title,
        level,
        danceStyle,
        isActive,
        isRecurring,
        recurringSchedule
      }`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📋 Found ${allClasses.length} total classes:`);
    allClasses.forEach((classData, index) => {
      console.log(`   ${index + 1}. ${classData.title} (${classData.level}) - Active: ${classData.isActive !== false}`);
    });
    
    // Check which classes have instances and which don't
    console.log('\n🔍 Checking which classes have instances generated:');
    
    const classesWithInstances = new Set(allInstances.map(i => i.classId));
    
    allClasses.forEach(classData => {
      const hasInstances = classesWithInstances.has(classData._id);
      const status = hasInstances ? '✅' : '❌';
      console.log(`   ${status} ${classData.title} (${classData.level})`);
      
      if (!hasInstances && classData.isActive !== false) {
        console.log(`      ⚠️  This active class has NO instances for this week!`);
        
        if (classData.recurringSchedule?.weeklySchedule) {
          console.log(`      📅 Schedule: ${classData.recurringSchedule.weeklySchedule.map(s => `${s.dayOfWeek} ${s.startTime}`).join(', ')}`);
          console.log(`      📅 Date range: ${classData.recurringSchedule.startDate} to ${classData.recurringSchedule.endDate}`);
        } else {
          console.log(`      ❌ No weekly schedule configured`);
        }
      }
    });
    
    // Specifically check Level 1 classes
    const level1Classes = allClasses.filter(c => 
      c.title && (c.title.includes('Level 1') || c.title.includes('level 1'))
    );
    
    console.log(`\n🎯 Level 1 classes analysis:`);
    level1Classes.forEach(classData => {
      const hasInstances = classesWithInstances.has(classData._id);
      console.log(`\n   ${classData.title}:`);
      console.log(`     Has instances: ${hasInstances ? 'Yes' : 'No'}`);
      console.log(`     Is active: ${classData.isActive !== false}`);
      console.log(`     Is recurring: ${classData.isRecurring}`);
      
      if (classData.recurringSchedule) {
        console.log(`     Schedule start: ${classData.recurringSchedule.startDate}`);
        console.log(`     Schedule end: ${classData.recurringSchedule.endDate}`);
        
        // Check if the current week overlaps with the class schedule
        const classStart = new Date(classData.recurringSchedule.startDate);
        const classEnd = new Date(classData.recurringSchedule.endDate);
        const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
        const classStartDate = new Date(classStart.getFullYear(), classStart.getMonth(), classStart.getDate());
        const classEndDate = new Date(classEnd.getFullYear(), classEnd.getMonth(), classEnd.getDate());
        
        const hasOverlap = weekStartDate <= classEndDate && weekEndDate >= classStartDate;
        console.log(`     Week overlaps with class: ${hasOverlap}`);
        
        if (!hasOverlap) {
          if (weekStartDate > classEndDate) {
            console.log(`     ❌ Current week is AFTER class end date - class has expired!`);
          } else {
            console.log(`     ❌ Current week is BEFORE class start date - class hasn't started yet!`);
          }
        }
      }
    });
    
    // Check if there's a pattern in the missing instances
    console.log('\n🔍 Checking for patterns in missing instances...');
    
    const missingClasses = allClasses.filter(c => 
      c.isActive !== false && 
      !classesWithInstances.has(c._id) &&
      c.recurringSchedule?.weeklySchedule
    );
    
    if (missingClasses.length > 0) {
      console.log(`\n❌ Found ${missingClasses.length} active classes with schedules but NO instances:`);
      missingClasses.forEach(c => {
        console.log(`   - ${c.title} (${c.level})`);
      });
      
      console.log('\n💡 This suggests that class instances were not properly generated for these classes.');
      console.log('   This could be due to:');
      console.log('   1. Instance generation script not running');
      console.log('   2. Date range issues in instance generation');
      console.log('   3. Missing or incorrect recurring schedule configuration');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugMissingInstances();
