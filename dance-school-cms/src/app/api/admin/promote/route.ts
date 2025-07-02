import { NextRequest, NextResponse } from 'next/server';
import { promoteToAdmin } from '@/lib/admin-utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const success = await promoteToAdmin(email);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `User ${email} has been promoted to admin successfully`
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to promote user to admin' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error promoting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
