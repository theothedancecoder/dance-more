import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';
import { z } from 'zod';

const createNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.enum(['general', 'class_update', 'payment_reminder', 'schedule_change', 'important']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  targetAudience: z.enum(['all', 'students', 'instructors', 'active_subscribers']),
  expiresAt: z.string().datetime().optional(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional(),
});

// GET - Fetch notifications for admin
export async function GET(request: NextRequest) {
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

    // Fetch notifications for this tenant
    const notifications = await sanityClient.fetch(
      `*[_type == "notification" && tenant._ref == $tenantId] | order(createdAt desc) {
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
        "readCount": count(readBy)
      }`,
      { tenantId: tenant._id }
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
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
    const validatedData = createNotificationSchema.parse(body);

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

    // Create notification
    const notification = await sanityClient.create({
      _type: 'notification',
      title: validatedData.title,
      message: validatedData.message,
      type: validatedData.type,
      priority: validatedData.priority,
      targetAudience: validatedData.targetAudience,
      tenant: {
        _type: 'reference',
        _ref: tenant._id,
      },
      author: {
        _type: 'reference',
        _ref: user._id,
      },
      isActive: true,
      expiresAt: validatedData.expiresAt || null,
      actionUrl: validatedData.actionUrl || null,
      actionText: validatedData.actionText || null,
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
