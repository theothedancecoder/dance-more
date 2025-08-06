import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { auth } from '@clerk/nextjs/server';

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
        recurringSchedule,
        "existingInstancesCount": count(*[_type == "classInstance" && parentClass._ref == ^._id])
      }`,
      { tenantId }
    );

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
          
          const targetDay = dayMap[schedule.dayOfWeek.toLowerCase() as keyof typeof dayMap];
          if (targetDay === undefined) continue;
          
          const currentDay = instanceDate.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7;
          instanceDate.setDate(instanceDate.getDate() + daysUntilTarget);
          
          // Set the time
          const [hours, minutes] = schedule.startTime.split(':');
          instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // Skip if this instance already exists or is in the past
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

      // Create instances in batches
      if (instances.length > 0) {
        try {
          // Create instances one by one to avoid batch issues
          let createdCount = 0;
          for (const instance of instances) {
            try {
              await sanityClient.create(instance);
              createdCount++;
            } catch (createError) {
              // Skip if instance already exists or other error
              console.log(`Skipping instance creation:`, createError);
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
      results
    });

  } catch (error) {
    console.error('Error generating class instances:', error);
    return NextResponse.json(
      { error: 'Failed to generate class instances' },
      { status: 500 }
    );
  }
}
