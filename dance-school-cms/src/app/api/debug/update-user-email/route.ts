import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { clerkId, newEmail } = await request.json();

    // Find the user with the clerk ID
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]`,
      { clerkId }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the user with the new email
    const updatedUser = await client
      .patch(user._id)
      .set({
        email: newEmail,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'User email updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user email:', error);
    return NextResponse.json(
      { error: 'Failed to update user email', details: error },
      { status: 500 }
    );
  }
}
