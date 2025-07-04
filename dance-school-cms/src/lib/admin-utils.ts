import { UserRole } from '@/types';
import { createClerkClient } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Utility function to promote a user to admin for a specific tenant
export async function promoteToAdmin(email: string, tenantId: string): Promise<boolean> {
  try {
    // First, find the user in Clerk by email
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (clerkUsers.data.length === 0) {
      console.error(`User with email ${email} not found in Clerk`);
      return false;
    }

    const clerkUser = clerkUsers.data[0];

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: UserRole.ADMIN,
      },
    });

    // Also update Sanity database
    let sanityUser = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email }
    );
    
    if (!sanityUser) {
      // Create user in Sanity if doesn't exist
      sanityUser = await writeClient.create({
        _type: 'user',
        clerkId: clerkUser.id,
        email,
        name: clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}` 
          : email,
        role: UserRole.ADMIN,
        tenant: {
          _type: 'reference',
          _ref: tenantId
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update existing user
      await writeClient
        .patch(sanityUser._id)
        .set({ 
          role: UserRole.ADMIN,
          tenant: {
            _type: 'reference',
            _ref: tenantId
          }
        })
        .commit();
    }

    console.log(`User ${email} promoted to admin successfully`);
    return true;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
}

// Utility function to list all users and their roles for a tenant
export async function listTenantUsers(tenantId: string) {
  const users = await sanityClient.fetch(
    `*[_type == "user" && tenant._ref == $tenantId] {
      _id,
      email,
      name,
      role,
      "tenant": tenant->{schoolName}
    }`,
    { tenantId }
  );
  console.log('Tenant users:');
  users.forEach((user: any) => {
    console.log(`- ${user.email}: ${user.role} (ID: ${user._id})`);
  });
  return users;
}

// Utility function to demote admin to student for a specific tenant
export async function demoteToStudent(email: string, tenantId: string): Promise<boolean> {
  try {
    // First, find the user in Clerk by email
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (clerkUsers.data.length === 0) {
      console.error(`User with email ${email} not found in Clerk`);
      return false;
    }

    const clerkUser = clerkUsers.data[0];

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        role: UserRole.STUDENT,
      },
    });

    // Also update Sanity database
    const sanityUser = await sanityClient.fetch(
      `*[_type == "user" && email == $email && tenant._ref == $tenantId][0]`,
      { email, tenantId }
    );
    
    if (sanityUser) {
      await writeClient
        .patch(sanityUser._id)
        .set({ role: UserRole.STUDENT })
        .commit();
    }

    console.log(`User ${email} demoted to student`);
    return true;
  } catch (error) {
    console.error('Error demoting user:', error);
    return false;
  }
}

// Server-side only utility to check if a user is admin by Clerk user ID for a specific tenant
export async function isAdmin(clerkUserId: string, tenantId?: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    if (!user) {
      return false;
    }

    // Check if user has admin role in Clerk metadata
    const isAdminInClerk = user.publicMetadata?.role === UserRole.ADMIN;
    
    // Also check our Sanity database
    if (user.emailAddresses[0]) {
      const email = user.emailAddresses[0].emailAddress;
      const query = tenantId 
        ? `*[_type == "user" && email == $email && tenant._ref == $tenantId][0]`
        : `*[_type == "user" && email == $email][0]`;
      const params = tenantId ? { email, tenantId } : { email };
      
      const sanityUser = await sanityClient.fetch(query, params);
      const isAdminInSanity = sanityUser?.role === UserRole.ADMIN;
      
      return isAdminInClerk || isAdminInSanity;
    }
    
    return isAdminInClerk;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
