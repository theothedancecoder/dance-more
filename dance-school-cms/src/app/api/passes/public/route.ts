import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

// Get public passes (for users to view and purchase)
export async function GET(request: NextRequest) {
  try {
    // Get tenant slug from headers
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    // First get the tenant ID from slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0] {
        _id,
        schoolName
      }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }
    
    // Fetch only active passes for this tenant
    const query = `*[_type == "pass" && tenant._ref == $tenantId && isActive == true] | order(price asc) {
      _id,
      name,
      description,
      type,
      price,
      validityDays,
      classesLimit,
      isActive,
      features
    }`;

    const passes = await sanityClient.fetch(query, { tenantId: tenant._id });

    return NextResponse.json({ passes });
  } catch (error) {
    console.error('Error fetching public passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}
