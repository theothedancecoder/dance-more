import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch public tenant information (no authentication required)
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug && status == "active"][0]{
        _id,
        schoolName,
        slug,
        status,
        description,
        branding,
        logo {
          asset-> {
            _id,
            url,
            originalFilename,
            size,
            mimeType
          }
        },
        stripeConnect,
        settings->{
          allowPublicRegistration
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

    return NextResponse.json(tenant);

  } catch (error) {
    console.error('Get public tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
