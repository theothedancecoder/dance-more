import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

// Get all passes
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

    // Get tenant from headers (set by middleware) - REQUIRED for security
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
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
    
    // Fetch tenant-specific passes from Sanity with mandatory tenant filter
    const query = `*[_type == "pass" && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      name,
      description,
      type,
      price,
      validityType,
      validityDays,
      expiryDate,
      classesLimit,
      isActive,
      tenant->{
        _id,
        schoolName,
        "subdomain": subdomain.current
      },
      _createdAt,
      _updatedAt
    }`;

    const passes = await sanityClient.fetch(query, { tenantId });

    return NextResponse.json({ passes });
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}

// Create new pass
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
      name,
      description,
      type,
      price,
      validityType,
      validityDays,
      expiryDate,
      classesLimit,
      isActive
    } = body;

    // Validate required fields
    if (!name || !type || !price || !validityType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, price, and validityType are required' },
        { status: 400 }
      );
    }

    // Validate validity type specific fields
    if (validityType === 'days' && (!validityDays || validityDays < 1)) {
      return NextResponse.json(
        { error: 'validityDays must be at least 1 when using days-based validity' },
        { status: 400 }
      );
    }

    if (validityType === 'date') {
      if (!expiryDate) {
        return NextResponse.json(
          { error: 'expiryDate is required when using date-based validity' },
          { status: 400 }
        );
      }
      
      const expiry = new Date(expiryDate);
      if (expiry <= new Date()) {
        return NextResponse.json(
          { error: 'expiryDate must be in the future' },
          { status: 400 }
        );
      }
    }

    // Get tenant from headers (set by middleware) - REQUIRED for security
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
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

    // Create pass document in Sanity
    const passDoc = {
      _type: 'pass',
      name,
      description: description || '',
      type,
      price,
      validityType,
      validityDays: validityType === 'days' ? validityDays : null,
      expiryDate: validityType === 'date' ? expiryDate : null,
      classesLimit: ['multi', 'multi-pass'].includes(type) ? classesLimit : null,
      isActive: isActive ?? true,
      tenant: {
        _type: 'reference',
        _ref: tenant._id
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await writeClient.create(passDoc);

    return NextResponse.json({
      success: true,
      pass: result,
      message: 'Pass created successfully'
    });

  } catch (error) {
    console.error('Error creating pass:', error);
    return NextResponse.json(
      { error: 'Failed to create pass' },
      { status: 500 }
    );
  }
}
