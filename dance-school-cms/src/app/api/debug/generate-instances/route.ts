import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, writeClient } from '@/lib/sanity';

// Helper function to generate class instances for recurring classes
function getDateForDayOfWeek(baseDate: Date, dayOfWeek: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  const currentDay = baseDate.getDay();
  
  const date = new Date(baseDate);
  const diff = targetDay - currentDay;
  date.setDate(date.getDate() + diff);
  
  return date;
}

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const { tenantSlug } = await request.json();
    
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]`,
      { tenantSlug }
    );
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get all classes for this tenant
    const classes = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId]`,
      { tenantId: tenant._id }
    );

    let totalInstancesCreated = 0;
    const results = [];

    for (const classItem of classes) {
      // Check if this class already has instances
      const existingInstances = await sanityClient.fetch(
        `*[_type == "classInstance" && parentClass._ref == $classId]`,
        { classId: classItem._id }
      );
      
      if (existingInstances.length > 0) {
        results.push({
          classTitle: classItem.title,
          status: 'skipped',
          reason: `Already has ${existingInstances.length} instances`
        });
        continue;
      }

      let instancesCreated = 0;

      if (classItem.isRecurring && classItem.recurringSchedule) {
        // Generate recurring instances for next 4 weeks
        const instances = [];
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 28); // 4 weeks
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
          for (const schedule of classItem.recurringSchedule.weeklySchedule) {
            const instanceDate = getDateForDayOfWeek(date, schedule.dayOfWeek);
            const [startHour, startMinute] = schedule.startTime.split(':');
            instanceDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
            
            if (instanceDate >= startDate && instanceDate <= endDate) {
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
        }
        
        if (instances.length > 0) {
          await Promise.all(instances.map(instance => writeClient.create(instance)));
          instancesCreated = instances.length;
        }
        
      } else if (classItem.singleClassDate) {
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
        
        await writeClient.create(instance);
        instancesCreated = 1;
      }

      totalInstancesCreated += instancesCreated;
      results.push({
        classTitle: classItem.title,
        status: instancesCreated > 0 ? 'success' : 'no_schedule',
        instancesCreated,
        reason: instancesCreated === 0 ? 'No schedule information found' : undefined
      });
    }

    return NextResponse.json({
      success: true,
      tenant: tenant.schoolName,
      totalClassesProcessed: classes.length,
      totalInstancesCreated,
      results
    });

  } catch (error) {
    console.error('Error generating instances:', error);
    return NextResponse.json(
      { error: 'Failed to generate instances' },
      { status: 500 }
    );
  }
}
