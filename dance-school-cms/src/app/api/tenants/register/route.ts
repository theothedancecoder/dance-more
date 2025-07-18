import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { client, addTenantRef } from '@/lib/sanity';
import { z } from 'zod';
import slugify from 'slugify';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const registerTenantSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  email: z.string().email('Valid email is required'),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth.protect();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = registerTenantSchema.parse(body);

    // Auto-generate slug from school name
    const slug = slugify(validatedData.schoolName, { lower: true, strict: true });

    // Check if slug is already taken
    const existingTenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $slug][0]`,
      { slug }
    );

    if (existingTenant) {
      return NextResponse.json(
        { error: 'This school name is already taken. Please choose a different one.' },
        { status: 400 }
      );
    }

    // Check if user already owns a tenant
    const existingUserTenant = await client.fetch(
      `*[_type == "tenant" && ownerId == $userId][0]`,
      { userId }
    );

    if (existingUserTenant) {
      return NextResponse.json(
        { error: 'You already own a dance school. Each user can only own one school.' },
        { status: 400 }
      );
    }

    // Create tenant document
    const tenantDoc = {
      _type: 'tenant',
      schoolName: validatedData.schoolName,
      slug: {
        _type: 'slug',
        current: slug,
      },
      status: 'active',
      ownerId: userId,
      email: validatedData.email,
      description: validatedData.description || '',
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#F59E0B',
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        allowPublicRegistration: true,
        requireApproval: false,
      },
      subscription: {
        plan: 'free',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tenant = await client.create(tenantDoc);
    console.log('✅ Created tenant:', { tenantId: tenant._id, slug, ownerId: userId });

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || '';

    // Create or update user document with admin role
    // Note: We need to handle the case where Clerk webhook might have already created a user
    let existingUser = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]`,
      { clerkId: userId }
    );

    // If webhook created user but we need to wait for it to be available
    if (!existingUser) {
      // Wait a bit and try again in case webhook is still processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      existingUser = await client.fetch(
        `*[_type == "user" && clerkId == $clerkId][0]`,
        { clerkId: userId }
      );
    }

    let userRecord;
    if (existingUser) {
      console.log('📝 Updating existing user:', { userId, existingRole: existingUser.role });
      // Update existing user with complete details and admin role
      userRecord = await client
        .patch(existingUser._id)
        .set({
          email: userEmail,
          firstName: firstName,
          lastName: lastName,
          name: fullName,
          phone: phone,
          tenant: {
            _type: 'reference',
            _ref: tenant._id,
          },
          role: 'admin', // Ensure admin role is set
          isActive: true,
          updatedAt: new Date().toISOString(),
        })
        .commit();
      console.log('✅ Updated user to admin:', { userId, newRole: 'admin' });
    } else {
      console.log('🆕 Creating new user as admin:', { userId });
      // Create new user document with complete details
      const userDoc = {
        _type: 'user',
        clerkId: userId,
        email: userEmail,
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        phone: phone,
        tenant: {
          _type: 'reference',
          _ref: tenant._id,
        },
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      userRecord = await client.create(userDoc);
      console.log('✅ Created new user as admin:', { userId, userRecordId: userRecord._id });
    }

    // Verify user record was created/updated successfully with retry mechanism
    let verificationAttempts = 0;
    const maxVerificationAttempts = 5;
    let verifiedUser = null;

    while (verificationAttempts < maxVerificationAttempts && !verifiedUser) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
      
      verifiedUser = await client.fetch(
        `*[_type == "user" && clerkId == $clerkId && tenant._ref == $tenantId][0]{
          _id,
          tenant->{_id, "slug": slug.current},
          role
        }`,
        { clerkId: userId, tenantId: tenant._id }
      );
      
      verificationAttempts++;
    }

    if (!verifiedUser) {
      console.error('Failed to verify user record creation after registration');
      return NextResponse.json(
        { error: 'Registration completed but verification failed. Please try signing in.' },
        { status: 500 }
      );
    }

    // Return success with both path-based and subdomain URLs
    return NextResponse.json({
      success: true,
      tenant: {
        _id: tenant._id,
        schoolName: tenant.schoolName,
        slug: slug,
      },
      urls: {
        pathBased: `/${slug}/admin`,
        subdomain: `https://${slug}.dancemore.com`
      }
    });

  } catch (error) {
    console.error('Tenant registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to register school. Please try again.' },
      { status: 500 }
    );
  }
}
