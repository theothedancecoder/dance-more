'use client';

import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import Image from 'next/image';

export default function Navigation() {
  const { user, isLoaded } = useUser();
  const { tenant } = useTenant();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isLoaded) return null;

  const brandName = tenant?.schoolName || 'DANCE-MORE SCHOOL MANAGEMENT SYSTEM';
  const brandColor = tenant?.branding?.primaryColor || '#3B82F6';

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            {tenant?.logo && (
              <Image
                src={tenant.logo.asset?.url || '/placeholder-logo.png'}
                alt={`${tenant.schoolName} logo`}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <Link 
              href="/" 
              className="text-xl font-bold"
              style={{ color: brandColor }}
            >
              {brandName}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {tenant ? (
              // Tenant-specific navigation
              <>
                <Link href="/classes" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Classes
                </Link>
                <Link href="/calendar" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Calendar
                </Link>
                {user && (
                  <Link href="/subscriptions" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                    My Subscriptions
                  </Link>
                )}
              </>
            ) : (
              // Platform navigation
              <>
                {user && (
                  <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                    Dashboard
                  </Link>
                )}
                <Link href="/register-school" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Register School
                </Link>
              </>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/sign-in" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Sign In
                </Link>
                <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <div className="mr-4">
                <UserButton afterSignOutUrl="/" />
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden fixed inset-0 z-50 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMenuOpen(false)}
          ></div>
          
          {/* Menu Content */}
          <div className="relative w-4/5 max-w-sm h-full bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-gray-900" onClick={() => setIsMenuOpen(false)}>
                  Dance School
                </Link>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-4 space-y-2">
                {tenant ? (
                  // Tenant-specific navigation
                  <>
                    <Link 
                      href="/classes" 
                      className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Classes
                    </Link>
                    <Link 
                      href="/calendar" 
                      className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Calendar
                    </Link>
                    {user && (
                      <Link 
                        href="/subscriptions" 
                        className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Subscriptions
                      </Link>
                    )}
                  </>
                ) : (
                  // Platform navigation
                  <>
                    {user && (
                      <Link 
                        href="/dashboard" 
                        className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link 
                      href="/register-school" 
                      className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Register School
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {!user && (
              <div className="p-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/sign-in"
                    className="flex justify-center items-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex justify-center items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
