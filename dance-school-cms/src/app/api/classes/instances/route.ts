import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Get class instances for calendar view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get class instances within the date range
    const instances = await sanityClient.fetch(
      `*[_type == "classInstance" && date >= $startDate && date <= $endDate] {
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
        endDate: new Date(endDate).toISOString()
      }
    );

    // Transform data for calendar display
    const calendarEvents = instances.map((instance: any) => ({
      id: instance._id,
      title: instance.parentClass.title,
      start: instance.date,
      end: new Date(new Date(instance.date).getTime() + instance.parentClass.duration * 60000).toISOString(),
      extendedProps: {
        classId: instance.parentClass._id,
        danceStyle: instance.parentClass.danceStyle,
        level: instance.parentClass.level,
        instructor: instance.parentClass.instructor?.name,
        location: instance.parentClass.location,
        capacity: instance.parentClass.capacity,
        remainingCapacity: instance.remainingCapacity,
        bookingCount: instance.bookingCount,
        price: instance.parentClass.price,
        isCancelled: instance.isCancelled,
        isBookable: !instance.isCancelled && instance.remainingCapacity > 0,
      },
      backgroundColor: instance.isCancelled ? '#ef4444' : 
                      instance.remainingCapacity === 0 ? '#f59e0b' : '#10b981',
      borderColor: instance.isCancelled ? '#dc2626' : 
                   instance.remainingCapacity === 0 ? '#d97706' : '#059669',
    }));

    return NextResponse.json({ 
      instances: calendarEvents,
      total: instances.length 
    });
  } catch (error) {
    console.error('Error fetching class instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class instances' },
      { status: 500 }
    );
  }
}
