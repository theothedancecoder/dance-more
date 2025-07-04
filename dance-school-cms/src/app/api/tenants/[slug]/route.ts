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

    // Fetch tenant data
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug && status == "active"][0]{
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
          "totalUsers": count(*[_type == "user" && references(^._id)]),
          "activeClasses": count(*[_type == "class" && references(^._id) && status == "active"]),
          "activeSubscriptions": count(*[_type == "subscription" && references(^._id) && status == "active"]),
          "thisWeeksClasses": count(*[_type == "classInstance" && references(^._id) && dateTime >= now() && dateTime <= now() + 60*60*24*7]),
          "monthlyRevenue": coalesce(
            *[_type == "payment" && references(^._id) && dateTime >= now() - 60*60*24*30] {
              "total": amount
            }[0].total,
            0
          )
        }
      }`,
      { slug }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    // If user is authenticated, verify they belong to this tenant
    if (userId) {
      const user = await client.fetch(
        `*[_type == "user" && clerkId == $userId && references($tenantId)][0]`,
        { userId, tenantId: tenant._id }
      );

      // Add user access level to response
      tenant.userAccess = user ? user.role : 'none';
    }

    return NextResponse.json(tenant);

  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
