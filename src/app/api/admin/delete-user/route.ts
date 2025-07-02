import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the user
    const user = db.getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({ 
        message: `User ${email} not found in database`,
        success: true 
      });
    }

    // Delete the user from our database
    const success = db.deleteUser(user.id);
    
    if (success) {
      return NextResponse.json({ 
        message: `User ${email} deleted successfully from database`,
        success: true 
      });
    } else {
      return NextResponse.json({ 
        error: `Failed to delete user ${email}`,
        success: false 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}
