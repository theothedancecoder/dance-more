import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

// Helper function to generate class instances for recurring classes
function getDateForDayOfWeek(baseDate: Date, dayOfWeek: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayOfWeek.toLowerCase());
  const currentDay = baseDate.getDay();
  
  const date = new Date(baseDate);
  const diff = targetDay - currentDay;
  date.setDate(date.getDate() + diff);
  
  return date;
}

async function generateClassInstances(classId: string, classData: any) {
  const { recurringSchedule, capacity } = classData;
  const { startDate, endDate, weeklySchedule } = recurringSchedule;
  const instances = [];

  // Generate instances for each week between start and end date
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 7)) {
    for (const schedule of weeklySchedule) {
      const instanceDate = getDateForDayOfWeek(date, schedule.dayOfWeek);
      
      if (instanceDate >= start && instanceDate <= end) {
        const [startHour, startMinute] = schedule.startTime.split(':');
        instanceDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

        instances.push({
          _type: 'classInstance',
          parentClass: {
            _type: 'reference',
            _ref: classId,
          },
          tenant: {
            _type: 'reference',
            _ref: classData.tenant._ref,
          },
          date: instanceDate.toISOString(),
          isCancelled: false,
          bookings: [],
          remainingCapacity: capacity,
        });
      }
    }
  }

  // Create all instances in Sanity
  if (instances.length > 0) {
    const createdInstances = await Promise.all(
      instances.map(instance => writeClient.create(instance))
    );
    return createdInstances;
  }
  
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin - with fallback to Sanity-only check
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      // We'll check admin status after getting tenant context
    }

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
      recurringSchedule
    } = body;

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

    // Get tenant from headers or URL parameter
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

    // Complete admin check with fallback if Clerk failed
    if (!userIsAdmin) {
      try {
        userIsAdmin = await isAdmin(userId, tenantId);
      } catch (error) {
        console.warn('Clerk admin check failed, falling back to Sanity check:', error);
        // Fallback: Check admin status directly in Sanity
        const sanityUser = await sanityClient.fetch(
          `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
          { userId, tenantId }
        );
        userIsAdmin = !!sanityUser;
      }
    }
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Validate tenant exists and is active
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && status == "active"][0]`,
      { tenantId }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 403 }
      );
    }

    // Create the class document in Sanity
    const classDoc: any = {
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
      instructor: {
        _type: 'reference',
        _ref: finalInstructorId
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id
      },
      isRecurring: !!isRecurring,
      isActive: true
    };

    // Add recurring or single class specific fields
    if (isRecurring) {
      classDoc.recurringSchedule = recurringSchedule;
    } else {
      classDoc.singleClassDate = new Date(singleClassDate).toISOString();
    }

    const result = await writeClient.create(classDoc);

    // Generate instances for both recurring and single classes
    let generatedInstances = [];
    if (isRecurring) {
      try {
        generatedInstances = await generateClassInstances(result._id, { recurringSchedule, capacity });
      } catch (instanceError) {
        console.error('Error generating instances:', instanceError);
        // Don't fail the class creation if instance generation fails
      }
    } else {
      // Create a single instance for non-recurring classes
      try {
        const singleInstance = {
          _type: 'classInstance',
          parentClass: {
            _type: 'reference',
            _ref: result._id,
          },
          tenant: {
            _type: 'reference',
            _ref: tenant._id,
          },
          date: new Date(singleClassDate).toISOString(),
          isCancelled: false,
          bookings: [],
          remainingCapacity: capacity,
        };
        
        const createdInstance = await writeClient.create(singleInstance);
        generatedInstances = [createdInstance];
      } catch (instanceError) {
        console.error('Error creating single class instance:', instanceError);
        // Don't fail the class creation if instance generation fails
      }
    }

    return NextResponse.json({
      success: true,
      class: result,
      instancesCreated: generatedInstances.length,
      message: isRecurring 
        ? `Recurring class created successfully with ${generatedInstances.length} instances generated`
        : `Single class created successfully with ${generatedInstances.length} instance generated`
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

    // Get tenant from headers or URL parameter
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

    // Check if user is admin - with fallback to Sanity-only check
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId, tenantId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      // Fallback: Check admin status directly in Sanity
      const sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
        { userId, tenantId }
      );
      userIsAdmin = !!sanityUser;
    }
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Validate tenant exists and is active
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && status == "active"][0]`,
      { tenantId }
    );
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 403 }
      );
    }
    
    // Fetch tenant-specific classes from Sanity with mandatory tenant filter
    const query = `*[_type == "class" && tenant._ref == $tenantId] | order(_createdAt desc) {
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

    const classes = await sanityClient.fetch(query, { tenantId });

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
