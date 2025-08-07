import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
});

async function generateInstancesForAllTenants() {
  try {
    console.log('🚀 Starting class instance generation for all tenants...\n');

    // Get all tenants
    const tenants = await client.fetch(`*[_type == "tenant"] {
      _id,
      schoolName,
      slug
    }`);

    console.log(`📚 Found ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏫 Processing tenant: ${tenant.schoolName} (${tenant.slug.current})`);
      
      // Get all active recurring classes for this tenant
      const classes = await client.fetch(
        `*[_type == "class" && tenant._ref == $tenantId && isRecurring == true && isActive == true] {
          _id,
          title,
          capacity,
          recurringSchedule,
          "existingInstancesCount": count(*[_type == "classInstance" && parentClass._ref == ^._id])
        }`,
        { tenantId: tenant._id }
      );

      console.log(`   📅 Found ${classes.length} active recurring classes`);

      let totalInstancesCreated = 0;

      for (const classData of classes) {
        console.log(`   🔄 Processing class: ${classData.title}`);
        
        if (!classData.recurringSchedule?.weeklySchedule) {
          console.log(`      ⚠️  No weekly schedule defined, skipping`);
          continue;
        }

        // Generate instances for the next 8 weeks
        const instances = [];
        const now = new Date();
        
        for (const schedule of classData.recurringSchedule.weeklySchedule) {
          for (let week = 0; week < 8; week++) {
            const instanceDate = new Date(now);
            instanceDate.setDate(now.getDate() + (week * 7));
            
            // Find the next occurrence of the day
            const dayMap = {
              'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
              'friday': 5, 'saturday': 6, 'sunday': 0
            };
            
            const targetDay = dayMap[schedule.dayOfWeek.toLowerCase()];
            if (targetDay === undefined) continue;
            
            const currentDay = instanceDate.getDay();
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            instanceDate.setDate(instanceDate.getDate() + daysUntilTarget);
            
            // Set the time
            const [hours, minutes] = schedule.startTime.split(':');
            instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Skip if this instance is in the past
            if (instanceDate < now) continue;
            
            // Create a unique ID for the instance
            const instanceId = `${classData._id}-${instanceDate.toISOString().split('T')[0]}`;
            
            const instance = {
              _type: 'classInstance',
              _id: instanceId,
              parentClass: { _ref: classData._id },
              date: instanceDate.toISOString(),
              isCancelled: false,
              remainingCapacity: classData.capacity,
              bookings: []
            };
            
            instances.push(instance);
          }
        }

        // Create instances one by one to avoid duplicates
        let createdCount = 0;
        for (const instance of instances) {
          try {
            await client.create(instance);
            createdCount++;
          } catch (createError) {
            // Skip if instance already exists
            if (createError.message?.includes('already exists')) {
              console.log(`      ⏭️  Instance ${instance._id} already exists, skipping`);
            } else {
              console.log(`      ❌ Error creating instance: ${createError.message}`);
            }
          }
        }
        
        totalInstancesCreated += createdCount;
        console.log(`      ✅ Created ${createdCount} instances`);
      }

      console.log(`   🎉 Total instances created for ${tenant.schoolName}: ${totalInstancesCreated}`);
    }

    console.log('\n🎊 Instance generation complete for all tenants!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateInstancesForAllTenants();
