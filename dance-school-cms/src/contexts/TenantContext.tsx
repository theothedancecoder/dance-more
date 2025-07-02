'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface Tenant {
  _id: string;
  schoolName: string;
  subdomain: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get tenant identifier from either subdomain or path
        const host = window.location.host;
        let tenantIdentifier: string;

        if (host.includes('.')) {
          // Subdomain approach
          const subdomain = host.split('.')[0];
          if (subdomain === 'www' || subdomain === 'localhost:3000') {
            // Handle root domain
            if (pathname === '/') {
              setIsLoading(false);
              return; // Show landing page
            }
            // Try to get tenant from path
            tenantIdentifier = pathname.split('/')[1];
          } else {
            tenantIdentifier = subdomain;
          }
        } else {
          // Path-based approach
          tenantIdentifier = pathname.split('/')[1];
        }

        if (!tenantIdentifier) {
          setIsLoading(false);
          return; // Show landing page
        }

        // Fetch tenant data
        const response = await fetch(`/api/tenants/${tenantIdentifier}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tenant data');
        }

        const data = await response.json();
        setTenant(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [pathname]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}
