'use client';

import { SignIn, useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

export default function TenantSignInPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { tenant, isLoading } = useTenant();
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.slug as string;

  // If user is already signed in, redirect to tenant homepage
  useEffect(() => {
    if (isLoaded && isSignedIn && tenantSlug) {
      router.push(`/${tenantSlug}`);
    }
  }, [isLoaded, isSignedIn, tenantSlug, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">School Not Found</h1>
          <p className="text-gray-600 mb-6">
            The dance school "{tenantSlug}" could not be found.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with tenant branding */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              {tenant.logo && (
                <img
                  src={tenant.logo.asset?.url || '/placeholder-logo.png'}
                  alt={`${tenant.schoolName} logo`}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <h1 
                className="text-xl font-bold"
                style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}
              >
                {tenant.schoolName}
              </h1>
            </div>
            <button
              onClick={() => router.push(`/${tenantSlug}`)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to {tenant.schoolName}
            </button>
          </div>
        </div>
      </div>

      {/* Sign in form */}
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to your {tenant.schoolName} account
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <SignIn 
              routing="path"
              path={`/${tenantSlug}/sign-in`}
              fallbackRedirectUrl={`/${tenantSlug}`}
              afterSignInUrl={`/${tenantSlug}`}
              signUpUrl={`/${tenantSlug}/sign-up`}
              redirectUrl={`/${tenantSlug}`}
            />
          </div>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => router.push(`/${tenantSlug}/sign-up`)}
                className="font-medium hover:underline"
                style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
