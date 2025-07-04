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
  logo?: any;
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
    // Extract subdomain from hostname
    const extractTenantSubdomain = () => {
      if (typeof window === 'undefined') return null;
      const hostname = window.location.hostname;
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
      if (hostname === 'localhost' || hostname === baseDomain) {
        return null;
      }
      const parts = hostname.split('.');
      if (parts.length < 3) {
        // No subdomain present
        return null;
      }
      return parts[0];
    };

    const subdomain = extractTenantSubdomain();
    setTenantSubdomain(subdomain);

    const fetchTenant = async () => {
      if (!subdomain) {
        setTenant(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/tenants/by-subdomain/${subdomain}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tenant');
        }
        const data = await response.json();
        setTenant(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
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
