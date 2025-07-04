import { client } from './sanity';

export interface TenantValidationResult {
  isValid: boolean;
  tenant?: {
    _id: string;
    schoolName: string;
    slug: { current: string };
    status: string;
  };
  error?: string;
}

export async function validateTenantAccess(
  subdomain: string,
  userId?: string | null
): Promise<TenantValidationResult> {
  try {
    // First verify tenant exists and is active
    const tenant = await client.fetch(
      `*[_type == "tenant" && slug.current == $subdomain && status == "active"][0] {
        _id,
        schoolName,
        slug,
        status,
        settings
      }`,
      { subdomain }
    );

    if (!tenant) {
      return {
        isValid: false,
        error: 'Tenant not found or inactive'
      };
    }

    // If no user ID provided, just validate tenant exists
    if (!userId) {
      return {
        isValid: true,
        tenant
      };
    }

    // If user ID provided, verify user has access to tenant
    const user = await client.fetch(
      `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId && isActive == true][0] {
        _id,
        role,
        tenant->{
          _id,
          schoolName,
          slug,
          status
        }
      }`,
      { userId, tenantId: tenant._id }
    );

    if (!user) {
      return {
        isValid: false,
        error: 'User does not have access to this tenant'
      };
    }

    return {
      isValid: true,
      tenant: user.tenant
    };

  } catch (error) {
    console.error('Tenant validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate tenant access'
    };
  }
}
