'use client';

import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useTenant } from '@/contexts/TenantContext';
import AuthRedirect from '@/components/AuthRedirect';
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
        if (userData.tenant && userData.tenant.slug) {
          const tenantSlug = userData.tenant.slug;
          
          // Try to validate the tenant by making a simple request to the public tenant API
          try {
            const tenantCheckResponse = await fetch(`/api/tenants/${tenantSlug}/public`, {
              method: 'GET',
            });

            if (tenantCheckResponse.ok) {
              setUserTenants([userData.tenant]);
              
              // Only auto-redirect if user explicitly wants to go to their tenant
              // Don't auto-redirect from the main homepage - let them choose
              // This prevents the unwanted automatic redirect issue
            } else {
              // Tenant doesn't exist or isn't accessible
              console.warn('Tenant not accessible:', tenantSlug, 'Status:', tenantCheckResponse.status);
            }
          } catch (validationError) {
            console.error('Error checking tenant accessibility:', validationError);
          }
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
      <div className="min-h-screen gradient-cosmic flex items-center justify-center">
        <div className="loading-shimmer rounded-full h-16 w-16 border-4 border-white/30"></div>
      </div>
    );
  }

  // If we have a tenant context (subdomain or path), show the tenant-specific landing page
  if (tenant) {
    return (
      <div className="min-h-screen gradient-cosmic pattern-dots">
        <Navigation />
        
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {tenant.logo && (
                <div className="mb-8 animate-bounce-in">
                  <Image
                    src={tenant.logo.asset?.url || '/placeholder-logo.png'}
                    alt={`${tenant.schoolName} logo`}
                    width={140}
                    height={140}
                    className="mx-auto rounded-3xl shadow-modern-lg floating"
                  />
                </div>
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-8 text-white animate-slide-up">
                Welcome to <span className="text-gradient-alt">{tenant.schoolName}</span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed animate-slide-up-delay mb-12">
                {tenant.description || 'Join our vibrant dance community and discover your passion through movement'}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center animate-scale-in">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="btn-gradient px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-modern-lg">
                      Start Your Journey
                    </button>
                  </SignInButton>
                  <Link
                    href="/sign-up"
                    className="btn-gradient-alt px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-modern-lg inline-block"
                  >
                    Join Now
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/classes"
                    className="btn-gradient px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-modern-lg inline-block"
                  >
                    Browse Classes
                  </Link>
                  <Link
                    href="/calendar"
                    className="btn-gradient-alt px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-modern-lg inline-block"
                  >
                    View Schedule
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-slide-up">
              Explore Our <span className="text-gradient-alt">Features</span>
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto animate-slide-up-delay">
              Everything you need for your dance journey in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link
              href="/classes"
              className="modern-card p-8 rounded-3xl hover-lift transition-smooth animate-slide-in-left animate-stagger-1"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto gradient-purple-blue">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center text-gradient">
                Our Classes
              </h3>
              <p className="text-gray-600 text-center text-lg leading-relaxed">
                Discover our comprehensive range of dance styles for every skill level and age group.
              </p>
            </Link>
            
            <Link
              href="/calendar"
              className="modern-card p-8 rounded-3xl hover-lift transition-smooth animate-slide-in-left animate-stagger-2"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto gradient-pink-orange">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center text-gradient">
                Class Schedule
              </h3>
              <p className="text-gray-600 text-center text-lg leading-relaxed">
                View our dynamic schedule and book your favorite classes with just a few clicks.
              </p>
            </Link>
            
            <Link
              href="/subscriptions"
              className="modern-card p-8 rounded-3xl hover-lift transition-smooth animate-slide-in-left animate-stagger-3 sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto gradient-blue-purple">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center text-gradient">
                Flexible Passes
              </h3>
              <p className="text-gray-600 text-center text-lg leading-relaxed">
                Choose from our variety of class passes and subscription options that fit your lifestyle.
              </p>
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <SignedOut>
            <div className="glass-card rounded-3xl p-12 text-center animate-scale-in">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">
                Ready to Start Your <span className="text-gradient-alt">Dance Journey?</span>
              </h2>
              <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of dancers who have discovered their passion with us. Your transformation begins today!
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <SignInButton mode="modal">
                  <button className="btn-gradient px-12 py-6 rounded-2xl text-white font-bold text-xl shadow-modern-lg">
                    Get Started Free
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="btn-gradient-alt px-12 py-6 rounded-2xl text-white font-bold text-xl shadow-modern-lg inline-block"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </SignedOut>
        </section>
      </div>
    );
  }

  // Platform homepage - show different content based on user state
  return (
    <div className="min-h-screen gradient-cosmic pattern-grid">
      <Navigation />
      
      <main className="relative overflow-hidden">
        {/* Hero Section for Platform */}
        <section className="relative py-8 sm:py-12">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Signed-in users with tenants - Platform Dashboard */}
            <SignedIn>
              {userTenants.length > 0 ? (
                <div className="text-center">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-8 animate-slide-up">
                    Welcome Back to <span className="text-gradient-alt">Dance-More</span>
                  </h1>
                  <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto mb-8 animate-slide-up-delay">
                    Access your dance school management portal and continue building your community.
                  </p>
                  
                  {/* User's Schools */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {userTenants.map((userTenant, index) => (
                      <div key={userTenant._id || userTenant.slug || index} className={`modern-card p-8 rounded-3xl hover-lift transition-smooth animate-slide-in-left animate-stagger-${index + 1}`}>
                        {userTenant.logo && (
                          <div className="mb-6">
                            <Image
                              src={userTenant.logo.asset?.url || '/placeholder-logo.png'}
                              alt={`${userTenant.schoolName} logo`}
                              width={100}
                              height={100}
                              className="mx-auto rounded-2xl shadow-modern"
                            />
                          </div>
                        )}
                        <h3 className="text-2xl font-bold text-center mb-6 text-gradient">{userTenant.schoolName}</h3>
                        <div className="flex flex-col gap-4">
                          <Link
                            href={`/${userTenant.slug}`}
                            className="btn-gradient px-6 py-4 rounded-xl text-white font-semibold text-center"
                          >
                            Visit School Portal
                          </Link>
                          <Link
                            href={`/${userTenant.slug}/admin`}
                            className="btn-gradient-alt px-6 py-4 rounded-xl text-white font-semibold text-center"
                          >
                            Admin Dashboard
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="glass-card p-8 rounded-3xl animate-scale-in">
                    <h3 className="text-2xl font-bold mb-6 text-gray-800">Quick Actions</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                      <Link
                        href="/register-school"
                        className="btn-gradient px-8 py-4 rounded-xl text-white font-semibold"
                      >
                        Register Another School
                      </Link>
                      <Link
                        href="/dashboard"
                        className="btn-gradient-alt px-8 py-4 rounded-xl text-white font-semibold"
                      >
                        Platform Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* Signed-in users without tenants */
                <div className="text-center">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-8 animate-slide-up">
                    Welcome to <span className="text-gradient-alt">Dance-More CMS</span>
                  </h1>
                  <p className="text-xl sm:text-2xl text-white/90 max-w-4xl mx-auto mb-8 animate-slide-up-delay">
                    You're signed in! Ready to create your dance school portal and start building your community?
                  </p>
                  <div className="animate-scale-in">
                    <Link
                      href="/register-school"
                      className="btn-gradient px-12 py-6 rounded-2xl text-white font-bold text-xl shadow-modern-lg inline-block"
                    >
                      Register Your Dance School
                    </Link>
                  </div>
                </div>
              )}
            </SignedIn>

            {/* Non-signed-in users - Marketing page */}
            <SignedOut>
              <div className="space-y-12">
                {/* Hero image and Features side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left side - Hero image */}
                  <div className="flex justify-center animate-slide-in-right">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl blur-2xl opacity-30 animate-pulse-glow"></div>
                      <Image
                        src="/dancemore.png"
                        alt="Dance More - Modern Dance School Management"
                        width={600}
                        height={600}
                        className="relative rounded-3xl shadow-modern-lg floating"
                        priority
                      />
                    </div>
                  </div>
                  
                  {/* Right side - Features */}
                  <div className="space-y-6">
                    
                    <div className="space-y-4">
                      <div className="modern-card p-6 rounded-2xl hover-lift transition-smooth animate-slide-in-left animate-stagger-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-purple-blue flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gradient mb-1">Custom Branding</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">Your own branded portal with custom logo, colors, and domain.</p>
                          </div>
                        </div>
                      </div>

                      <div className="modern-card p-6 rounded-2xl hover-lift transition-smooth animate-slide-in-left animate-stagger-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-pink-orange flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gradient mb-1">Smart Scheduling</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">Advanced class scheduling with automated notifications and waitlists.</p>
                          </div>
                        </div>
                      </div>

                      <div className="modern-card p-6 rounded-2xl hover-lift transition-smooth animate-slide-in-left animate-stagger-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-blue-purple flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gradient mb-1">Student Management</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">Complete student portal with booking and progress tracking.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SignedOut>
          </div>
        </section>


        {/* Additional CTA for non-signed-in users */}
        <SignedOut>
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="glass-card p-8 rounded-3xl text-center animate-scale-in">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">
                Ready to <span className="text-gradient-alt">Transform</span> Your Dance School?
              </h2>
              <p className="text-lg text-gray-700 mb-6 max-w-xl mx-auto leading-relaxed">
                Join hundreds of dance schools already using Dance-More.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <SignInButton mode="modal">
                  <button className="btn-gradient px-8 py-4 rounded-2xl text-white font-bold text-base shadow-modern-lg">
                    Sign In
                  </button>
                </SignInButton>
                <span className="text-white/60 text-sm">or</span>
                <Link
                  href="/register-school"
                  className="btn-gradient-alt px-8 py-4 rounded-2xl text-white font-bold text-base shadow-modern-lg inline-block"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </section>
        </SignedOut>
      </main>
    </div>
  );
}
