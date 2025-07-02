import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-6xl px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Dance School CMS
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Complete dance school management with class scheduling, subscription management, and booking system
            </p>
          </div>
          
          <SignedOut>
            <div className="flex flex-col space-y-4 max-w-md mx-auto mb-12">
              <SignInButton mode="modal">
                <button className="rounded-md bg-blue-500 px-6 py-3 text-center text-white hover:bg-blue-600 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="rounded-md bg-green-500 px-6 py-3 text-center text-white hover:bg-green-600 transition-colors"
              >
                Sign Up
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                href="/classes"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Dance Classes
                </h3>
                <p className="text-gray-600">
                  Browse our wide range of dance classes for all skill levels.
                </p>
              </Link>
              
              <Link
                href="/calendar"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Class Calendar
                </h3>
                <p className="text-gray-600">
                  View and book classes in our interactive calendar.
                </p>
              </Link>
              
              <Link
                href="/blog"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Blog & News
                </h3>
                <p className="text-gray-600">
                  Stay updated with the latest news and tips from our dance community.
                </p>
              </Link>
              
              <Link
                href="/studio"
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sanity Studio
                </h3>
                <p className="text-gray-600">
                  Content management system for administrators.
                </p>
              </Link>
            </div>
          </SignedOut>
          
          <SignedIn>
            <div className="text-center mb-8">
              <p className="text-lg text-gray-600 mb-6">Welcome back! Choose what you'd like to do:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/dashboard"
                  className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <h3 className="font-semibold mb-1">Dashboard</h3>
                  <p className="text-sm opacity-90">Overview and quick actions</p>
                </Link>
                <Link
                  href="/calendar"
                  className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  <h3 className="font-semibold mb-1">Book Classes</h3>
                  <p className="text-sm opacity-90">View calendar and book classes</p>
                </Link>
                <Link
                  href="/subscriptions"
                  className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <h3 className="font-semibold mb-1">My Subscriptions</h3>
                  <p className="text-sm opacity-90">Manage subscriptions and bookings</p>
                </Link>
                <Link
                  href="/classes"
                  className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <h3 className="font-semibold mb-1">Browse Classes</h3>
                  <p className="text-sm opacity-90">View all available classes</p>
                </Link>
              </div>
              <div className="mt-8">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </SignedIn>

          {/* Features Section */}
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              New Scheduling Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring Classes</h3>
                <p className="text-gray-600">Set up weekly recurring classes with automatic instance generation</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Subscriptions & Clipcards</h3>
                <p className="text-gray-600">Monthly unlimited passes and 10-class clipcards for flexible booking</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Booking</h3>
                <p className="text-gray-600">Interactive calendar with real-time availability and instant booking</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
