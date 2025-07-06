'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AuthRedirectProps {
  fallbackUrl?: string;
}

export default function AuthRedirect({ fallbackUrl = '/register-school' }: AuthRedirectProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isRedirecting) return;

    const handleRedirect = async () => {
      setIsRedirecting(true);
      
      try {
        // Check if user has tenant data
        const response = await fetch('/api/auth/user');
        
        if (response.ok) {
          const userData = await response.json();
          
          if (userData.tenant && userData.tenant.slug) {
            const tenantSlug = userData.tenant.slug;
            
            // Try to validate the tenant by making a simple request to the tenant page
            try {
              const tenantCheckResponse = await fetch(`/api/tenants/${tenantSlug}`, {
                method: 'GET',
              });

              if (tenantCheckResponse.ok) {
                // Tenant exists and is accessible
                const currentPath = window.location.pathname;
                const currentHost = window.location.host;
                
                // If we're on a subdomain that matches the tenant, go to root
                if (currentHost.includes(tenantSlug)) {
                  router.push('/');
                  return;
                }
                
                // If we're on the main domain, redirect to tenant-specific page
                router.push(`/${tenantSlug}`);
                return;
              } else {
                // Tenant doesn't exist or isn't accessible
                console.warn('Tenant not accessible:', tenantSlug, 'Status:', tenantCheckResponse.status);
              }
            } catch (validationError) {
              console.error('Error checking tenant accessibility:', validationError);
            }
          }
        }
        
        // User doesn't have a valid tenant or API call failed, redirect to fallback
        router.push(fallbackUrl);
        
      } catch (error) {
        console.error('Error checking user tenant status:', error);
        // On error, redirect to fallback
        router.push(fallbackUrl);
      }
    };

    handleRedirect();
  }, [isLoaded, isSignedIn, router, fallbackUrl, isRedirecting]);

  // Show loading state while redirecting
  if (!isLoaded || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}
