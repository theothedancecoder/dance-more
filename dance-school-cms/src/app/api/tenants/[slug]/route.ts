import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { client } from '@/lib/sanity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    const { slug } = await params;

    // Require authentication for tenant data access
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, fetch basic tenant info to verify it exists
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug && status == "active"][0]{
        _id,
        schoolName,
        "slug": slug.current,
        status
      }`,
      { slug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // Verify user belongs to this tenant
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]{
        _id,
        role,
        tenant->{_id, "slug": slug.current}
      }`,
      { userId, tenantId: tenant._id }
    );

    if (!user || user.tenant.slug !== slug) {
      return NextResponse.json(
        { error: 'Access denied: User does not belong to this tenant' },
        { status: 403 }
      );
    }

    // Return different data based on user role
    if (user.role.toLowerCase() === 'admin') {
      // Admin gets full tenant data including sensitive information
      const fullTenantData = await client.fetch(
        `*[_type == "tenant" && _id == $tenantId][0]{
          _id,
          schoolName,
          "slug": slug.current,
          status,
          contactEmail,
          contactPhone,
          description,
          branding,
          settings,
          subscription,
          createdAt,
          updatedAt,
          "stats": {
            "totalUsers": count(*[_type == "user" && tenant._ref == ^._id]),
            "activeClasses": count(*[_type == "class" && tenant._ref == ^._id && isActive == true]),
            "totalBookings": count(*[_type == "booking" && tenant._ref == ^._id])
          }
        }`,
        { tenantId: tenant._id }
      );

      return NextResponse.json({
        ...fullTenantData,
        userAccess: user.role
      });
    } else {
      // Regular users get limited public information
      const publicTenantData = await client.fetch(
        `*[_type == "tenant" && _id == $tenantId][0]{
          _id,
          schoolName,
          "slug": slug.current,
          description,
          branding
        }`,
        { tenantId: tenant._id }
      );

      return NextResponse.json({
        ...publicTenantData,
        userAccess: user.role
      });
    }

  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
