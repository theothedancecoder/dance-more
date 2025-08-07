import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get tenant from headers
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Get tenant ID from slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]{ _id }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Fetch users for this tenant from Sanity
    const users = await sanityClient.fetch(
      `*[_type == "user" && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        name,
        email,
        role,
        isActive,
        _createdAt,
        "firstName": name,
        "lastName": "",
        "createdAt": _createdAt
      }`,
      { tenantId: tenant._id }
    );

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { action, email } = await request.json();

    if (action === 'promote') {
      // Find user in Sanity by email
      const user = await sanityClient.fetch(
        `*[_type == "user" && email == $email][0]`,
        { email }
      );

      if (!user) {
        return NextResponse.json(
          { error: `User with email ${email} not found` },
          { status: 404 }
        );
      }

      // Update user role to admin in Sanity
      await sanityClient
        .patch(user._id)
        .set({ role: 'admin' })
        .commit();

      return NextResponse.json({ success: true });
    } 
    
    else if (action === 'demote') {
      // Find user in Sanity by email
      const user = await sanityClient.fetch(
        `*[_type == "user" && email == $email][0]`,
        { email }
      );

      if (!user) {
        return NextResponse.json(
          { error: `User with email ${email} not found` },
          { status: 404 }
        );
      }

      // Update user role to student in Sanity
      await sanityClient
        .patch(user._id)
        .set({ role: 'student' })
        .commit();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing user:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
