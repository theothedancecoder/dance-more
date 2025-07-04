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

    // Get tenant from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id');
    
    // Fetch tenant-specific passes from Sanity
    let query = `*[_type == "pass"`;
    let params = {};
    
    if (tenantId) {
      // Get tenant document first
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && subdomain.current == $tenantId][0]`,
        { tenantId }
      );
      
      if (tenant) {
        query += ` && tenant._ref == $tenantRef`;
        params = { tenantRef: tenant._id };
      }
    }
    
    query += `] | order(_createdAt desc) {
      _id,
      name,
      description,
      type,
      price,
      validityDays,
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

    const passes = await sanityClient.fetch(query, params);

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
      validityDays,
      classesLimit,
      isActive
    } = body;

    // Validate required fields
    if (!name || !type || !price || !validityDays) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get tenant from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Get tenant document
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && subdomain.current == $tenantId][0]`,
      { tenantId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Create pass document in Sanity
    const passDoc = {
      _type: 'pass',
      name,
      description: description || '',
      type,
      price,
      validityDays,
      classesLimit: type === 'multi' ? classesLimit : null,
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
