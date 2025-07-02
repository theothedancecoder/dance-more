import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      schoolName, 
      subdomain, 
      contactEmail, 
      contactPhone, 
      address, 
      description,
      primaryColor,
      secondaryColor 
    } = body;

    if (!schoolName || !subdomain || !contactEmail) {
      return NextResponse.json(
        { error: 'School name, subdomain, and contact email are required' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingTenant = await writeClient.fetch(
      `*[_type == "tenant" && subdomain.current == $subdomain][0]`,
      { subdomain }
    );

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Create new tenant
    const tenant = await writeClient.create({
      _type: 'tenant',
      schoolName,
      subdomain: {
        _type: 'slug',
        current: subdomain,
      },
      contactEmail,
      contactPhone,
      address,
      description,
      primaryColor,
      secondaryColor,
      createdBy: {
        _type: 'reference',
        _ref: userId,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        _id: tenant._id,
        schoolName: tenant.schoolName,
        subdomain: tenant.subdomain.current,
      },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
