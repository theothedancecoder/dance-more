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

console.log('🔍 Checking actual instance dates...');

async function checkInstanceDates() {
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
    
    // Get all instances with their dates
    const instances = await client.fetch(
      `*[_type == "classInstance" && parentClass->tenant._ref == $tenantId] {
        _id,
        date,
        "title": parentClass->title,
        "dayOfWeek": parentClass->recurringSchedule.weeklySchedule[0].dayOfWeek,
        "startTime": parentClass->recurringSchedule.weeklySchedule[0].startTime
      } | order(date asc)`,
      { tenantId: tenant._id }
    );
    
    console.log(`\n📊 Found ${instances.length} total instances:`);
    
    instances.forEach((instance, index) => {
      const date = new Date(instance.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US');
      
      console.log(`${index + 1}. ${instance.title}`);
      console.log(`   Date: ${instance.date}`);
      console.log(`   Parsed: ${dateStr} (${dayName})`);
      console.log(`   Expected Day: ${instance.dayOfWeek}`);
      console.log(`   Time: ${instance.startTime}`);
      console.log('');
    });
    
    // Check current date
    const now = new Date();
    console.log(`📅 Current date: ${now.toISOString()}`);
    console.log(`📅 Current date formatted: ${now.toLocaleDateString('en-US')} (${now.toLocaleDateString('en-US', { weekday: 'long' })})`);
    
    // Find instances for this week
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log(`\n📅 This week range:`);
    console.log(`   Start: ${weekStart.toISOString()} (${weekStart.toLocaleDateString('en-US')})`);
    console.log(`   End: ${weekEnd.toISOString()} (${weekEnd.toLocaleDateString('en-US')})`);
    
    const thisWeekInstances = instances.filter(instance => {
      const instanceDate = new Date(instance.date);
      return instanceDate >= weekStart && instanceDate <= weekEnd;
    });
    
    console.log(`\n📋 Instances for this week: ${thisWeekInstances.length}`);
    thisWeekInstances.forEach(instance => {
      const date = new Date(instance.date);
      console.log(`   - ${instance.title} on ${date.toLocaleDateString('en-US')} (${date.toLocaleDateString('en-US', { weekday: 'long' })})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkInstanceDates();
