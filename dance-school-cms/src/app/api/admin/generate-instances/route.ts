import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { auth } from '@clerk/nextjs/server';

// Get the date for a specific day of the week in a given week
function getDateForDayInWeek(weekStartDate: Date, targetDayOfWeek: number): Date {
  const result = new Date(weekStartDate);
  
  // Get Monday of this week (weekStartDate should be Monday)
  const currentDay = result.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday (0) and other days
  result.setDate(result.getDate() + mondayOffset);
  
  // Now add days to get to target day (Monday=1, Tuesday=2, etc.)
  const daysFromMonday = targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1; // Sunday becomes 6 days from Monday
  result.setDate(result.getDate() + daysFromMonday);
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tenant from headers
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Verify user has admin permissions for this tenant
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
      { userId, tenantId }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all recurring classes for this tenant that need instances
    const classes = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isRecurring == true && isActive == true] {
        _id,
        title,
        isRecurring,
        capacity,
        recurringSchedule
      }`,
      { tenantId }
    );

    console.log(`Processing ${classes.length} classes for tenant ${tenantId}`);

    let totalInstancesCreated = 0;
    const results = [];

    for (const classData of classes) {
      if (!classData.recurringSchedule?.weeklySchedule) {
        results.push({
          classId: classData._id,
          className: classData.title,
          instancesCreated: 0,
          message: 'No weekly schedule defined'
        });
        continue;
      }

      // Check if instances already exist for this class (quick check)
      const existingInstances = await sanityClient.fetch(
        `count(*[_type == "classInstance" && parentClass._ref == $classId && date > now()])`,
        { classId: classData._id }
      );

      if (existingInstances > 0) {
        results.push({
          classId: classData._id,
          className: classData.title,
          instancesCreated: 0,
          message: `Already has ${existingInstances} future instances`
        });
        continue;
      }

      // Generate instances for the next 4 weeks only (reduced from 8 to prevent timeout)
      const instances = [];
      const now = new Date();
      
      for (const schedule of classData.recurringSchedule.weeklySchedule) {
        // Day mapping: JavaScript getDay() returns 0=Sunday, 1=Monday, etc.
        const dayMap = {
          'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
          'friday': 5, 'saturday': 6, 'sunday': 0
        };
        
        const targetDay = dayMap[schedule.dayOfWeek.toLowerCase() as keyof typeof dayMap];
        if (targetDay === undefined) {
          console.warn(`Invalid day of week: ${schedule.dayOfWeek}`);
          continue;
        }
        
        // Generate instances for the next 4 weeks
        for (let week = 0; week < 4; week++) {
          // Calculate the Monday of the target week
          const mondayOfWeek = new Date(now);
          mondayOfWeek.setDate(now.getDate() + (week * 7));
          
          // Adjust to get Monday of this week
          const dayOfWeek = mondayOfWeek.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          mondayOfWeek.setDate(mondayOfWeek.getDate() + daysToMonday);
          
          // Get the specific day for this class
          const instanceDate = getDateForDayInWeek(mondayOfWeek, targetDay);
          
          // Set the time
          const [hours, minutes] = schedule.startTime.split(':');
          instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Skip if this instance is in the past
          if (instanceDate <= now) continue;
          
          const instance = {
            _type: 'classInstance',
            parentClass: { _ref: classData._id },
            date: instanceDate.toISOString(),
            isCancelled: false,
            remainingCapacity: classData.capacity,
            bookings: []
          };
          
          instances.push(instance);
        }
      }

      // Create instances in smaller batches to avoid timeout
      if (instances.length > 0) {
        try {
          // Create instances one by one but with better error handling
          let createdCount = 0;
          for (const instance of instances) {
            try {
              await sanityClient.create(instance);
              createdCount++;
            } catch (createError: any) {
              // Skip if instance already exists (duplicate key error)
              if (createError?.message?.includes('already exists') || createError?.statusCode === 409) {
                console.log(`Instance already exists, skipping...`);
              } else {
                console.log(`Error creating instance:`, createError?.message || createError);
              }
            }
          }
          
          totalInstancesCreated += createdCount;
          
          results.push({
            classId: classData._id,
            className: classData.title,
            instancesCreated: createdCount,
            message: 'Success'
          });
        } catch (error) {
          console.error(`Error creating instances for ${classData.title}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            classId: classData._id,
            className: classData.title,
            instancesCreated: 0,
            message: `Error: ${errorMessage}`
          });
        }
      } else {
        results.push({
          classId: classData._id,
          className: classData.title,
          instancesCreated: 0,
          message: 'No future instances needed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalInstancesCreated,
      classesProcessed: classes.length,
      results,
      message: totalInstancesCreated > 0 ? `Successfully created ${totalInstancesCreated} new instances.` : 'All classes already have future instances.'
    });

  } catch (error) {
    console.error('Error generating class instances:', error);
    return NextResponse.json(
      { error: 'Failed to generate class instances' },
      { status: 500 }
    );
  }
}
