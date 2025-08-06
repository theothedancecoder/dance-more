import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const classId = resolvedParams.id;

    // Get tenant from headers
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    // If no tenant ID from middleware, try to get it from tenant slug
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
        { tenantSlug }
      );
      if (tenant) {
        tenantId = tenant._id;
      }
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Check if user is admin
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId, tenantId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      const sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
        { userId, tenantId }
      );
      userIsAdmin = !!sanityUser;
    }
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch the specific class
    const query = `*[_type == "class" && _id == $classId && tenant._ref == $tenantId][0] {
      _id,
      title,
      slug,
      description,
      danceStyle,
      level,
      duration,
      capacity,
      price,
      location,
      isRecurring,
      singleClassDate,
      recurringSchedule,
      isActive,
      instructor->{
        _id,
        name,
        email
      },
      tenant->{
        _id,
        schoolName,
        "subdomain": subdomain.current
      },
      _createdAt,
      _updatedAt
    }`;

    const classData = await sanityClient.fetch(query, { classId, tenantId });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      class: classData
    });

  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const classId = resolvedParams.id;
    const body = await request.json();
    const {
      title,
      description,
      instructorId,
      instructorName,
      capacity,
      price,
      location,
      duration,
      level,
      category,
      isRecurring,
      singleClassDate,
      recurringSchedule,
      isActive
    } = body;

    // Get tenant from headers
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    // If no tenant ID from middleware, try to get it from tenant slug
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
        { tenantSlug }
      );
      if (tenant) {
        tenantId = tenant._id;
      }
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Check if user is admin
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId, tenantId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      const sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
        { userId, tenantId }
      );
      userIsAdmin = !!sanityUser;
    }
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Validate required fields
    if (!title || !description || !capacity || !price || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate class timing
    if (!isRecurring && !singleClassDate) {
      return NextResponse.json({ error: 'Single classes must have a date and time' }, { status: 400 });
    }

    if (isRecurring && (!recurringSchedule?.startDate || !recurringSchedule?.endDate || !recurringSchedule?.weeklySchedule?.length)) {
      return NextResponse.json({ error: 'Recurring classes must have start date, end date, and weekly schedule' }, { status: 400 });
    }

    // Check if class exists and belongs to tenant
    const existingClass = await sanityClient.fetch(
      `*[_type == "class" && _id == $classId && tenant._ref == $tenantId][0]`,
      { classId, tenantId }
    );

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
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

    // Prepare update data
    const updateData: any = {
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
      instructor: {
        _type: 'reference',
        _ref: finalInstructorId
      },
      isRecurring: !!isRecurring,
      isActive: isActive !== undefined ? isActive : true,
      _updatedAt: new Date().toISOString()
    };

    // Add recurring or single class specific fields
    if (isRecurring) {
      updateData.recurringSchedule = recurringSchedule;
      // Remove single class date if switching to recurring
      updateData.singleClassDate = null;
    } else {
      updateData.singleClassDate = new Date(singleClassDate).toISOString();
      // Remove recurring schedule if switching to single class
      updateData.recurringSchedule = null;
    }

    // Update the class in Sanity
    const result = await writeClient
      .patch(classId)
      .set(updateData)
      .commit();

    return NextResponse.json({
      success: true,
      class: result,
      message: 'Class updated successfully'
    });

  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const classId = resolvedParams.id;

    // Get tenant from headers
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    // If no tenant ID from middleware, try to get it from tenant slug
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
        { tenantSlug }
      );
      if (tenant) {
        tenantId = tenant._id;
      }
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Check if user is admin
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId, tenantId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      const sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
        { userId, tenantId }
      );
      userIsAdmin = !!sanityUser;
    }
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if class exists and belongs to tenant
    const existingClass = await sanityClient.fetch(
      `*[_type == "class" && _id == $classId && tenant._ref == $tenantId][0]`,
      { classId, tenantId }
    );

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Instead of deleting, mark as inactive
    const result = await writeClient
      .patch(classId)
      .set({ 
        isActive: false,
        _updatedAt: new Date().toISOString()
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Class deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
