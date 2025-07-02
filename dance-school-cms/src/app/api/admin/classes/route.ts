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

    // If it's a recurring class, automatically generate instances
    let generatedInstances = [];
    if (isRecurring) {
      try {
        generatedInstances = await generateClassInstances(result._id, { recurringSchedule, capacity });
      } catch (instanceError) {
        console.error('Error generating instances:', instanceError);
        // Don't fail the class creation if instance generation fails
      }
    }

    return NextResponse.json({
      success: true,
      class: result,
      instancesCreated: generatedInstances.length,
      message: isRecurring 
        ? `Recurring class created successfully with ${generatedInstances.length} instances generated`
        : 'Single class created successfully'
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
