import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { oldClerkId, newClerkId } = await request.json();

    // Find the user with the old clerk ID
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $oldClerkId][0]`,
      { oldClerkId }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the user with the new Clerk ID
    const updatedUser = await client
      .patch(user._id)
      .set({
        clerkId: newClerkId,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'User Clerk ID updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user Clerk ID:', error);
    return NextResponse.json(
      { error: 'Failed to update user Clerk ID', details: error },
      { status: 500 }
    );
  }
}
