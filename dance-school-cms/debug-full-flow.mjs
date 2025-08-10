import { createClient } from '@sanity/client';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔍 Full data flow debugging...');

async function debugFullFlow() {
  try {
    console.log('\n=== STEP 1: DATABASE CHECK ===');
    
    // Get Dancecity tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0]`
    );
    
    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant.schoolName);
    
    // Check instances in database for Aug 11-17
    const weekStart = new Date('2025-08-11T00:00:00.000Z');
    const weekEnd = new Date('2025-08-17T23:59:59.999Z');
    
    const dbInstances = await client.fetch(
      `*[_type == "classInstance" && 
         parentClass->tenant._ref == $tenantId && 
         date >= $startDate && 
         date <= $endDate] {
        _id,
        date,
        "title": parentClass->title,
        "duration": parentClass->duration,
        "capacity": parentClass->capacity,
        "price": parentClass->price,
        "level": parentClass->level,
        "location": parentClass->location,
        "instructor": parentClass->instructor->name
      } | order(date asc)`,
      { 
        tenantId: tenant._id,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      }
    );
    
    console.log(`\n📊 Database instances: ${dbInstances.length}`);
    
    const dbByDay = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      dbByDay[day] = [];
    });
    
    dbInstances.forEach(instance => {
      const date = new Date(instance.date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getUTCDay()];
      dbByDay[dayName].push(instance);
      console.log(`   ${instance.title}: ${instance.date} -> ${dayName}`);
    });
    
    console.log('\n📋 Database by day:');
    Object.keys(dbByDay).forEach(day => {
      console.log(`   ${day}: ${dbByDay[day].length} classes`);
    });
    
    console.log('\n=== STEP 2: API CHECK ===');
    
    // Test the API endpoint
    const apiUrl = `http://localhost:3000/api/classes/instances/public?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}&tenantSlug=dancecity`;
    console.log('🌐 Testing API:', apiUrl);
    
    try {
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.log('❌ API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
        return;
      }
      
      const apiData = await response.json();
      console.log(`✅ API returned ${apiData.instances?.length || 0} instances`);
      
      if (apiData.instances && apiData.instances.length > 0) {
        const apiByDay = {};
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
          apiByDay[day] = [];
        });
        
        apiData.instances.forEach(instance => {
          const date = new Date(instance.date);
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[date.getUTCDay()];
          apiByDay[dayName].push(instance);
          console.log(`   ${instance.title}: ${instance.date} -> ${dayName} (${instance.startTime})`);
        });
        
        console.log('\n📋 API by day:');
        Object.keys(apiByDay).forEach(day => {
          console.log(`   ${day}: ${apiByDay[day].length} classes`);
        });
        
        // Compare database vs API
        console.log('\n=== STEP 3: COMPARISON ===');
        let mismatch = false;
        Object.keys(dbByDay).forEach(day => {
          const dbCount = dbByDay[day].length;
          const apiCount = apiByDay[day].length;
          if (dbCount !== apiCount) {
            console.log(`❌ MISMATCH ${day}: DB=${dbCount}, API=${apiCount}`);
            mismatch = true;
          } else {
            console.log(`✅ MATCH ${day}: ${dbCount} classes`);
          }
        });
        
        if (!mismatch) {
          console.log('\n✅ Database and API match perfectly!');
          console.log('🔍 The issue might be in the frontend component or caching.');
        }
        
      } else {
        console.log('❌ API returned no instances');
      }
      
    } catch (apiError) {
      console.log('❌ API call failed:', apiError.message);
      console.log('💡 Make sure the development server is running: npm run dev');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFullFlow();
