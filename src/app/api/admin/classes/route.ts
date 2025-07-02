import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function POST(request: NextRequest) {
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
      title,
      description,
      instructorId,
      instructorName,
      capacity,
      price,
      startTime,
      endTime,
      location,
      duration,
      level,
      category
    } = body;

    // Validate required fields
    if (!title || !description || !capacity || !price || !startTime || !endTime || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate instructor requirement
    if (!instructorId && !instructorName) {
      return NextResponse.json({ error: 'Either instructor ID or instructor name is required' }, { status: 400 });
    }

    // Handle instructor creation or reference
    let finalInstructorId = instructorId;
    
    if (instructorName && !instructorId) {
      // Create new instructor
      const instructorSlug = instructorName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const instructorDoc = {
        _type: 'instructor',
        name: instructorName,
        slug: {
          _type: 'slug',
          current: instructorSlug
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const instructorResult = await writeClient.create(instructorDoc);
      finalInstructorId = instructorResult._id;
    }

    // Ensure we have an instructor ID
    if (!finalInstructorId) {
      return NextResponse.json({ error: 'Failed to create or find instructor' }, { status: 400 });
    }

    // Create slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create the class document in Sanity
    const classDoc = {
      _type: 'class',
      title,
      slug: {
        _type: 'slug',
        current: slug
      },
      description,
      danceStyle: category,
      level,
      duration,
      capacity,
      price,
      location,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      instructor: {
        _type: 'reference',
        _ref: finalInstructorId
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await writeClient.create(classDoc);

    return NextResponse.json({
      success: true,
      class: result,
      message: 'Class created successfully'
    });

  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Fetch all classes from Sanity
    const classes = await sanityClient.fetch(`
      *[_type == "class"] | order(startTime desc) {
        _id,
        title,
        slug,
        description,
        category,
        level,
        duration,
        capacity,
        price,
        location,
        startTime,
        endTime,
        instructor->{
          _id,
          name,
          email
        },
        createdAt,
        updatedAt
      }
    `);

    return NextResponse.json({
      success: true,
      classes
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}
