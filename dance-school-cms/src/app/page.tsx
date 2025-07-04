'use client';

import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useTenant } from '@/contexts/TenantContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { tenant, isLoading } = useTenant();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [userTenants, setUserTenants] = useState<any[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Fetch user's tenants when signed in and not in a tenant context
  useEffect(() => {
    if (isSignedIn && !tenant && isLoaded) {
      fetchUserTenants();
    }
  }, [isSignedIn, tenant, isLoaded]);

  const fetchUserTenants = async () => {
    setLoadingUserData(true);
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        if (userData.tenant) {
          setUserTenants([userData.tenant]);
        }
      }
    } catch (error) {
      console.error('Error fetching user tenants:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  if (isLoading || loadingUserData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If we have a tenant context (subdomain or path), show the tenant-specific landing page
  if (tenant) {
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
          </div>
        </section>
      </div>
    );
  }

  // Platform homepage - show different content based on user state
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-6xl px-4">
          {/* Signed-in users with tenants - Platform Dashboard */}
          <SignedIn>
            {userTenants.length > 0 ? (
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Welcome Back!
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                  Access your dance school management portal below.
                </p>
                
                {/* User's Schools */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {userTenants.map((userTenant) => (
                    <div key={userTenant.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                      {userTenant.logo && (
                        <div className="mb-4">
                          <Image
                            src={userTenant.logo.asset?.url || '/placeholder-logo.png'}
                            alt={`${userTenant.schoolName} logo`}
                            width={80}
                            height={80}
                            className="mx-auto rounded-lg"
                          />
                        </div>
                      )}
                      <h3 className="text-xl font-semibold text-center mb-2">{userTenant.schoolName}</h3>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/${userTenant.slug}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors"
                        >
                          Visit School Portal
                        </Link>
                        <Link
                          href={`/${userTenant.slug}/admin`}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg text-center hover:bg-gray-700 transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link
                      href="/register-school"
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Register Another School
                    </Link>
                    <Link
                      href="/dashboard"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Platform Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Signed-in users without tenants */
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Welcome to Dance School CMS
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                  You're signed in! Ready to create your dance school portal?
                </p>
                <Link
                  href="/register-school"
                  className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Register Your Dance School
                </Link>
              </div>
            )}
          </SignedIn>

          {/* Non-signed-in users - Marketing page */}
          <SignedOut>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              DANCE-MORE SCHOOL MANAGEMENT SYSTEM
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              The complete management system for dance schools. Create your own branded portal today.
            </p>
              <Link
                href="/register-school"
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Register Your Dance School
              </Link>
            </div>
          </SignedOut>

          {/* Features Grid - Show for all users */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Custom Branding</h3>
              <p className="text-gray-600 text-center">Your own branded portal with your logo and colors.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Class Management</h3>
              <p className="text-gray-600 text-center">Easy scheduling and booking system for your classes.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-purple-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-2">Student Portal</h3>
              <p className="text-gray-600 text-center">Students can book classes and manage subscriptions.</p>
            </div>
          </div>

          {/* Additional CTA for non-signed-in users */}
          <SignedOut>
            <div className="text-center">
              <div className="bg-white p-6 rounded-lg shadow-md inline-block">
                <p className="text-gray-600 mb-4">Already have an account?</p>
                <SignInButton mode="modal">
                  <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
        </div>
      </main>
    </div>
  );
}
