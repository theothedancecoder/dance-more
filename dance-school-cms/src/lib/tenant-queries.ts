import { client } from './sanity';

// Helper function to get tenant-scoped classes
export async function getTenantClasses(tenantId: string) {
  return await client.fetch(
    `*[_type == "class" && tenant._ref == $tenantId && isActive == true] | order(title asc) {
      _id,
      title,
      slug,
      description,
      image,
      instructor->{
        _id,
        name,
        bio
      },
      level,
      danceStyle,
      duration,
      capacity,
      price,
      location,
      isRecurring,
      recurringSchedule,
      singleClassDate,
      prerequisites,
      equipment
    }`,
    { tenantId }
  );
}

// Helper function to get tenant-scoped passes
export async function getTenantPasses(tenantId: string) {
  return await client.fetch(
    `*[_type == "pass" && tenant._ref == $tenantId && isActive == true] | order(name asc) {
      _id,
      name,
      description,
      price,
      validityPeriod,
      classLimit,
      passType,
      restrictions
    }`,
    { tenantId }
  );
}

// Helper function to get tenant-scoped instructors
export async function getTenantInstructors(tenantId: string) {
  return await client.fetch(
    `*[_type == "instructor" && tenant._ref == $tenantId] | order(name asc) {
      _id,
      name,
      bio,
      specialties,
      image,
      experience,
      certifications
    }`,
    { tenantId }
  );
}

// Helper function to get tenant-scoped users
export async function getTenantUsers(tenantId: string, role?: string) {
  const roleFilter = role ? ` && role == "${role}"` : '';
  return await client.fetch(
    `*[_type == "user" && tenant._ref == $tenantId${roleFilter} && isActive == true] | order(name asc) {
      _id,
      clerkId,
      email,
      name,
      firstName,
      lastName,
      phone,
      role,
      profileImage,
      createdAt
    }`,
    { tenantId }
  );
}

// Helper function to get tenant-scoped bookings
export async function getTenantBookings(tenantId: string, userId?: string) {
  const userFilter = userId ? ` && user._ref == "${userId}"` : '';
  return await client.fetch(
    `*[_type == "booking" && tenant._ref == $tenantId${userFilter}] | order(bookingDate desc) {
      _id,
      user->{
        _id,
        name,
        email
      },
      class->{
        _id,
        title,
        instructor->{name}
      },
      bookingDate,
      status,
      paymentStatus,
      createdAt
    }`,
    { tenantId }
  );
}

// Helper function to create tenant-scoped document
export async function createTenantDocument(doc: any, tenantId: string) {
  const docWithTenant = {
    ...doc,
    tenant: {
      _type: 'reference',
      _ref: tenantId
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return await client.create(docWithTenant);
}

// Helper function to update tenant-scoped document
export async function updateTenantDocument(docId: string, updates: any, tenantId: string) {
  // First verify the document belongs to the tenant
  const doc = await client.fetch(
    `*[_id == $docId && tenant._ref == $tenantId][0]`,
    { docId, tenantId }
  );
  
  if (!doc) {
    throw new Error('Document not found or access denied');
  }
  
  return await client
    .patch(docId)
    .set({
      ...updates,
      updatedAt: new Date().toISOString()
    })
    .commit();
}

// Helper function to delete tenant-scoped document (soft delete)
export async function deleteTenantDocument(docId: string, tenantId: string) {
  // First verify the document belongs to the tenant
  const doc = await client.fetch(
    `*[_id == $docId && tenant._ref == $tenantId][0]`,
    { docId, tenantId }
  );
  
  if (!doc) {
    throw new Error('Document not found or access denied');
  }
  
  return await client
    .patch(docId)
    .set({
      isActive: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .commit();
}

// Helper function to get tenant statistics
export async function getTenantStats(tenantId: string) {
  const [
    totalStudents,
    totalInstructors,
    totalClasses,
    activeBookings,
    monthlyRevenue
  ] = await Promise.all([
    client.fetch(
      `count(*[_type == "user" && tenant._ref == $tenantId && role == "student" && isActive == true])`,
      { tenantId }
    ),
    client.fetch(
      `count(*[_type == "instructor" && tenant._ref == $tenantId])`,
      { tenantId }
    ),
    client.fetch(
      `count(*[_type == "class" && tenant._ref == $tenantId && isActive == true])`,
      { tenantId }
    ),
    client.fetch(
      `count(*[_type == "booking" && tenant._ref == $tenantId && status == "confirmed"])`,
      { tenantId }
    ),
    client.fetch(
      `*[_type == "booking" && tenant._ref == $tenantId && paymentStatus == "paid" && bookingDate >= $startOfMonth] {
        "amount": class->price
      }`,
      { 
        tenantId,
        startOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      }
    )
  ]);

  const revenue = monthlyRevenue.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0);

  return {
    totalStudents,
    totalInstructors,
    totalClasses,
    activeBookings,
    monthlyRevenue: revenue
  };
}

// Helper function to validate user access to tenant
export async function validateUserTenantAccess(clerkId: string, tenantId: string) {
  const user = await client.fetch(
    `*[_type == "user" && clerkId == $clerkId && tenant._ref == $tenantId && isActive == true][0] {
      _id,
      role,
      tenant->{
        _id,
        schoolName,
        slug,
        status
      }
    }`,
    { clerkId, tenantId }
  );

  if (!user || user.tenant.status !== 'active') {
    return null;
  }

  return user;
}
