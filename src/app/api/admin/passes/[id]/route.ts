import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

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

    const { isActive } = await request.json();
    const passId = params.id;

    if (!passId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Pass ID and isActive status are required' },
        { status: 400 }
      );
    }

    // Update pass status in Sanity
    const updatedPass = await writeClient
      .patch(passId)
      .set({
        isActive: isActive,
        _updatedAt: new Date().toISOString()
      })
      .commit();

    console.log(`Pass ${passId} ${isActive ? 'activated' : 'deactivated'} by admin ${userId}`);

    return NextResponse.json({
      success: true,
      pass: updatedPass,
      message: `Pass ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating pass status:', error);
    return NextResponse.json(
      { error: 'Failed to update pass status' },
      { status: 500 }
    );
  }
}
