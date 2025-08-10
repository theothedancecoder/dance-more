import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { auth } from '@clerk/nextjs/server';

// Standardized function to get the next occurrence of a specific day of the week
function getNextDayOfWeek(baseDate: Date, targetDayOfWeek: number): Date {
  const result = new Date(baseDate);
  const currentDay = result.getDay();
  
  // Calculate days to add to get to the target day
  let daysToAdd = targetDayOfWeek - currentDay;
  
  // If the target day is today or in the past this week, move to next week
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  
  result.setDate(result.getDate() + daysToAdd);
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

    // Get all recurring classes for this tenant that need instances (limit to reduce timeout)
    const classes = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isRecurring == true && isActive == true][0...5] {
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
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() + (week * 7));
          
          // Get the correct day of this week
          const instanceDate = getNextDayOfWeek(weekStart, targetDay);
          
          // If we're looking at the current week, make sure the instance is in the future
          if (week === 0 && instanceDate <= now) {
            continue;
          }
          
          // Set the time
          const [hours, minutes] = schedule.startTime.split(':');
          instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Skip if this instance is in the past
          if (instanceDate < now) continue;
          
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
      message: classes.length >= 5 ? 'Processed first 5 classes. Run again to process more.' : 'All classes processed.'
    });

  } catch (error) {
    console.error('Error generating class instances:', error);
    return NextResponse.json(
      { error: 'Failed to generate class instances' },
      { status: 500 }
    );
  }
}
