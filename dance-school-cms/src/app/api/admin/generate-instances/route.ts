import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { auth } from '@clerk/nextjs/server';

interface WeeklyScheduleItem {
  dayOfWeek: string;
  startTime: string;
  endTime?: string;
}

interface RecurringSchedule {
  startDate?: string;
  endDate?: string;
  weeklySchedule?: WeeklyScheduleItem[];
}

interface ClassData {
  _id: string;
  title: string;
  capacity: number;
  recurringSchedule?: RecurringSchedule;
}

interface GenerationResultItem {
  classId: string;
  className: string;
  instancesCreated: number;
  message: string;
  instancesDeleted?: number;
  previewInstancesToCreate?: number;
  previewInstancesToDelete?: number;
  bookedMismatchesRetained?: number;
  duplicateInstancesDeleted?: number;
  bookedDuplicatesRetained?: number;
}

interface CreateError {
  message?: string;
  statusCode?: number;
}

interface GeneratedInstance {
  _type: 'classInstance';
  parentClass: { _type: 'reference'; _ref: string };
  date: string;
  isCancelled: false;
  remainingCapacity: number;
  bookings: [];
}

interface ExistingInstance {
  _id: string;
  date: string;
  bookingCount: number;
}

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

function buildFutureInstances(classData: ClassData, now: Date): GeneratedInstance[] {
  const instances: GeneratedInstance[] = [];
  const candidateDateSet = new Set<string>();
  const dayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0
  } as const;

  if (!classData.recurringSchedule?.weeklySchedule?.length) {
    instances.sort((a, b) => a.date.localeCompare(b.date));
    return instances;
  }

  const scheduleStart = classData.recurringSchedule.startDate ? new Date(classData.recurringSchedule.startDate) : null;
  const scheduleEnd = classData.recurringSchedule.endDate ? new Date(classData.recurringSchedule.endDate) : null;

  for (const schedule of classData.recurringSchedule.weeklySchedule) {
    const targetDay = dayMap[schedule.dayOfWeek.toLowerCase() as keyof typeof dayMap];
    if (targetDay === undefined) {
      console.warn(`Invalid day of week: ${schedule.dayOfWeek}`);
      continue;
    }

    for (let week = 0; week < 4; week++) {
      const mondayOfWeek = new Date(now);
      mondayOfWeek.setDate(now.getDate() + week * 7);

      const dayOfWeek = mondayOfWeek.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      mondayOfWeek.setDate(mondayOfWeek.getDate() + daysToMonday);

      const instanceDate = getDateForDayInWeek(mondayOfWeek, targetDay);
      const [hours, minutes] = schedule.startTime.split(':');
      instanceDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      if (instanceDate <= now) continue;
      if (scheduleStart && instanceDate < scheduleStart) continue;
      if (scheduleEnd && instanceDate > scheduleEnd) continue;

      const isoDate = instanceDate.toISOString();
      if (candidateDateSet.has(isoDate)) continue;
      candidateDateSet.add(isoDate);

      instances.push({
        _type: 'classInstance',
        parentClass: { _type: 'reference', _ref: classData._id },
        date: isoDate,
        isCancelled: false,
        remainingCapacity: classData.capacity,
        bookings: []
      });
    }
  }

  return instances;
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

    // Get tenant context from headers (support both id and slug)
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');

    // Resolve tenant ID from slug if needed
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug][0]{ _id }`,
        { tenantSlug }
      );

      if (!tenant?._id) {
        return NextResponse.json(
          { error: `Invalid tenant slug: ${tenantSlug}` },
          { status: 403 }
        );
      }

      tenantId = tenant._id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required (x-tenant-id or x-tenant-slug)' },
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

    let repairSchedule = false;
    let dryRun = false;
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > 0) {
      const body = await request.json();
      repairSchedule = body.repairSchedule === true;
      dryRun = body.dryRun === true;
    }

    // Get all recurring classes for this tenant that need instances
    const classes: ClassData[] = await sanityClient.fetch(
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
    let totalInstancesDeleted = 0;
    let totalPreviewInstancesToCreate = 0;
    let totalPreviewInstancesToDelete = 0;
    const results: GenerationResultItem[] = [];
    const now = new Date();

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

      const instances = buildFutureInstances(classData, now);

      // Create instances one by one, skipping existing date-times
      if (instances.length > 0) {
       try {
         let createdCount = 0;
         let skippedExistingCount = 0;
         let deletedCount = 0;
         let previewCreateCount = 0;
         let previewDeleteCount = 0;
         let bookedMismatchesRetained = 0;
         let duplicateInstancesDeleted = 0;
         let bookedDuplicatesRetained = 0;

         const earliestDate = instances[0]?.date;
         const latestDate = instances[instances.length - 1]?.date;
         const queryStartDate = new Date(earliestDate);
         queryStartDate.setDate(queryStartDate.getDate() - 7);
         const queryEndDate = new Date(latestDate);
         queryEndDate.setDate(queryEndDate.getDate() + 7);
         const expectedDateSet = new Set(instances.map((instance) => instance.date));
         const existingInstances: ExistingInstance[] = await sanityClient.fetch(
           `*[_type == "classInstance" && parentClass._ref == $classId && date >= $startDate && date <= $endDate] {
             _id,
             date,
             "bookingCount": count(bookings)
           } | order(date asc)`,
           {
             classId: classData._id,
             startDate: queryStartDate.toISOString(),
             endDate: queryEndDate.toISOString()
           }
         );

         const existingByDate = new Map<string, ExistingInstance[]>();
         for (const existingInstance of existingInstances) {
           const matches = existingByDate.get(existingInstance.date) || [];
           matches.push(existingInstance);
           existingByDate.set(existingInstance.date, matches);
         }

         if (repairSchedule) {
           const instanceIdsToDelete = new Set<string>();

           for (const existingInstance of existingInstances) {
             if (!expectedDateSet.has(existingInstance.date)) {
               if (existingInstance.bookingCount > 0) {
                 bookedMismatchesRetained++;
               } else {
                 instanceIdsToDelete.add(existingInstance._id);
                 deletedCount++;
                 previewDeleteCount++;
               }
             }
           }

           for (const group of existingByDate.values()) {
             if (group.length <= 1) continue;

             const bookedInstances = group.filter((instance) => instance.bookingCount > 0);
             const primaryInstance = bookedInstances[0] || group[0];

             for (const instance of group) {
               if (instance._id === primaryInstance._id) continue;

               if (instance.bookingCount > 0) {
                 bookedDuplicatesRetained++;
                 continue;
               }

               if (!instanceIdsToDelete.has(instance._id)) {
                 instanceIdsToDelete.add(instance._id);
                 deletedCount++;
                 previewDeleteCount++;
                 duplicateInstancesDeleted++;
               }
             }
           }

           if (!dryRun && instanceIdsToDelete.size > 0) {
             const transaction = writeClient.transaction();
             for (const instanceId of instanceIdsToDelete) {
               transaction.delete(instanceId);
             }
             await transaction.commit();
           }
         }

         for (const instance of instances) {
           const existingForDate = existingByDate.get(instance.date) || [];

           if (existingForDate.length > 0) {
             skippedExistingCount++;
             continue;
           }

           previewCreateCount++;

           if (dryRun) {
             continue;
           }

           try {
             await writeClient.create(instance);
             createdCount++;
           } catch (createError: unknown) {
             // Skip if instance already exists (duplicate key error/race)
              const errorWithMeta = createError as CreateError;
              if (errorWithMeta?.message?.includes('already exists') || errorWithMeta?.statusCode === 409) {
                skippedExistingCount++;
                console.log(`Instance already exists, skipping...`);
              } else {
                console.log(`Error creating instance:`, errorWithMeta?.message || createError);
              }
            }
          }
          
          totalInstancesCreated += createdCount;
          totalInstancesDeleted += deletedCount;
          totalPreviewInstancesToCreate += previewCreateCount;
          totalPreviewInstancesToDelete += previewDeleteCount;
          
          results.push({
            classId: classData._id,
            className: classData.title,
            instancesCreated: createdCount,
            instancesDeleted: deletedCount,
            previewInstancesToCreate: previewCreateCount,
            previewInstancesToDelete: previewDeleteCount,
            bookedMismatchesRetained,
            duplicateInstancesDeleted,
            bookedDuplicatesRetained,
            message: dryRun
              ? `Preview (${previewCreateCount} to create${repairSchedule ? `, ${previewDeleteCount} to delete` : ''}, ${skippedExistingCount} already existed)`
              : createdCount > 0
                ? `Success (${createdCount} created${repairSchedule ? `, ${deletedCount} deleted` : ''}, ${skippedExistingCount} already existed)`
                : skippedExistingCount > 0 || deletedCount > 0
                  ? `No new instances created (${skippedExistingCount} already existed${repairSchedule ? `, ${deletedCount} deleted` : ''})`
                  : 'No future instances needed'
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
      dryRun,
      totalInstancesCreated,
      totalInstancesDeleted,
      totalPreviewInstancesToCreate,
      totalPreviewInstancesToDelete,
      classesProcessed: classes.length,
      results,
      message: dryRun
        ? `Preview complete: ${totalPreviewInstancesToCreate} would be created and ${totalPreviewInstancesToDelete} would be deleted.`
        : repairSchedule
          ? `Repair complete: created ${totalInstancesCreated} and deleted ${totalInstancesDeleted} future instances.`
          : totalInstancesCreated > 0
            ? `Successfully created ${totalInstancesCreated} new instances.`
            : 'All classes already have future instances.'
    });

  } catch (error) {
    console.error('Error generating class instances:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate class instances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
