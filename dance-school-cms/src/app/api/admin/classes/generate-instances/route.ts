import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, writeClient } from '@/lib/sanity';

// Generate class instances for recurring classes
export async function POST(request: NextRequest) {
  try {
    const { classId } = await request.json();

    // Fetch the class details
    const classData = await sanityClient.fetch(
      `*[_type == "class" && _id == $classId][0]`,
      { classId }
    );

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    if (!classData.isRecurring || !classData.recurringSchedule) {
      return NextResponse.json(
        { error: 'Class is not a recurring class' },
        { status: 400 }
      );
    }

    const { startDate, endDate, weeklySchedule } = classData.recurringSchedule;
    const instances = [];

    // Generate instances for each week between start and end date
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
              _ref: classId,
            },
            date: instanceDate.toISOString(),
            isCancelled: false,
            bookings: [],
            remainingCapacity: classData.capacity,
          });
        }
      }
    }

    // Create all instances in Sanity
    const createdInstances = await Promise.all(
      instances.map(instance => writeClient.create(instance))
    );

    return NextResponse.json({
      success: true,
      instancesCreated: createdInstances.length,
      instances: createdInstances,
    });
  } catch (error) {
    console.error('Error generating class instances:', error);
    return NextResponse.json(
      { error: 'Failed to generate class instances' },
      { status: 500 }
    );
  }
}

function getDateForDayOfWeek(baseDate: Date, dayOfWeek: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  const currentDay = baseDate.getDay();
  
  const date = new Date(baseDate);
  const diff = targetDay - currentDay;
  date.setDate(date.getDate() + diff);
  
  return date;
}
