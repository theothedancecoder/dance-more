import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // First, create the user
    const user = db.createUser({
      email,
      name: email.split('@')[0], // Use part before @ as name
      role: UserRole.ADMIN // Create directly as admin
    });
    
    if (user) {
      return NextResponse.json({ 
        message: `User ${email} created and promoted to admin successfully`,
        success: true,
        user
      });
    } else {
      return NextResponse.json({ 
        error: `Failed to create admin user ${email}`,
        success: false 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}
