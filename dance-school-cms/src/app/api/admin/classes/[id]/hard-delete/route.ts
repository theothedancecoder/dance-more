import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const classId = resolvedParams.id;

    // Get tenant from headers
    let tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');

    // If no tenant ID from middleware, try to get it from tenant slug
    if (!tenantId && tenantSlug) {
      const tenant = await sanityClient.fetch(
        `*[_type == "tenant" && slug.current == $tenantSlug && status == "active"][0]`,
        { tenantSlug }
      );
      if (tenant) {
        tenantId = tenant._id;
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Check if user is admin
    let userIsAdmin = false;
    try {
      userIsAdmin = await isAdmin(userId, tenantId);
    } catch (error) {
      console.warn('Clerk admin check failed, falling back to Sanity check:', error);
      const sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && role == "admin"][0]`,
        { userId, tenantId }
      );
      userIsAdmin = !!sanityUser;
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if class exists and belongs to tenant
    const existingClass = await sanityClient.fetch(
      `*[_type == "class" && _id == $classId && tenant._ref == $tenantId][0]`,
      { classId, tenantId }
    );

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get all class instances for this class
    const classInstances = await sanityClient.fetch(
      `*[_type == "classInstance" && parentClass._ref == $classId]`,
      { classId }
    );

    console.log(`Found ${classInstances.length} instances to delete for class ${classId}`);

    // Delete all class instances first
    if (classInstances.length > 0) {
      const instanceIds = classInstances.map((instance: any) => instance._id);
      await writeClient.delete({
        query: `*[_type == "classInstance" && _id in $instanceIds]`,
        params: { instanceIds }
      });
      console.log(`Deleted ${classInstances.length} class instances`);
    }

    // Delete the class itself
    await writeClient.delete(classId);
    console.log(`Deleted class ${classId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted class and ${classInstances.length} instances`,
      instancesDeleted: classInstances.length
    });

  } catch (error) {
    console.error('Error hard deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to hard delete class' },
      { status: 500 }
    );
  }
}
