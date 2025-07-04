import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN, // Only needed for write operations
});

// Export as sanityClient for backward compatibility
export const sanityClient = client;

// Write client with token for mutations
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false, // Don't use CDN for write operations
  token: process.env.SANITY_API_TOKEN, // Required for write operations
});

// Image URL builder
const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

// Helper function to get tenant-scoped query
export const getTenantQuery = (baseQuery: string, tenantId: string) => {
  // If the query starts with * and doesn't have a tenant filter, add it
  if (baseQuery.startsWith('*[') && !baseQuery.includes('tenant._ref')) {
    const insertPoint = baseQuery.indexOf(']');
    return baseQuery.slice(0, insertPoint) + 
           ` && tenant._ref == $tenantId` + 
           baseQuery.slice(insertPoint);
  }
  return baseQuery;
};

// Helper function to add tenant reference to document
export const addTenantRef = (doc: any, tenantId: string) => {
  return {
    ...doc,
    tenant: {
      _type: 'reference',
      _ref: tenantId
    }
  };
};

// Helper function to validate tenant access
export const validateTenantAccess = async (userId: string, tenantId: string) => {
  const user = await client.fetch(
    `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0]`,
    { userId, tenantId }
  );
  return !!user;
};

// Helper function to get user's role in tenant
export const getUserRole = async (userId: string, tenantId: string) => {
  const user = await client.fetch(
    `*[_type == "user" && clerkId == $userId && tenant._ref == $tenantId][0].role`,
    { userId, tenantId }
  );
  return user || null;
};

// Helper function to check if user is admin of tenant
export const isAdmin = async (userId: string, tenantId: string) => {
  const role = await getUserRole(userId, tenantId);
  return role === 'admin';
};
