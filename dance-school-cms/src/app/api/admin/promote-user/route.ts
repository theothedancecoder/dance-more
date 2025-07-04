import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/sanity';
import { z } from 'zod';

const promoteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['student', 'instructor', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, instructor, or admin' })
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth.protect();
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant info from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id');
    const currentUserRole = request.headers.get('x-user-role');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Only admins can promote users
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can promote users' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = promoteUserSchema.parse(body);

    // Verify the target user belongs to the same tenant
    const targetUser = await client.fetch(
      `*[_type == "user" && _id == $userId && tenant._ref == $tenantId][0]`,
      { userId, tenantId }
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found in this school' },
        { status: 404 }
      );
    }

    // Prevent demoting the last admin
    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await client.fetch(
        `count(*[_type == "user" && tenant._ref == $tenantId && role == "admin" && isActive == true])`,
        { tenantId }
      );

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin. Promote another user to admin first.' },
          { status: 400 }
        );
      }
    }

    // Update user role
    const updatedUser = await client
      .patch(userId)
      .set({
        role,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });

  } catch (error) {
    console.error('User promotion error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
