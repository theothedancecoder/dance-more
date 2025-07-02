import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

// Cancel a class instance
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { classInstanceId, cancellationReason, cancelEntireSeries } = await request.json();

    if (cancelEntireSeries) {
      // Cancel entire series - get all instances of the parent class
      const classInstance = await sanityClient.fetch(
        `*[_type == "classInstance" && _id == $classInstanceId][0] {
          parentClass->{_id}
        }`,
        { classInstanceId }
      );

      if (!classInstance) {
        return NextResponse.json(
          { error: 'Class instance not found' },
          { status: 404 }
        );
      }

      // Get all future instances of this class
      const now = new Date();
      const futureInstances = await sanityClient.fetch(
        `*[_type == "classInstance" && parentClass._ref == $parentClassId && date >= $now && !isCancelled] {
          _id,
          bookings
        }`,
        { 
          parentClassId: classInstance.parentClass._id,
          now: now.toISOString()
        }
      );

      // Cancel all future instances
      const cancelPromises = futureInstances.map((instance: any) =>
        writeClient
          .patch(instance._id)
          .set({
            isCancelled: true,
            cancellationReason: cancellationReason || 'Series cancelled by admin',
          })
          .commit()
      );

      await Promise.all(cancelPromises);

      // TODO: Send notifications to all booked students
      // This would require implementing email/notification service

      return NextResponse.json({
        success: true,
        cancelledInstances: futureInstances.length,
        message: `Cancelled ${futureInstances.length} future class instances`,
      });
    } else {
      // Cancel single instance
      const classInstance = await sanityClient.fetch(
        `*[_type == "classInstance" && _id == $classInstanceId][0] {
          _id,
          isCancelled,
          bookings
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
          { error: 'Class is already cancelled' },
          { status: 400 }
        );
      }

      // Cancel the instance
      await writeClient
        .patch(classInstanceId)
        .set({
          isCancelled: true,
          cancellationReason: cancellationReason || 'Cancelled by admin',
        })
        .commit();

      // TODO: Refund clips for clipcard bookings
      // TODO: Send notifications to booked students

      return NextResponse.json({
        success: true,
        message: 'Class instance cancelled successfully',
        affectedBookings: classInstance.bookings?.length || 0,
      });
    }
  } catch (error) {
    console.error('Error cancelling class:', error);
    return NextResponse.json(
      { error: 'Failed to cancel class' },
      { status: 500 }
    );
  }
}
