import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';
import { z } from 'zod';

const updateNotificationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(500).optional(),
  type: z.enum(['general', 'class_update', 'payment_reminder', 'schedule_change', 'important']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  targetAudience: z.enum(['all', 'students', 'instructors', 'active_subscribers']).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional(),
});

// GET - Fetch single notification
export async function GET(
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

    // Check if user is admin for this tenant
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch notification
    const notification = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && tenant._ref == $tenantId][0] {
        _id,
        title,
        message,
        type,
        priority,
        targetAudience,
        isActive,
        expiresAt,
        actionUrl,
        actionText,
        createdAt,
        updatedAt,
        author->{
          _id,
          firstName,
          lastName,
          email
        },
        "readCount": count(readBy),
        readBy[]{
          user->{
            _id,
            firstName,
            lastName,
            email
          },
          readAt
        }
      }`,
      { notificationId: params.id, tenantId: tenant._id }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

// PATCH - Update notification
export async function PATCH(
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

    const body = await request.json();
    const validatedData = updateNotificationSchema.parse(body);

    // Get tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if user is admin for this tenant
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if notification exists and belongs to this tenant
    const existingNotification = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && tenant._ref == $tenantId][0]`,
      { notificationId: params.id, tenantId: tenant._id }
    );

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update notification
    const updatedNotification = await sanityClient
      .patch(params.id)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
      message: 'Notification updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notification
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

    // Check if user is admin for this tenant
    const user = await sanityClient.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId: tenant._id }
    );

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if notification exists and belongs to this tenant
    const existingNotification = await sanityClient.fetch(
      `*[_type == "notification" && _id == $notificationId && tenant._ref == $tenantId][0]`,
      { notificationId: params.id, tenantId: tenant._id }
    );

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete notification
    await sanityClient.delete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
