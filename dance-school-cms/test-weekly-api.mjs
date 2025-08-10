import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🔍 Testing the actual weekly schedule API...');

async function testWeeklyAPI() {
  try {
    // Test the exact API call that WeeklySchedule component makes
    const weekStart = new Date('2025-08-11T00:00:00.000Z');
    const weekEnd = new Date('2025-08-17T23:59:59.999Z');
    
    const url = `http://localhost:3000/api/classes/instances/public?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&tenantSlug=dancecity`;
    
    console.log('🌐 Making API call to:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('❌ API response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received');
    console.log('📊 Total instances:', data.instances?.length || 0);
    
    if (data.instances && data.instances.length > 0) {
      // Group by day like the component does
      const dayGroups = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        dayGroups[day] = [];
      });
      
      data.instances.forEach(instance => {
        const instanceDate = new Date(instance.date + 'T00:00:00.000Z'); // Add time to make it a proper date
        const dayName = instanceDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        console.log(`📝 Instance: ${instance.title}`);
        console.log(`   Date: ${instance.date}`);
        console.log(`   Parsed Date: ${instanceDate.toISOString()}`);
        console.log(`   Day Name: ${dayName}`);
        console.log(`   Start Time: ${instance.startTime}`);
        
        if (dayGroups[dayName]) {
          dayGroups[dayName].push(instance);
        } else {
          console.log(`   ⚠️  Day name "${dayName}" not found in dayGroups!`);
        }
      });
      
      console.log(`\n📋 Classes by day (from API):`);
      days.forEach(day => {
        console.log(`   ${day}: ${dayGroups[day].length} classes`);
        dayGroups[day].forEach(instance => {
          console.log(`     - ${instance.title} at ${instance.startTime}`);
        });
      });
    } else {
      console.log('❌ No instances returned from API');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testWeeklyAPI();
