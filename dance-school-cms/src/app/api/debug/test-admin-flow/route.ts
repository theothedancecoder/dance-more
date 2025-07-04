import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const clerkId = 'user_2zI727qk2r1ePVbB4coONX6oF1k';
    const tenantSlug = 'dance-with-dancecity';

    // Test 1: Fetch user data
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]{
        _id,
        clerkId,
        role,
        isActive,
        tenant->{
          _id,
          schoolName,
          slug,
          status
        },
        createdAt,
        updatedAt
      }`,
      { clerkId }
    );

    // Test 2: Fetch tenant data
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug && status == "active"][0]{
        _id,
        schoolName,
        slug,
        status,
        contactEmail,
        contactPhone,
        description
      }`,
      { slug: tenantSlug }
    );

    // Test 3: Check tenant access
    const hasAccess = user?.tenant?.slug?.current === tenantSlug;
    const isAdmin = user?.role === 'admin';

    return NextResponse.json({
      success: true,
      tests: {
        userFound: !!user,
        tenantFound: !!tenant,
        hasAccess,
        isAdmin,
        userTenantSlug: user?.tenant?.slug?.current,
        expectedSlug: tenantSlug,
        userRole: user?.role
      },
      data: {
        user,
        tenant
      }
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json(
      { error: 'Debug test failed', details: error },
      { status: 500 }
    );
  }
}
