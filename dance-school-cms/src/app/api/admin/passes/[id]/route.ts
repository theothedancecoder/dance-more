import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

// Update pass
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      price,
      validityDays,
      classesLimit,
      isActive
    } = body;

    // Validate required fields
    if (!name || !type || !price || !validityDays) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update pass document in Sanity
    const result = await writeClient
      .patch(params.id)
      .set({
        name,
        description: description || '',
        type,
        price,
        validityDays,
        classesLimit: type === 'multi' ? classesLimit : null,
        isActive: isActive ?? true,
        updatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({
      success: true,
      pass: result,
      message: 'Pass updated successfully'
    });

  } catch (error) {
    console.error('Error updating pass:', error);
    return NextResponse.json(
      { error: 'Failed to update pass' },
      { status: 500 }
    );
  }
}

// Delete pass
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if pass is being used in any active subscriptions
    const activeSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && pass._ref == $passId && status == "active"]`,
      { passId: params.id }
    );

    if (activeSubscriptions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete pass with active subscriptions' },
        { status: 400 }
      );
    }

    // Delete pass document from Sanity
    await writeClient.delete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Pass deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting pass:', error);
    return NextResponse.json(
      { error: 'Failed to delete pass' },
      { status: 500 }
    );
  }
}
