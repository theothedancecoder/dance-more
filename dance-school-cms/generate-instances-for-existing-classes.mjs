import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'your-project-id', // You'll need to replace this
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-07-01',
  token: 'your-token' // You'll need to replace this
});

async function generateInstancesForExistingClasses() {
  try {
    // Get all classes for my-dance-studio tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == "my-dance-studio"][0]`
    );
    
    if (!tenant) {
      console.log('❌ Tenant "my-dance-studio" not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant.schoolName);
    
    // Get all classes for this tenant
    const classes = await client.fetch(
      `*[_type == "class" && tenant._ref == $tenantId]`,
      { tenantId: tenant._id }
    );
    
    console.log(`📚 Found ${classes.length} classes`);
    
    for (const classItem of classes) {
      console.log(`\n🔄 Processing class: ${classItem.title}`);
      
      // Check if this class already has instances
      const existingInstances = await client.fetch(
        `*[_type == "classInstance" && parentClass._ref == $classId]`,
        { classId: classItem._id }
      );
      
      if (existingInstances.length > 0) {
        console.log(`   ⏭️  Already has ${existingInstances.length} instances, skipping`);
        continue;
      }
      
      // Generate instance based on class type
      if (classItem.isRecurring && classItem.recurringSchedule) {
        console.log('   📅 Generating recurring instances...');
        // Generate recurring instances (simplified - just next 4 weeks)
        const instances = [];
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 28); // 4 weeks
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
          for (const schedule of classItem.recurringSchedule.weeklySchedule) {
            const instanceDate = getDateForDayOfWeek(date, schedule.dayOfWeek);
            const [startHour, startMinute] = schedule.startTime.split(':');
            instanceDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
            
            instances.push({
              _type: 'classInstance',
              parentClass: { _type: 'reference', _ref: classItem._id },
              tenant: { _type: 'reference', _ref: tenant._id },
              date: instanceDate.toISOString(),
              isCancelled: false,
              bookings: [],
              remainingCapacity: classItem.capacity,
            });
          }
        }
        
        if (instances.length > 0) {
          await Promise.all(instances.map(instance => client.create(instance)));
          console.log(`   ✅ Created ${instances.length} recurring instances`);
        }
        
      } else if (classItem.singleClassDate) {
        console.log('   📅 Generating single instance...');
        // Generate single instance
        const instance = {
          _type: 'classInstance',
          parentClass: { _type: 'reference', _ref: classItem._id },
          tenant: { _type: 'reference', _ref: tenant._id },
          date: new Date(classItem.singleClassDate).toISOString(),
          isCancelled: false,
          bookings: [],
          remainingCapacity: classItem.capacity,
        };
        
        await client.create(instance);
        console.log('   ✅ Created single instance');
      } else {
        console.log('   ⚠️  No schedule information found, skipping');
      }
    }
    
    console.log('\n🎉 Instance generation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function getDateForDayOfWeek(baseDate, dayOfWeek) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  const currentDay = baseDate.getDay();
  
  const date = new Date(baseDate);
  const diff = targetDay - currentDay;
  date.setDate(date.getDate() + diff);
  
  return date;
}

generateInstancesForExistingClasses();
