import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get tenant information from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id');
    let tenant = null;

    if (tenantId) {
      tenant = await sanityClient.fetch(
        `*[_type == "tenant" && _id == $tenantId][0] {
          _id,
          schoolName,
          "slug": slug.current,
          branding {
            primaryColor,
            secondaryColor,
            accentColor
          },
          logo
        }`,
        { tenantId }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
