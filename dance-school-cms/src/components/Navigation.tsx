'use client';

import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { useState } from 'react';

export default function Navigation() {
  const { user, isLoaded } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isLoaded) return null;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Dance School
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/classes" className="text-gray-700 hover:text-blue-600 transition-colors">
              Classes
            </Link>
            <Link href="/calendar" className="text-gray-700 hover:text-blue-600 transition-colors">
              Calendar
            </Link>
            {user && (
              <Link href="/subscriptions" className="text-gray-700 hover:text-blue-600 transition-colors">
                My Subscriptions
              </Link>
            )}
            {user && (
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
            )}
            
            {user ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div className="flex space-x-4">
                <Link href="/sign-in" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Sign In
                </Link>
                <Link href="/sign-up" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/classes" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                Classes
              </Link>
              <Link href="/calendar" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                Calendar
              </Link>
              {user && (
                <Link href="/subscriptions" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  My Subscriptions
                </Link>
              )}
              {user && (
                <Link href="/dashboard" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
              )}
              
              {user ? (
                <div className="px-3 py-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Link href="/sign-in" className="block px-3 py-2 text-gray-700 hover:text-blue-600">
                    Sign In
                  </Link>
                  <Link href="/sign-up" className="block px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
