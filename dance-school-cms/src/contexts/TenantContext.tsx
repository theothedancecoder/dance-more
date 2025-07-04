'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface Tenant {
  _id: string;
  schoolName: string;
  slug: {
    current: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  logo?: {
    asset?: {
      url: string;
    };
  };
  description?: string;
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  settings?: {
    timezone: string;
    currency: string;
    allowPublicRegistration: boolean;
    requireApproval: boolean;
  };
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  tenantSubdomain: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
  tenantSubdomain: null,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null);

  const { isLoaded: isAuthLoaded, userId } = useAuth();

  useEffect(() => {
    // Extract tenant info from URL or subdomain
    const getTenantInfo = () => {
      if (typeof window === 'undefined') return { subdomain: null, pathSlug: null };
      
      // Check subdomain first
      const hostname = window.location.hostname;
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
      let subdomain = null;
      
      if (hostname !== 'localhost' && hostname !== baseDomain) {
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          subdomain = parts[0];
        }
      }

      // Check URL path for tenant slug
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const skipRoutes = [
        'api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 
        'register-school', 'unauthorized', 'dashboard', 'admin', 
        'student', 'my-classes', 'payment', 'classes', 'calendar', 
        'my-subscriptions', 'subscriptions', 'instructor', 'blog', 
        'auth-status', 'check-admin', 'promote-admin', 'debug'
      ];
      
      // Only consider path-based tenant if we're not on the root path
      const pathSlug = pathSegments.length > 0 && 
                      window.location.pathname !== '/' && 
                      !skipRoutes.includes(pathSegments[0])
        ? pathSegments[0]
        : null;

      return { subdomain, pathSlug };
    };

    const { subdomain, pathSlug } = getTenantInfo();
    setTenantSubdomain(subdomain);

    const fetchTenant = async () => {
      // Clear any existing tenant data first
      setTenant(null);
      setError(null);

      // Only fetch tenant data if we're on a tenant-specific context
      if (subdomain || pathSlug) {
        try {
          const response = await fetch('/api/tenants/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subdomain: subdomain || pathSlug,
              userId: userId || undefined
            })
          });

          if (!response.ok) {
            throw new Error('Failed to validate tenant access');
          }

          const { tenant, error } = await response.json();
          
          if (error) {
            throw new Error(error);
          }

          setTenant(tenant);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
      
      setIsLoading(false);
    };

    if (isAuthLoaded) {
      fetchTenant();
    }
  }, [isAuthLoaded, userId]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error, tenantSubdomain }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
