import { NextRequest, NextResponse } from 'next/server';
import { validateTenantAccess } from '@/lib/tenant-validation';

export async function POST(request: NextRequest) {
  try {
    const { subdomain, userId } = await request.json();

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    const result = await validateTenantAccess(subdomain, userId);

    if (!result.isValid) {
      return NextResponse.json(
        { error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ tenant: result.tenant });

  } catch (error) {
    console.error('Tenant validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate tenant' },
      { status: 500 }
    );
  }
}
