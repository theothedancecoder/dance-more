import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Public endpoint for classes (for public class listings)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug');

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    // Get tenant by slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
      { tenantSlug }
    );
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 404 }
      );
    }
    
    // Fetch public classes for this tenant (only active classes)
    const classes = await sanityClient.fetch(
      `*[_type == "class" && tenant._ref == $tenantId && isActive == true] | order(_createdAt desc) {
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
          image
        },
        _createdAt
      }`,
      { tenantId: tenant._id }
    );

    return NextResponse.json({
      success: true,
      classes
    });

  } catch (error) {
    console.error('Error fetching public classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}
