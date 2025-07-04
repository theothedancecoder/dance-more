'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/Navigation';

export default function TenantHomePage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Give the tenant context time to validate
    const timer = setTimeout(() => {
      setIsValidating(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">School Not Found</h1>
          <p className="text-gray-600 mb-6">
            The dance school "{params.slug}" could not be found or is not available.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            {tenant.logo && (
              <div className="mb-8 animate-fade-in">
                <Image
                  src={tenant.logo.asset?.url || '/placeholder-logo.png'}
                  alt={`${tenant.schoolName} logo`}
                  width={120}
                  height={120}
                  className="mx-auto rounded-2xl shadow-lg"
                />
              </div>
            )}
            <h1 
              className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 animate-slide-up"
              style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}
            >
              Welcome to {tenant.schoolName}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-slide-up-delay">
              {tenant.description || 'Join our dance community and explore our classes'}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <Link
            href="/classes"
            className="group bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            style={{ borderTop: `4px solid ${tenant.branding?.primaryColor || '#3B82F6'}` }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4 mx-auto" style={{ backgroundColor: `${tenant.branding?.primaryColor || '#3B82F6'}20` }}>
              <svg className="w-6 h-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center group-hover:scale-105 transition-transform" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Our Classes
            </h3>
            <p className="text-gray-600 text-center text-sm sm:text-base">
              Browse our wide range of dance classes for all skill levels.
            </p>
          </Link>
          
          <Link
            href="/calendar"
            className="group bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            style={{ borderTop: `4px solid ${tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6'}` }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4 mx-auto" style={{ backgroundColor: `${tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6'}20` }}>
              <svg className="w-6 h-6" style={{ color: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center group-hover:scale-105 transition-transform" style={{ color: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }}>
              Class Schedule
            </h3>
            <p className="text-gray-600 text-center text-sm sm:text-base">
              View our class schedule and book your spot.
            </p>
          </Link>
          
          <Link
            href="/subscriptions"
            className="group bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1"
            style={{ borderTop: `4px solid ${tenant.branding?.primaryColor || '#3B82F6'}` }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4 mx-auto" style={{ backgroundColor: `${tenant.branding?.primaryColor || '#3B82F6'}20` }}>
              <svg className="w-6 h-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center group-hover:scale-105 transition-transform" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Passes & Subscriptions
            </h3>
            <p className="text-gray-600 text-center text-sm sm:text-base">
              Choose from our range of flexible class passes.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <SignedOut>
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                Ready to Start Dancing?
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                Join our community and begin your dance journey today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SignInButton mode="modal">
                  <button 
                    className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                  >
                    Sign In
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
                  style={{ backgroundColor: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }}
                >
                  Sign Up Now
                </Link>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                Welcome Back!
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                Ready to continue your dance journey?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/calendar"
                  className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
                  style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                >
                  Book a Class
                </Link>
                <Link
                  href="/my-classes"
                  className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
                  style={{ backgroundColor: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }}
                >
                  My Classes
                </Link>
              </div>
            </div>
          </SignedIn>
        </div>
      </section>
    </div>
  );
}
