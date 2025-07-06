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
        
        console.log('🔍 AuthRedirect: API response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 AuthRedirect: User data received:', userData);
          
          if (userData.tenant && userData.tenant.slug) {
            const tenantSlug = userData.tenant.slug;
            console.log('🔍 AuthRedirect: Found tenant slug:', tenantSlug);
            
            // Try to validate the tenant by making a simple request to the tenant page
            try {
              const tenantCheckResponse = await fetch(`/api/tenants/${tenantSlug}`, {
                method: 'GET',
              });

              console.log('🔍 AuthRedirect: Tenant check response:', tenantCheckResponse.status);

              if (tenantCheckResponse.ok) {
                // Tenant exists and is accessible
                const currentPath = window.location.pathname;
                const currentHost = window.location.host;
                
                console.log('🔍 AuthRedirect: Redirecting to tenant:', { currentPath, currentHost, tenantSlug });
                
                // Determine the correct redirect based on current environment
                const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dancemore.com';
                const vercelProjectName = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME || 'dance-school-cms';
                
                // Check if we're already on the correct tenant context
                let isOnCorrectTenant = false;
                
                if (currentHost.includes('localhost')) {
                  // On localhost, use path-based routing
                  isOnCorrectTenant = currentPath.startsWith(`/${tenantSlug}`);
                } else if (currentHost.endsWith('.vercel.app')) {
                  // On Vercel, check if subdomain matches tenant
                  const hostWithoutVercel = currentHost.replace('.vercel.app', '');
                  const parts = hostWithoutVercel.split('.');
                  if (parts.length > 1 && parts[0] === tenantSlug) {
                    isOnCorrectTenant = true;
                  } else {
                    isOnCorrectTenant = currentPath.startsWith(`/${tenantSlug}`);
                  }
                } else if (currentHost.endsWith(baseDomain)) {
                  // On production domain, check subdomain
                  const hostWithoutBase = currentHost.replace(`.${baseDomain}`, '');
                  if (hostWithoutBase === tenantSlug) {
                    isOnCorrectTenant = true;
                  } else {
                    isOnCorrectTenant = currentPath.startsWith(`/${tenantSlug}`);
                  }
                } else {
                  // For other domains, use path-based routing
                  isOnCorrectTenant = currentPath.startsWith(`/${tenantSlug}`);
                }
                
                if (isOnCorrectTenant) {
                  // Already on correct tenant context, go to root of tenant
                  router.push('/');
                  return;
                }
                
                // Redirect to tenant-specific page using path-based routing
                router.push(`/${tenantSlug}`);
                return;
              } else {
                // Tenant doesn't exist or isn't accessible
                console.warn('Tenant not accessible:', tenantSlug, 'Status:', tenantCheckResponse.status);
              }
            } catch (validationError) {
              console.error('Error checking tenant accessibility:', validationError);
            }
          } else {
            console.warn('🔍 AuthRedirect: No tenant data found in user response');
          }
        } else {
          console.warn('🔍 AuthRedirect: API call failed with status:', response.status);
          const errorText = await response.text();
          console.warn('🔍 AuthRedirect: Error response:', errorText);
        }
        
        // User doesn't have a valid tenant or API call failed, redirect to fallback
        console.log('🔍 AuthRedirect: Redirecting to fallback URL:', fallbackUrl);
        router.push(fallbackUrl);
        
      } catch (error) {
        console.error('Error checking user tenant status:', error);
        // On error, redirect to fallback
        console.log('🔍 AuthRedirect: Error occurred, redirecting to fallback URL:', fallbackUrl);
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
