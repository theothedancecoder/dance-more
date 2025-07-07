import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';

// Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant slug from header
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    // First get the tenant ID
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id
      }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get class instances with user's bookings for this specific tenant
    const bookings = await sanityClient.fetch(
      `*[_type == "classInstance" && $userId in bookings[].student._ref && parentClass->tenant._ref == $tenantId] {
        _id,
        date,
        isCancelled,
        parentClass->{
          title,
          instructor->{name},
          danceStyle,
          location,
          tenant->{
            _id,
            slug
          }
        },
        "userBooking": bookings[student._ref == $userId][0]
      } | order(date asc)`,
      { userId, tenantId: tenant._id }
    );

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// Book a class
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { classInstanceId } = await request.json();

    // Get class instance
    const classInstance = await sanityClient.fetch(
      `*[_type == "classInstance" && _id == $classInstanceId][0] {
        _id,
        _rev,
        date,
        isCancelled,
        remainingCapacity,
        bookings,
        parentClass->{capacity}
      }`,
      { classInstanceId }
    );

    if (!classInstance) {
      return NextResponse.json(
        { error: 'Class instance not found' },
        { status: 404 }
      );
    }

    if (classInstance.isCancelled) {
      return NextResponse.json(
        { error: 'Class is cancelled' },
        { status: 400 }
      );
    }

    if (classInstance.remainingCapacity <= 0) {
      return NextResponse.json(
        { error: 'Class is full' },
        { status: 400 }
      );
    }

    // Check if user already booked this class
    const existingBooking = classInstance.bookings?.find(
      (booking: any) => booking.student._ref === userId
    );

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Already booked this class' },
        { status: 400 }
      );
    }

    // Check user's active subscriptions
    const now = new Date();
    const activeSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true && endDate > $now] | order(_createdAt desc)`,
      { userId, now: now.toISOString() }
    );

    if (activeSubscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription or clipcard' },
        { status: 400 }
      );
    }

    // Find a valid subscription to use
    let subscriptionToUse = null;
    let bookingType = '';

    // First try to use monthly pass (unlimited)
    const monthlyPass = activeSubscriptions.find((sub: any) => sub.type === 'monthly');
    if (monthlyPass) {
      subscriptionToUse = monthlyPass;
      bookingType = 'monthly';
    } else {
      // Try to use any pass with remaining classes (single, multi-pass, clipcard)
      const validPass = activeSubscriptions.find(
        (sub: any) => ['single', 'multi-pass', 'clipcard'].includes(sub.type) && sub.remainingClips > 0
      );
      if (validPass) {
        subscriptionToUse = validPass;
        bookingType = validPass.type;
      }
    }

    if (!subscriptionToUse) {
      return NextResponse.json(
        { error: 'No valid subscription or clips remaining' },
        { status: 400 }
      );
    }

    // Create booking
    const newBooking = {
      student: {
        _type: 'reference',
        _ref: userId,
      },
      bookingType,
      bookingTime: now.toISOString(),
    };

    // Update class instance with new booking
    const updatedBookings = [...(classInstance.bookings || []), newBooking];
    const newRemainingCapacity = classInstance.remainingCapacity - 1;

    await writeClient
      .patch(classInstanceId)
      .set({
        bookings: updatedBookings,
        remainingCapacity: newRemainingCapacity,
      })
      .commit();

    // If using a pass with limited classes, decrease remaining clips
    if (['single', 'multi-pass', 'clipcard'].includes(bookingType)) {
      await writeClient
        .patch(subscriptionToUse._id)
        .set({
          remainingClips: subscriptionToUse.remainingClips - 1,
        })
        .commit();
    }

    return NextResponse.json({
      success: true,
      booking: newBooking,
      remainingCapacity: newRemainingCapacity,
    });
  } catch (error) {
    console.error('Error booking class:', error);
    return NextResponse.json(
      { error: 'Failed to book class' },
      { status: 500 }
    );
  }
}
