import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, password } = await request.json();

    // Create user in Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      emailAddress: [email],
      username: email.split('@')[0], // Use email prefix as username
      firstName,
      lastName,
      password,
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Clerk user created successfully',
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });

  } catch (error) {
    console.error('Error creating Clerk user:', error);
    return NextResponse.json(
      { error: 'Failed to create Clerk user', details: error },
      { status: 500 }
    );
  }
}
