import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';

// POST - Mark notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = request.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current user
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if notification exists and is accessible to this user
    const notification = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && tenant._ref == $tenantId][0]`,
      { notificationId: params.id, tenantId: tenant._id }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check if user already marked this as read
    const isAlreadyRead = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && $userId in readBy[].user._ref][0]`,
      { notificationId: params.id, userId: user._id }
    );

    if (isAlreadyRead) {
      return NextResponse.json({
        success: true,
        message: 'Notification already marked as read',
      });
    }

    // Add user to readBy array
    await sanityClient
      .patch(params.id)
      .setIfMissing({ readBy: [] })
      .append('readBy', [
        {
          user: {
            _type: 'reference',
            _ref: user._id,
          },
          readAt: new Date().toISOString(),
        },
      ])
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

// DELETE - Mark notification as unread (remove from readBy)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = request.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current user
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current notification with readBy array
    const notification = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && tenant._ref == $tenantId][0] {
        _id,
        readBy[]
      }`,
      { notificationId: params.id, tenantId: tenant._id }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Filter out the current user from readBy array
    const updatedReadBy = (notification.readBy || []).filter(
      (read: any) => read.user._ref !== user._id
    );

    // Update the notification
    await sanityClient
      .patch(params.id)
      .set({ readBy: updatedReadBy })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Notification marked as unread',
    });
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as unread' },
      { status: 500 }
    );
  }
}
