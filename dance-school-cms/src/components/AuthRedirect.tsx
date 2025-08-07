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
          console.log('🔍 AuthRedirect: User data received:', JSON.stringify(userData, null, 2));
          console.log('🔍 AuthRedirect: User role:', userData.role);
          console.log('🔍 AuthRedirect: User tenant:', userData.tenant);
          
          if (userData.tenant && userData.tenant.slug) {
            const tenantSlug = userData.tenant.slug;
            const userRole = userData.role;
            console.log('🔍 AuthRedirect: Found tenant slug:', tenantSlug, 'User role:', userRole);
            
            // Check if we're already on the correct tenant context
            const currentPath = window.location.pathname;
            const isOnCorrectTenant = currentPath.startsWith(`/${tenantSlug}`);
            
            // Determine redirect URL based on user role
            let redirectUrl = `/${tenantSlug}`;
            if (userRole === 'admin') {
              redirectUrl = `/${tenantSlug}/admin`;
              console.log('🔍 AuthRedirect: Admin user detected! Redirecting to admin dashboard:', redirectUrl);
            } else if (userRole === 'instructor') {
              redirectUrl = `/${tenantSlug}`;
              console.log('🔍 AuthRedirect: Instructor user, redirecting to tenant homepage');
            } else {
              redirectUrl = `/${tenantSlug}`;
              console.log('🔍 AuthRedirect: Student user, redirecting to tenant homepage');
            }
            
            console.log('🔍 AuthRedirect: Final redirect URL:', redirectUrl);
            console.log('🔍 AuthRedirect: Current path:', currentPath);
            console.log('🔍 AuthRedirect: Is on correct tenant:', isOnCorrectTenant);
            
            if (isOnCorrectTenant) {
              // Already on correct tenant context, redirect to appropriate page based on role
              console.log('🔍 AuthRedirect: Already on correct tenant, redirecting to:', redirectUrl);
              router.push(redirectUrl);
              return;
            }
            
            // Redirect to role-appropriate page using path-based routing
            console.log('🔍 AuthRedirect: Not on correct tenant, redirecting to:', redirectUrl);
            router.push(redirectUrl);
            return;
          } else {
            console.warn('🔍 AuthRedirect: No tenant data found in user response');
            console.warn('🔍 AuthRedirect: Full user data:', JSON.stringify(userData, null, 2));
          }
        } else if (response.status === 401 || response.status === 404) {
          // User not found in Sanity or not authenticated
          // Check if we're already on a tenant page and should stay there
          const currentPath = window.location.pathname;
          const pathParts = currentPath.split('/').filter(Boolean);
          
          if (pathParts.length >= 1) {
            const potentialTenantSlug = pathParts[0];
            
            // Check if this looks like a tenant slug (not a global route)
            const globalRoutes = ['classes', 'calendar', 'subscriptions', 'dashboard', 'register-school', 'sign-in', 'sign-up', 'admin', 'studio', 'api'];
            
            if (!globalRoutes.includes(potentialTenantSlug)) {
              // This looks like a tenant slug, try to validate it
              try {
                const tenantCheckResponse = await fetch(`/api/tenants/${potentialTenantSlug}/public`, {
                  method: 'GET',
                });

                if (tenantCheckResponse.ok) {
                  // Valid tenant, stay on this tenant page
                  console.log('🔍 AuthRedirect: Staying on valid tenant page:', potentialTenantSlug);
                  router.push(`/${potentialTenantSlug}`);
                  return;
                }
              } catch (error) {
                console.warn('Error checking tenant:', error);
              }
            }
          }
          
          console.warn('🔍 AuthRedirect: User not found in system, redirecting to fallback');
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
