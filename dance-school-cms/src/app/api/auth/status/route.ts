import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
