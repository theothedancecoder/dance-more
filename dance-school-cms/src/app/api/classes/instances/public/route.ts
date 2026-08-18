import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface WeeklyScheduleItem {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

interface PublicClassInstance {
  _id: string;
  date: string;
  isCancelled: boolean;
  remainingCapacity: number;
  bookingCount?: number;
  parentClass: {
    _id: string;
    title: string;
    danceStyle?: string;
    level?: string;
    duration?: number;
    capacity?: number;
    price?: number;
    location?: string;
    recurringSchedule?: {
      weeklySchedule?: WeeklyScheduleItem[];
    };
    instructor?: {
      name?: string;
      image?: unknown;
    };
  };
}

interface PublicClass {
  _id: string;
  title: string;
  danceStyle?: string;
  level?: string;
  duration?: number;
  capacity?: number;
  price?: number;
  location?: string;
  isActive?: boolean;
  isRecurring?: boolean;
  recurringSchedule?: {
    startDate?: string;
    endDate?: string;
    weeklySchedule?: WeeklyScheduleItem[];
  };
  instructor?: {
    name?: string;
    image?: unknown;
  };
}

interface CalendarEventItem {
  _id: string;
  title: string;
  instructor: string;
  startTime: string;
  endTime: string;
  date: string;
  dayOfWeek: string;
  capacity?: number;
  booked: number;
  price?: number;
  level?: string;
  location?: string;
  isCancelled: boolean;
  remainingCapacity: number;
  isVirtual?: boolean;
}

function getDateOnlyFromIsoDateTime(isoDateTime: string) {
  return isoDateTime.split('T')[0];
}

function getDayOfWeekFromDateOnly(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function parseDateOnlyToUtc(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnlyUtcString(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDurationToTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const endHours = Math.floor(normalizedMinutes / 60);
  const endMinutes = normalizedMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

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
    
    // Get class instances within the date range for this tenant (only from active classes)
    // Also filter out instances from classes that are now inactive
    console.log('Fetching class instances for tenant:', tenant._id);
    const instances = await sanityClient.fetch(
      `*[_type == "classInstance" && date >= $startDate && date <= $endDate && parentClass->tenant._ref == $tenantId && parentClass->isActive == true] {
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
          recurringSchedule,
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

    const classes: PublicClass[] = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isActive == true] {
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

    const classesById = new Map(classes.map((classData) => [classData._id, classData]));
    const recurringClasses = classes.filter(
      (classData) => classData.isRecurring && classData.recurringSchedule?.weeklySchedule?.length
    );

    const instanceBuckets = new Map<string, CalendarEventItem[]>();
    const unmatchedOneOffEvents: CalendarEventItem[] = [];

    for (const instance of instances as PublicClassInstance[]) {
      const classData = classesById.get(instance.parentClass._id);
      const dateOnly = getDateOnlyFromIsoDateTime(instance.date);
      const dayOfWeek = getDayOfWeekFromDateOnly(dateOnly);
      const matchingSchedule = classData?.recurringSchedule?.weeklySchedule?.find(
        (schedule) => schedule.dayOfWeek?.toLowerCase() === dayOfWeek
      );
      const duration = classData?.duration || instance.parentClass.duration || 60;
      const instanceDate = new Date(instance.date);
      const fallbackStartTime = `${instanceDate.getUTCHours().toString().padStart(2, '0')}:${instanceDate.getUTCMinutes().toString().padStart(2, '0')}`;
      const startTime = matchingSchedule?.startTime || fallbackStartTime;
      const endTime = matchingSchedule?.endTime || addDurationToTime(startTime, duration);

      const event: CalendarEventItem = {
        _id: instance._id,
        title: classData?.title || instance.parentClass.title,
        instructor: classData?.instructor?.name || instance.parentClass.instructor?.name || 'TBA',
        startTime,
        endTime,
        date: dateOnly,
        dayOfWeek,
        capacity: classData?.capacity ?? instance.parentClass.capacity,
        booked: instance.bookingCount || 0,
        price: classData?.price ?? instance.parentClass.price,
        level: classData?.level || instance.parentClass.level,
        location: classData?.location || instance.parentClass.location,
        isCancelled: instance.isCancelled,
        remainingCapacity: instance.remainingCapacity
      };

      if (!classData?.isRecurring || !classData?.recurringSchedule?.weeklySchedule?.length) {
        unmatchedOneOffEvents.push(event);
        continue;
      }

      const key = `${instance.parentClass._id}|${dateOnly}|${startTime}`;
      const bucket = instanceBuckets.get(key) || [];
      bucket.push(event);
      instanceBuckets.set(key, bucket);
    }

    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);
    const requestStartDateOnly = parseDateOnlyToUtc(toDateOnlyUtcString(requestStart));
    const requestEndDateOnly = parseDateOnlyToUtc(toDateOnlyUtcString(requestEnd));
    const expectedRecurringEvents: CalendarEventItem[] = [];
    const usedInstanceIds = new Set<string>();

    for (const classData of recurringClasses) {
      const scheduleStart = classData.recurringSchedule?.startDate
        ? parseDateOnlyToUtc(classData.recurringSchedule.startDate)
        : requestStartDateOnly;
      const scheduleEnd = classData.recurringSchedule?.endDate
        ? parseDateOnlyToUtc(classData.recurringSchedule.endDate)
        : requestEndDateOnly;

      const effectiveStart = new Date(Math.max(requestStartDateOnly.getTime(), scheduleStart.getTime()));
      const effectiveEnd = new Date(Math.min(requestEndDateOnly.getTime(), scheduleEnd.getTime()));

      if (effectiveStart > effectiveEnd) {
        continue;
      }

      for (const schedule of classData.recurringSchedule?.weeklySchedule || []) {
        const scheduleDay = schedule.dayOfWeek?.toLowerCase();
        const scheduleStartTime = schedule.startTime;

        if (!scheduleDay || !scheduleStartTime) {
          continue;
        }

        const duration = classData.duration || 60;
        const scheduleEndTime = schedule.endTime || addDurationToTime(scheduleStartTime, duration);

        const firstDate = new Date(effectiveStart);
        while (firstDate <= effectiveEnd && getDayOfWeekFromDateOnly(toDateOnlyUtcString(firstDate)) !== scheduleDay) {
          firstDate.setUTCDate(firstDate.getUTCDate() + 1);
        }

        for (const cursor = new Date(firstDate); cursor <= effectiveEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
          const dateOnly = toDateOnlyUtcString(cursor);
          const key = `${classData._id}|${dateOnly}|${scheduleStartTime}`;
          const bucket = instanceBuckets.get(key) || [];
          const matchedInstance = bucket.find((candidate) => !usedInstanceIds.has(candidate._id));

          if (matchedInstance) {
            usedInstanceIds.add(matchedInstance._id);
            expectedRecurringEvents.push(matchedInstance);
          } else {
            expectedRecurringEvents.push({
              _id: `virtual-${classData._id}-${dateOnly}-${scheduleStartTime.replace(':', '')}`,
              title: classData.title,
              instructor: classData.instructor?.name || 'TBA',
              startTime: scheduleStartTime,
              endTime: scheduleEndTime,
              date: dateOnly,
              dayOfWeek: scheduleDay,
              capacity: classData.capacity || 0,
              booked: 0,
              price: classData.price || 0,
              level: classData.level || 'beginner',
              location: classData.location || '',
              isCancelled: false,
              remainingCapacity: classData.capacity || 0,
              isVirtual: true
            });
          }
        }
      }
    }

    const calendarEvents = [...expectedRecurringEvents, ...unmatchedOneOffEvents].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);
      if (dateSort !== 0) return dateSort;
      return a.startTime.localeCompare(b.startTime);
    });

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
