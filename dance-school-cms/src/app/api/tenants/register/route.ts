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

    const formData = await request.formData();
    const schoolName = formData.get('schoolName') as string;
    const subdomain = formData.get('subdomain') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const description = formData.get('description') as string;
    const primaryColor = formData.get('primaryColor') as string;
    const secondaryColor = formData.get('secondaryColor') as string;
    const logo = formData.get('logo') as File | null;

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

    // Handle logo upload if provided
    let logoAsset = null;
    if (logo) {
      // Convert File to Buffer
      const bytes = await logo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Sanity
      logoAsset = await writeClient.assets.upload('image', buffer, {
        filename: logo.name,
        contentType: logo.type,
      });
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
      ...(logoAsset && {
        logo: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: logoAsset._id,
          },
        },
      }),
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
