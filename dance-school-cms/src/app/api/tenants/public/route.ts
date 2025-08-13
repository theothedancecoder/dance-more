 import { NextRequest, NextResponse } from 'next/server';
import { client, urlFor } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'schoolName';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

    // Validate sortBy parameter
    const allowedSortFields = ['schoolName', '_createdAt', '_updatedAt'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'schoolName';

    const query = `*[_type == "tenant" && status == "active"] | order(${validSortBy} ${sortOrder}) [${offset}...${offset + limit}] {
      _id,
      schoolName,
      slug,
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
      _createdAt,
      _updatedAt,
      "classCount": count(*[_type == "class" && tenant._ref == ^._id && status == "active"]),
      "upcomingClasses": count(*[_type == "classInstance" && tenant._ref == ^._id && date >= now() && status == "active"]),
      "totalStudents": count(*[_type == "user" && tenant._ref == ^._id && role != "admin"])
    }`;

    const tenants = await client.fetch(query);

    // Process logo URLs
    const processedTenants = tenants.map((tenant: any) => {
      if (tenant.logo && tenant.logo.asset) {
        if (!tenant.logo.asset.url && tenant.logo.asset._id) {
          try {
            tenant.logo.asset.url = urlFor(tenant.logo).url();
          } catch (urlError) {
            console.warn('Failed to generate logo URL:', urlError);
          }
        }
      }
      return tenant;
    });

    // Get total count for pagination
    const totalCount = await client.fetch(`count(*[_type == "tenant" && status == "active"])`);

    return NextResponse.json({
      tenants: processedTenants,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      meta: {
        sortBy: validSortBy,
        sortOrder,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('List tenants error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
