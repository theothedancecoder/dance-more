import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    // Create a test tenant
    const tenantDoc = {
      _type: 'tenant',
      schoolName: 'DanceZone Studio',
      slug: {
        _type: 'slug',
        current: 'dancezone'
      },
      status: 'active',
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#F59E0B'
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        allowPublicRegistration: true,
        requireApproval: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createdTenant = await client.create(tenantDoc);
    console.log('Created tenant:', createdTenant._id);

    // Create a test admin user
    const userDoc = {
      _type: 'user',
      clerkId: 'test_admin_user',
      email: 'admin@dancecity.com',
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      phone: '+1234567890',
      tenant: {
        _type: 'reference',
        _ref: createdTenant._id,
      },
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdUser = await client.create(userDoc);
    console.log('Created admin user:', createdUser._id);

    // Create a test student user
    const studentDoc = {
      _type: 'user',
      clerkId: 'test_student_user',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'User',
      name: 'Student User',
      phone: '+1234567891',
      tenant: {
        _type: 'reference',
        _ref: createdTenant._id,
      },
      role: 'student',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdStudent = await client.create(studentDoc);
    console.log('Created student user:', createdStudent._id);

    // Create a test instructor
    const instructorDoc = {
      _type: 'instructor',
      name: 'Test Instructor',
      email: 'instructor@dancecity.com',
      phone: '+1234567892',
      bio: 'Experienced dance instructor',
      specialties: ['Salsa', 'Bachata'],
      tenant: {
        _type: 'reference',
        _ref: createdTenant._id,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdInstructor = await client.create(instructorDoc);
    console.log('Created instructor:', createdInstructor._id);

    // Create a test class
    const classDoc = {
      _type: 'class',
      title: 'Beginner Salsa',
      description: 'Learn the basics of salsa dancing',
      instructor: {
        _type: 'reference',
        _ref: createdInstructor._id,
      },
      tenant: {
        _type: 'reference',
        _ref: createdTenant._id,
      },
      schedule: {
        dayOfWeek: 1, // Monday
        startTime: '19:00',
        endTime: '20:00',
        timezone: 'America/New_York'
      },
      pricing: {
        dropInPrice: 25,
        currency: 'USD'
      },
      capacity: 20,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdClass = await client.create(classDoc);
    console.log('Created class:', createdClass._id);

    return NextResponse.json({
      success: true,
      message: 'Test tenant setup completed successfully',
      data: {
        tenant: createdTenant,
        adminUser: createdUser,
        studentUser: createdStudent,
        instructor: createdInstructor,
        class: createdClass
      }
    });

  } catch (error) {
    console.error('Error setting up test tenant:', error);
    return NextResponse.json(
      { error: 'Failed to setup test tenant', details: error },
      { status: 500 }
    );
  }
}
