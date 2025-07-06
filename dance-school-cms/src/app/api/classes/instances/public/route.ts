import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Public endpoint for class instances (for calendar view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tenantSlug = searchParams.get('tenantSlug');

    if (!startDate || !endDate || !tenantSlug) {
      return NextResponse.json(
        { error: 'Start date, end date, and tenant slug are required' },
        { status: 400 }
      );
    }

    // Get tenant by slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
      { tenantSlug }
    );
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 404 }
      );
    }
    
    // Get class instances within the date range for this tenant
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

    // Transform data for calendar display
    const calendarEvents = instances.map((instance: any) => ({
      _id: instance._id,
      title: instance.parentClass.title,
      instructor: instance.parentClass.instructor?.name || 'TBA',
      startTime: new Date(instance.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      endTime: new Date(new Date(instance.date).getTime() + instance.parentClass.duration * 60000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      date: instance.date.split('T')[0], // Just the date part
      capacity: instance.parentClass.capacity,
      booked: instance.bookingCount || 0,
      price: instance.parentClass.price,
      level: instance.parentClass.level,
      location: instance.parentClass.location,
      isCancelled: instance.isCancelled,
      remainingCapacity: instance.remainingCapacity
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
