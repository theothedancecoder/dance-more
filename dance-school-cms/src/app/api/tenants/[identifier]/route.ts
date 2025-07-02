import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { urlFor } from '@/sanity/lib/image';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Tenant identifier is required' },
        { status: 400 }
      );
    }

    // Fetch tenant by subdomain slug
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && subdomain.current == $identifier][0] {
        _id,
        schoolName,
        "subdomain": subdomain.current,
        logo,
        contactEmail,
        contactPhone,
        address,
        description,
        primaryColor,
        secondaryColor
      }`,
      { identifier }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Add logo URL if logo exists
    const tenantWithLogo = {
      ...tenant,
      logoUrl: tenant.logo ? urlFor(tenant.logo).url() : null,
    };

    return NextResponse.json(tenantWithLogo);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
