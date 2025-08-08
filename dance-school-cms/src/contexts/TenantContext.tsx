'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

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
  stripeConnect?: {
    accountId?: string;
    accountStatus?: 'not_connected' | 'pending' | 'active' | 'restricted' | 'rejected';
    onboardingCompleted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    country?: string;
    currency?: string;
    applicationFeePercent?: number;
    connectedAt?: string;
    lastSyncAt?: string;
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
  const [currentTenantSlug, setCurrentTenantSlug] = useState<string | null>(null);

  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // Extract tenant info from URL or subdomain - handles localhost, Vercel, and custom domains
    const getTenantInfo = () => {
      if (typeof window === 'undefined') return { subdomain: null, pathSlug: null };
      
      // Check subdomain first
      const hostname = window.location.hostname;
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
      const vercelProjectName = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME || 'dance-school-cms';
      let subdomain = null;
      
      // Localhost should bypass tenant detection
      if (hostname.includes('localhost')) {
        subdomain = null;
      }
      // Handle Vercel preview domains (tenant.vercel.app or main.vercel.app)
      else if (hostname.endsWith('.vercel.app')) {
        const hostWithoutVercel = hostname.replace('.vercel.app', '');
        const parts = hostWithoutVercel.split('.');
        
        // If it's the main app deployment, there is no tenant
        if (hostWithoutVercel === vercelProjectName || parts.length === 1) {
          subdomain = null;
        } else {
          // Extract subdomain from tenant.project-name.vercel.app or tenant.vercel.app
          subdomain = parts[0];
        }
      }
      // Handle production domains (tenant.dancemore.com)
      else if (hostname.endsWith(baseDomain)) {
        const hostWithoutBase = hostname.replace(`.${baseDomain}`, '');
        
        // If it's the main domain or www, there is no tenant
        if (hostWithoutBase === '' || hostWithoutBase === 'www' || hostWithoutBase === baseDomain) {
          subdomain = null;
        } else {
          const [subdomainPart] = hostWithoutBase.split('.');
          subdomain = subdomainPart;
        }
      }
      // For any other domains, try to extract the first part as tenant
      else {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          const potentialTenant = parts[0];
          // Skip common non-tenant subdomains
          if (!['www', 'api', 'admin', 'app'].includes(potentialTenant)) {
            subdomain = potentialTenant;
          }
        }
      }

      // Check URL path for tenant slug using current pathname
      const pathSegments = pathname.split('/').filter(Boolean);
      const skipRoutes = [
        'api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 
        'register-school', 'unauthorized', 'dashboard', 'admin', 
        'student', 'my-classes', 'payment', 'classes', 'calendar', 
        'my-subscriptions', 'subscriptions', 'instructor', 'blog', 
        'auth-status', 'check-admin', 'promote-admin', 'debug'
      ];
      
      // Only consider path-based tenant if we're not on the root path
      const pathSlug = pathSegments.length > 0 && 
                      pathname !== '/' && 
                      !skipRoutes.includes(pathSegments[0])
        ? pathSegments[0]
        : null;

      return { subdomain, pathSlug };
    };

    const { subdomain, pathSlug } = getTenantInfo();
    const newTenantSlug = subdomain || pathSlug;
    
    setTenantSubdomain(subdomain);

    const fetchTenant = async () => {
      // Set loading state
      setIsLoading(true);
      
      // If tenant slug changed, clear existing data
      if (newTenantSlug !== currentTenantSlug) {
        setTenant(null);
        setError(null);
        setCurrentTenantSlug(newTenantSlug);
      }

      // Only fetch tenant data if we're on a tenant-specific context
      if (newTenantSlug) {
        try {
          console.log('🔄 Fetching tenant data for:', newTenantSlug);
          const response = await fetch(`/api/tenants/${newTenantSlug}/public`, {
            method: 'GET',
            cache: 'no-store', // Prevent caching issues
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error(`Tenant "${newTenantSlug}" not found`);
            }
            throw new Error('Failed to fetch tenant data');
          }

          const tenantData = await response.json();
          console.log('✅ Tenant data loaded:', tenantData.schoolName);
          setTenant(tenantData);
          setError(null);
        } catch (err) {
          console.error('❌ Tenant fetch error:', err);
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setTenant(null);
        }
      } else {
        // No tenant context, clear data
        setTenant(null);
        setError(null);
      }
      
      setIsLoading(false);
    };

    if (isAuthLoaded) {
      fetchTenant();
    }
  }, [isAuthLoaded, userId, pathname, currentTenantSlug]);

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
