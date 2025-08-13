'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import CookiePolicy from '@/components/CookiePolicy';
export default function TenantHomePage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();

  // Show loading while tenant context is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading school information...</p>
        </div>
      </div>
    );
  }

  // Only show error after loading is complete and we have an actual error
  if (!isLoading && (error || !tenant)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">School Not Found</h1>
          <p className="text-gray-600 mb-6">
            The dance school "{params.slug}" could not be found or is not available.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors mr-4"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 animate-gradient">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 animate-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-red-400/10 to-purple-600/10 animate-pulse"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-20 animate-bounce-in animate-stagger-1"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full opacity-20 animate-bounce-in animate-stagger-2"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-20 animate-bounce-in animate-stagger-3"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-gradient-to-r from-green-400 to-teal-500 rounded-full opacity-20 animate-bounce-in animate-stagger-4"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            {tenant?.logo?.asset?.url ? (
              <div className="mb-8 animate-bounce-in">
                <Image
                  src={tenant.logo.asset.url}
                  alt={`${tenant.schoolName} logo`}
                  width={120}
                  height={120}
                  className="mx-auto rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110 animate-pulse-glow"
                />
              </div>
            ) : (
              <div className="mb-8 animate-bounce-in">
                <Image
                  src="/dancemore.png"
                  alt={`${tenant?.schoolName || 'Dance School'} logo`}
                  width={120}
                  height={120}
                  className="mx-auto rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110 animate-pulse-glow"
                />
              </div>
            )}
            <h1 
              className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 animate-slide-up bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-gradient"
              style={{ 
                backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Welcome to {tenant?.schoolName}
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed animate-slide-up-delay font-medium">
              {tenant?.description || 'Join our vibrant dance community and explore our exciting classes'}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <Link
            href={`/${params.slug}/classes`}
            className="group bg-gradient-to-br from-white via-purple-50 to-pink-50 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in animate-stagger-1 border-2 border-transparent hover:border-purple-200"
            style={{ 
              borderTop: `6px solid ${tenant?.branding?.primaryColor || '#3B82F6'}`,
              background: `linear-gradient(135deg, white 0%, ${tenant?.branding?.primaryColor || '#3B82F6'}10 100%)`
            }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 animate-bounce-in" 
              style={{ 
                background: `linear-gradient(135deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'})`,
                boxShadow: `0 8px 32px ${tenant?.branding?.primaryColor || '#3B82F6'}40`
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 
              className="text-xl sm:text-2xl font-bold mb-4 text-center group-hover:scale-105 transition-transform bg-gradient-to-r bg-clip-text text-transparent"
              style={{ 
                backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Our Classes
            </h3>
            <p className="text-gray-700 text-center text-sm sm:text-base font-medium">
              Browse our wide range of dance classes for all skill levels.
            </p>
          </Link>
          
          <Link
            href={`/${params.slug}/calendar`}
            className="group bg-gradient-to-br from-white via-blue-50 to-cyan-50 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in animate-stagger-2 border-2 border-transparent hover:border-blue-200"
            style={{ 
              borderTop: `6px solid ${tenant?.branding?.secondaryColor || tenant?.branding?.primaryColor || '#3B82F6'}`,
              background: `linear-gradient(135deg, white 0%, ${tenant?.branding?.secondaryColor || '#8B5CF6'}10 100%)`
            }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 animate-bounce-in" 
              style={{ 
                background: `linear-gradient(135deg, ${tenant?.branding?.secondaryColor || '#8B5CF6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                boxShadow: `0 8px 32px ${tenant?.branding?.secondaryColor || '#8B5CF6'}40`
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 
              className="text-xl sm:text-2xl font-bold mb-4 text-center group-hover:scale-105 transition-transform bg-gradient-to-r bg-clip-text text-transparent"
              style={{ 
                backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.secondaryColor || '#8B5CF6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Class Schedule
            </h3>
            <p className="text-gray-700 text-center text-sm sm:text-base font-medium">
              View our class schedule and book your spot.
            </p>
          </Link>
          
          <Link
            href={`/${params.slug}/subscriptions`}
            className="group bg-gradient-to-br from-white via-yellow-50 to-orange-50 p-6 sm:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-scale-in animate-stagger-3 sm:col-span-2 lg:col-span-1 border-2 border-transparent hover:border-yellow-200"
            style={{ 
              borderTop: `6px solid ${tenant?.branding?.accentColor || tenant?.branding?.primaryColor || '#F59E0B'}`,
              background: `linear-gradient(135deg, white 0%, ${tenant?.branding?.accentColor || '#F59E0B'}10 100%)`
            }}
          >
            <div 
              className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 animate-bounce-in" 
              style={{ 
                background: `linear-gradient(135deg, ${tenant?.branding?.accentColor || '#F59E0B'}, ${tenant?.branding?.primaryColor || '#3B82F6'})`,
                boxShadow: `0 8px 32px ${tenant?.branding?.accentColor || '#F59E0B'}40`
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 
              className="text-xl sm:text-2xl font-bold mb-4 text-center group-hover:scale-105 transition-transform bg-gradient-to-r bg-clip-text text-transparent"
              style={{ 
                backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.accentColor || '#F59E0B'}, ${tenant?.branding?.primaryColor || '#3B82F6'})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Passes & Subscriptions
            </h3>
            <p className="text-gray-700 text-center text-sm sm:text-base font-medium">
              Choose from our range of flexible class passes.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <SignedOut>
            <div 
              className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl p-8 sm:p-12 border-2 border-transparent animate-scale-in relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, white 0%, ${tenant?.branding?.primaryColor || '#3B82F6'}05 50%, ${tenant?.branding?.secondaryColor || '#8B5CF6'}05 100%)`,
                boxShadow: `0 25px 50px -12px ${tenant?.branding?.primaryColor || '#3B82F6'}20`
              }}
            >
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-10 animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full opacity-10 animate-pulse"></div>
              
              <h2 
                className="text-3xl sm:text-4xl font-bold mb-6 bg-gradient-to-r bg-clip-text text-transparent animate-slide-up"
                style={{ 
                  backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Ready to Start Dancing?
              </h2>
              <p className="text-gray-700 mb-8 text-lg font-medium animate-slide-up-delay">
                Join our vibrant community and begin your dance journey today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                <SignInButton mode="modal">
                  <button 
                    className="px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-500 transform hover:scale-110 hover:shadow-2xl animate-bounce-in shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'})`,
                      boxShadow: `0 10px 30px ${tenant?.branding?.primaryColor || '#3B82F6'}40`
                    }}
                  >
                    Sign In
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-500 transform hover:scale-110 hover:shadow-2xl inline-block animate-bounce-in shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${tenant?.branding?.secondaryColor || '#8B5CF6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                    boxShadow: `0 10px 30px ${tenant?.branding?.secondaryColor || '#8B5CF6'}40`
                  }}
                >
                  Sign Up Now
                </Link>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div 
              className="bg-gradient-to-br from-white via-green-50 to-blue-50 rounded-3xl shadow-2xl p-8 sm:p-12 border-2 border-transparent animate-scale-in relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, white 0%, ${tenant?.branding?.primaryColor || '#3B82F6'}05 50%, ${tenant?.branding?.accentColor || '#F59E0B'}05 100%)`,
                boxShadow: `0 25px 50px -12px ${tenant?.branding?.primaryColor || '#3B82F6'}20`
              }}
            >
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-10 animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-10 animate-pulse"></div>
              
              <h2 
                className="text-3xl sm:text-4xl font-bold mb-6 bg-gradient-to-r bg-clip-text text-transparent animate-slide-up"
                style={{ 
                  backgroundImage: `linear-gradient(45deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.accentColor || '#F59E0B'})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Welcome Back!
              </h2>
              <p className="text-gray-700 mb-8 text-lg font-medium animate-slide-up-delay">
                Ready to continue your exciting dance journey?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                <Link
                  href={`/${params.slug}/calendar`}
                  className="px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-500 transform hover:scale-110 hover:shadow-2xl inline-block animate-bounce-in shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${tenant?.branding?.primaryColor || '#3B82F6'}, ${tenant?.branding?.secondaryColor || '#8B5CF6'})`,
                    boxShadow: `0 10px 30px ${tenant?.branding?.primaryColor || '#3B82F6'}40`
                  }}
                >
                  Book a Class
                </Link>
                <Link
                  href={`/${params.slug}/my-classes`}
                  className="px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-500 transform hover:scale-110 hover:shadow-2xl inline-block animate-bounce-in shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${tenant?.branding?.accentColor || '#F59E0B'}, ${tenant?.branding?.primaryColor || '#3B82F6'})`,
                    boxShadow: `0 10px 30px ${tenant?.branding?.accentColor || '#F59E0B'}40`
                  }}
                >
                  My Classes
                </Link>
              </div>
            </div>
          </SignedIn>
        </div>
      </section>

      {/* Cookie Policy */}
      <CookiePolicy tenantBranding={tenant?.branding} />
    </div>
  );
}
