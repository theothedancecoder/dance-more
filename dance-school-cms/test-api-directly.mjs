import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🔍 Testing API directly...');

async function testAPIDirectly() {
  try {
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
    
    console.log(`\n📅 Testing with week range:`);
    console.log(`   Start: ${weekStart.toISOString()}`);
    console.log(`   End: ${weekEnd.toISOString()}`);
    
    // Test the API endpoint
    const apiUrl = `http://localhost:3000/api/classes/instances/public?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&tenantSlug=dancecity`;
    
    console.log(`\n🌐 Calling API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ API Error:', data);
      return;
    }
    
    console.log(`\n📊 API returned ${data.instances?.length || 0} instances:`);
    
    if (data.instances) {
      // Group by day like the component does
      const dayMap = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        dayMap[day] = [];
      });
      
      data.instances.forEach(instance => {
        const instanceDate = new Date(instance.date);
        const dayName = instanceDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        console.log(`\n📝 Instance: ${instance.title}`);
        console.log(`   Date: ${instance.date}`);
        console.log(`   Start Time: ${instance.startTime}`);
        console.log(`   End Time: ${instance.endTime}`);
        console.log(`   Level: ${instance.level}`);
        console.log(`   Day Name: ${dayName}`);
        console.log(`   Is Virtual: ${instance.isVirtual || false}`);
        
        if (dayMap[dayName]) {
          dayMap[dayName].push(instance);
        }
      });
      
      console.log(`\n📋 Classes by day:`);
      days.forEach(day => {
        console.log(`   ${day}: ${dayMap[day].length} classes`);
        dayMap[day].forEach(instance => {
          console.log(`     - ${instance.title} at ${instance.startTime} (${instance.level})`);
        });
      });
      
      // Check specifically for Level 1 classes
      const level1Classes = data.instances.filter(instance => 
        instance.title.toLowerCase().includes('level 1') ||
        instance.level === 'beginner'
      );
      
      console.log(`\n🎯 Level 1 classes found: ${level1Classes.length}`);
      level1Classes.forEach(instance => {
        console.log(`   - ${instance.title} at ${instance.startTime} on ${instance.date}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPIDirectly();
