import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Public endpoint for class instances (for calendar view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tenantSlug = searchParams.get('tenantSlug');

    console.log('API called with params:', { startDate, endDate, tenantSlug });

    if (!startDate || !endDate || !tenantSlug) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { error: 'Start date, end date, and tenant slug are required' },
        { status: 400 }
      );
    }

    // Get tenant by slug
    console.log('Fetching tenant with slug:', tenantSlug);
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
      { tenantSlug }
    );
    
    console.log('Found tenant:', tenant ? { _id: tenant._id, schoolName: tenant.schoolName } : 'null');
    
    if (!tenant) {
      console.log('Tenant not found or inactive');
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 404 }
      );
    }
    
    // Get class instances within the date range for this tenant
    console.log('Fetching class instances for tenant:', tenant._id);
    const instances = await sanityClient.fetch(
      `*[_type == "classInstance" && date >= $startDate && date <= $endDate && parentClass->tenant._ref == $tenantId] {
        _id,
        date,
        isCancelled,
        remainingCapacity,
        "bookingCount": count(bookings),
        parentClass->{
          _id,
          title,
          danceStyle,
          level,
          duration,
          capacity,
          price,
          location,
          instructor->{
            name,
            image
          }
        }
      } | order(date asc)`,
      { 
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        tenantId: tenant._id
      }
    );

    console.log('Found class instances:', instances.length);

    // Transform instances to calendar events
    let calendarEvents = instances.map((instance: any) => ({
      _id: instance._id,
      title: instance.parentClass.title,
      instructor: instance.parentClass.instructor?.name || 'TBA',
      startTime: new Date(instance.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      endTime: new Date(new Date(instance.date).getTime() + (instance.parentClass.duration || 60) * 60000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      date: instance.date, // Keep the full ISO date for proper parsing
      capacity: instance.parentClass.capacity,
      booked: instance.bookingCount || 0,
      price: instance.parentClass.price,
      level: instance.parentClass.level,
      location: instance.parentClass.location,
      isCancelled: instance.isCancelled,
      remainingCapacity: instance.remainingCapacity
    }));

    // If no instances found, create virtual instances from recurring classes
    if (calendarEvents.length === 0) {
      console.log('No instances found, fetching recurring classes for tenant:', tenant._id);
      
      const recurringClasses = await sanityClient.fetch(
        `*[_type == "class" && tenant._ref == $tenantId] {
          _id,
          title,
          danceStyle,
          level,
          duration,
          capacity,
          price,
          location,
          isActive,
          isRecurring,
          recurringSchedule,
          instructor->{
            name,
            image
          }
        }`,
        { tenantId: tenant._id }
      );
      
      console.log('Found classes:', recurringClasses.length);
      console.log('Classes data:', JSON.stringify(recurringClasses, null, 2));

      // Generate virtual instances for the next 4 weeks
      const virtualInstances = [];
      const requestStartDate = new Date(startDate);
      const requestEndDate = new Date(endDate);
      
      for (const classData of recurringClasses) {
        // Skip inactive classes
        if (classData.isActive === false) {
          console.log('Skipping inactive class:', classData.title);
          continue;
        }

        console.log('Processing class:', classData.title, 'isRecurring:', classData.isRecurring);
        
        // Handle both recurring and non-recurring classes
        if (classData.isRecurring && classData.recurringSchedule?.weeklySchedule) {
          console.log('Processing recurring class with schedule:', classData.recurringSchedule.weeklySchedule);
          
          for (const schedule of classData.recurringSchedule.weeklySchedule) {
            console.log('Processing schedule:', schedule);
            
            // Generate instances for each week in the date range
            const classStartDate = classData.recurringSchedule?.startDate ? new Date(classData.recurringSchedule.startDate) : new Date();
            const classEndDate = classData.recurringSchedule?.endDate ? new Date(classData.recurringSchedule.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            
            // Start from the later of request start date or class start date
            const effectiveStartDate = new Date(Math.max(requestStartDate.getTime(), classStartDate.getTime()));
            const effectiveEndDate = new Date(Math.min(requestEndDate.getTime(), classEndDate.getTime()));
            
            // If there's no overlap, skip this class
            if (effectiveStartDate > effectiveEndDate) {
              console.log('No overlap between request range and class schedule for:', classData.title);
              continue;
            }
            
            // Find the target day of the week
            const dayMap = {
              'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
              'friday': 5, 'saturday': 6, 'sunday': 0
            };
            
            const targetDay = dayMap[schedule.dayOfWeek?.toLowerCase() as keyof typeof dayMap];
            if (targetDay === undefined) {
              console.log('Invalid day of week:', schedule.dayOfWeek);
              continue;
            }
            
            // Generate instances week by week within the effective date range
            let currentWeekStart = new Date(effectiveStartDate);
            // Adjust to the start of the week (Monday)
            const currentDayOfWeek = currentWeekStart.getDay();
            const daysToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
            currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
            
            while (currentWeekStart <= effectiveEndDate) {
              // Calculate the date for the target day of this week
              const instanceDate = new Date(currentWeekStart);
              
              // Calculate days to add to get to the target day
              let daysToAdd = targetDay - 1; // Convert to 0-based (Monday = 0)
              if (targetDay === 0) { // Sunday
                daysToAdd = 6;
              }
              
              instanceDate.setDate(currentWeekStart.getDate() + daysToAdd);
              
              // Set the time
              if (schedule.startTime) {
                const [hours, minutes] = schedule.startTime.split(':');
                instanceDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              } else {
                console.log('No start time for schedule:', schedule);
                continue;
              }
              
              // Only include if within all the required ranges
              // Use date-only comparison to avoid timezone issues
              const instanceDateOnly = new Date(instanceDate.getFullYear(), instanceDate.getMonth(), instanceDate.getDate());
              const requestStartDateOnly = new Date(requestStartDate.getFullYear(), requestStartDate.getMonth(), requestStartDate.getDate());
              const requestEndDateOnly = new Date(requestEndDate.getFullYear(), requestEndDate.getMonth(), requestEndDate.getDate());
              const classStartDateOnly = new Date(classStartDate.getFullYear(), classStartDate.getMonth(), classStartDate.getDate());
              const classEndDateOnly = new Date(classEndDate.getFullYear(), classEndDate.getMonth(), classEndDate.getDate());
              
              if (instanceDateOnly >= requestStartDateOnly && instanceDateOnly <= requestEndDateOnly && 
                  instanceDateOnly >= classStartDateOnly && instanceDateOnly <= classEndDateOnly) {
                console.log('Adding virtual instance for:', classData.title, 'on', instanceDate.toISOString());
                
                virtualInstances.push({
                  _id: `virtual-${classData._id}-${instanceDate.getTime()}`,
                  title: classData.title,
                  instructor: classData.instructor?.name || 'TBA',
                  startTime: instanceDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  }),
                  endTime: new Date(instanceDate.getTime() + (classData.duration || 60) * 60000).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  }),
                  date: instanceDate.toISOString().split('T')[0],
                  capacity: classData.capacity || 10,
                  booked: 0,
                  price: classData.price || 0,
                  level: classData.level || 'beginner',
                  location: classData.location || '',
                  isCancelled: false,
                  remainingCapacity: classData.capacity || 10,
                  isVirtual: true // Flag to indicate this is a virtual instance
                });
              } else {
                console.log('Instance date', instanceDateOnly.toISOString(), 'not in range:', requestStartDateOnly.toISOString(), 'to', requestEndDateOnly.toISOString());
              }
              
              // Move to next week
              currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
          }
        } else {
          // For non-recurring classes or classes without proper schedule, create a sample instance
          console.log('Creating sample instance for non-recurring class:', classData.title);
          
          const sampleDate = new Date(requestStartDate);
          sampleDate.setDate(sampleDate.getDate() + 1); // Tomorrow
          sampleDate.setHours(18, 0, 0, 0); // 6 PM
          
          if (sampleDate <= requestEndDate) {
            virtualInstances.push({
              _id: `virtual-${classData._id}-${sampleDate.getTime()}`,
              title: classData.title,
              instructor: classData.instructor?.name || 'TBA',
              startTime: '18:00',
              endTime: '19:00',
              date: sampleDate.toISOString().split('T')[0],
              capacity: classData.capacity || 10,
              booked: 0,
              price: classData.price || 0,
              level: classData.level || 'beginner',
              location: classData.location || '',
              isCancelled: false,
              remainingCapacity: classData.capacity || 10,
              isVirtual: true
            });
          }
        }
      }
      
      console.log('Generated virtual instances:', virtualInstances.length);
      calendarEvents = virtualInstances;
    }

    console.log('Returning calendar events:', calendarEvents.length);
    return NextResponse.json({ 
      instances: calendarEvents,
      total: calendarEvents.length 
    });
  } catch (error) {
    console.error('Error fetching class instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class instances', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
