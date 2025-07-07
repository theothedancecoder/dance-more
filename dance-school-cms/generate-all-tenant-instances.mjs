import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
});

const readClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

function getDateForDayOfWeek(baseDate, dayOfWeek) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  const currentDay = baseDate.getDay();
  
  const date = new Date(baseDate);
  const diff = targetDay - currentDay;
  date.setDate(date.getDate() + diff);
  
  return date;
}

async function generateRecurringInstances(classData, tenantId) {
  const { recurringSchedule, capacity } = classData;
  const { startDate, endDate, weeklySchedule } = recurringSchedule;
  const instances = [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 7)) {
    for (const schedule of weeklySchedule) {
      const instanceDate = getDateForDayOfWeek(date, schedule.dayOfWeek);
      
      if (instanceDate >= start && instanceDate <= end) {
        const [startHour, startMinute] = schedule.startTime.split(':');
        instanceDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

        instances.push({
          _type: 'classInstance',
          parentClass: {
            _type: 'reference',
            _ref: classData._id,
          },
          tenant: {
            _type: 'reference',
            _ref: tenantId,
          },
          date: instanceDate.toISOString(),
          isCancelled: false,
          bookings: [],
          remainingCapacity: capacity,
        });
      }
    }
  }

  if (instances.length > 0) {
    const createdInstances = await Promise.all(
      instances.map(instance => writeClient.create(instance))
    );
    return createdInstances;
  }
  
  return [];
}

async function generateSingleInstance(classData, tenantId) {
  const instance = {
    _type: 'classInstance',
    parentClass: {
      _type: 'reference',
      _ref: classData._id,
    },
    tenant: {
      _type: 'reference',
      _ref: tenantId,
    },
    date: new Date(classData.singleClassDate).toISOString(),
    isCancelled: false,
    bookings: [],
    remainingCapacity: classData.capacity,
  };
  
  const createdInstance = await writeClient.create(instance);
  return createdInstance;
}

async function generateInstancesForAllTenants() {
  try {
    console.log('🚀 Starting instance generation for all tenants...');

    // Get all active tenants
    const tenants = await readClient.fetch(`
      *[_type == "tenant" && status == "active"] {
        _id,
        schoolName,
        "slug": slug.current
      }
    `);

    console.log(`📋 Found ${tenants.length} active tenants`);

    let grandTotalInstances = 0;

    for (const tenant of tenants) {
      console.log(`\n🏫 Processing tenant: ${tenant.schoolName} (${tenant.slug})`);

      // Get all classes for this tenant
      const classes = await readClient.fetch(`
        *[_type == "class" && tenant._ref == $tenantId] {
          _id,
          title,
          capacity,
          isRecurring,
          singleClassDate,
          recurringSchedule
        }
      `, { tenantId: tenant._id });

      console.log(`   📚 Found ${classes.length} classes`);

      let tenantInstancesCreated = 0;

      for (const classData of classes) {
        try {
          // Check if instances already exist for this class
          const existingInstances = await readClient.fetch(`
            *[_type == "classInstance" && parentClass._ref == $classId]
          `, { classId: classData._id });

          if (existingInstances.length > 0) {
            console.log(`   ⏭️  Skipping "${classData.title}" - already has ${existingInstances.length} instances`);
            continue;
          }

          let instancesCreated = 0;

          if (classData.isRecurring && classData.recurringSchedule) {
            console.log(`   🔄 Generating instances for recurring class: ${classData.title}`);
            const instances = await generateRecurringInstances(classData, tenant._id);
            instancesCreated = instances.length;
          } else if (classData.singleClassDate) {
            console.log(`   📅 Generating instance for single class: ${classData.title}`);
            const instance = await generateSingleInstance(classData, tenant._id);
            instancesCreated = instance ? 1 : 0;
          } else {
            console.log(`   ⚠️  Skipping "${classData.title}" - no schedule data`);
            continue;
          }

          tenantInstancesCreated += instancesCreated;
          console.log(`   ✅ Created ${instancesCreated} instances for "${classData.title}"`);

        } catch (error) {
          console.error(`   ❌ Error processing class "${classData.title}":`, error.message);
        }
      }

      grandTotalInstances += tenantInstancesCreated;
      console.log(`   🎯 Total instances created for ${tenant.schoolName}: ${tenantInstancesCreated}`);
    }

    console.log(`\n🎉 COMPLETED! Generated ${grandTotalInstances} instances across ${tenants.length} tenants`);

  } catch (error) {
    console.error('❌ Error generating instances:', error);
    process.exit(1);
  }
}

generateInstancesForAllTenants();
