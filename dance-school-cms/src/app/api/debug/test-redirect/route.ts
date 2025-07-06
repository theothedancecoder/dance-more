import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    // Test the dancezone tenant setup
    const tenantSlug = 'dancezone';
    
    // Fetch the dancezone tenant
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug && status == "active"][0]{
        _id,
        schoolName,
        slug,
        status
      }`,
      { slug: tenantSlug }
    );

    // Fetch the admin user for dancezone
    const adminUser = await client.fetch(
      `*[_type == "user" && tenant._ref == $tenantId && role == "admin"][0]{
        _id,
        clerkId,
        role,
        email,
        tenant->{
          _id,
          schoolName,
          "slug": slug.current
        }
      }`,
      { tenantId: tenant?._id }
    );

    // Simulate redirect logic
    let redirectResult = null;
    if (adminUser && adminUser.tenant && adminUser.tenant.slug) {
      redirectResult = `/${adminUser.tenant.slug}/admin`;
    } else if (adminUser && !adminUser.tenant) {
      redirectResult = '/register-school';
    } else {
      redirectResult = '/sign-in';
    }

    return NextResponse.json({
      success: true,
      tenant,
      adminUser,
      redirectResult,
      tests: {
        tenantExists: !!tenant,
        adminUserExists: !!adminUser,
        userHasTenant: !!(adminUser?.tenant),
        expectedRedirect: redirectResult
      }
    });

  } catch (error) {
    console.error('Redirect test error:', error);
    return NextResponse.json(
      { error: 'Redirect test failed', details: error },
      { status: 500 }
    );
  }
}
