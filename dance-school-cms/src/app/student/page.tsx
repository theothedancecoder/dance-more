
'use client';

import { useState, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  CreditCardIcon, 
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface Subscription {
  _id: string;
  type: string;
  isActive: boolean;
  remainingClips?: number;
  endDate: string;
  passName?: string;
}

interface Booking {
  _id: string;
  date: string;
  parentClass: {
    title: string;
    instructor: { name: string };
    danceStyle: string;
    location: string;
  };
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user]);

  const fetchData = async () => {
    try {
      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/subscriptions');
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json();
        setSubscriptions(subscriptionsData.subscriptions || []);
      }

      // Fetch bookings
      const bookingsResponse = await fetch('/api/bookings');
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to access the student dashboard.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.date) > now).slice(0, 3);
  const activeSubscription = subscriptions.find(sub => 
    sub.isActive && new Date(sub.endDate) > now
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-purple-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Student Portal
                </h1>
              </div>
              <Link 
                href="/dashboard" 
                className="hidden sm:inline-flex items-center text-sm text-purple-600 hover:text-purple-800 transition-colors duration-200"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-700">
                  {user.fullName || user.firstName}
                </p>
                <p className="text-xs text-purple-600">Dance Student</p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4 animate-pulse">
            <HeartIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Welcome to your dance journey!
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            ✨ Manage your classes, track your progress, and dance your way to greatness! ✨
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Upcoming</p>
                <p className="text-2xl sm:text-3xl font-bold">{upcomingBookings.length}</p>
                <p className="text-blue-100 text-xs">Classes</p>
              </div>
              <div className="bg-white/20 rounded-full p-2 sm:p-3">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">Status</p>
                <p className="text-lg sm:text-xl font-bold">
                  {activeSubscription ? '✓ Active' : '✗ None'}
                </p>
                <p className="text-emerald-100 text-xs">Subscription</p>
              </div>
              <div className="bg-white/20 rounded-full p-2 sm:p-3">
                <CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1">Total</p>
                <p className="text-2xl sm:text-3xl font-bold">{bookings.length}</p>
                <p className="text-purple-100 text-xs">Bookings</p>
              </div>
              <div className="bg-white/20 rounded-full p-2 sm:p-3">
                <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm font-medium mb-1">Remaining</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {activeSubscription?.remainingClips ?? '∞'}
                </p>
                <p className="text-orange-100 text-xs">Classes</p>
              </div>
              <div className="bg-white/20 rounded-full p-2 sm:p-3">
                <FireIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Upcoming Classes */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-6 w-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Upcoming Classes</h3>
                </div>
              </div>
              <div className="p-6">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="h-10 w-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No upcoming classes</h3>
                    <p className="text-gray-600 mb-6">
                      🎭 Ready to start your dance adventure? Book your first class!
                    </p>
                    <Link
                      href="/calendar"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
                    >
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Browse Classes
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking, index) => (
                      <div key={booking._id} className="bg-gradient-to-r from-white to-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500 animate-pulse' : 'bg-purple-500'}`}></div>
                              <h4 className="font-bold text-gray-900 text-lg">{booking.parentClass.title}</h4>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="text-purple-700 font-semibold">
                                📅 {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                              </p>
                              <p className="text-purple-600">
                                🕐 {format(new Date(booking.date), 'h:mm a')}
                              </p>
                              <p className="text-gray-600">
                                👨‍🏫 {booking.parentClass.instructor.name}
                              </p>
                              <p className="text-gray-600">
                                📍 {booking.parentClass.location}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                              ✓ Booked
                            </span>
                            {index === 0 && (
                              <span className="bg-gradient-to-r from-orange-400 to-red-400 text-white px-3 py-1 rounded-full text-xs font-semibold animate-bounce">
                                Next Up!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-6">
                      <Link
                        href="/my-classes"
                        className="inline-flex items-center text-purple-600 hover:text-purple-800 font-semibold transition-colors duration-200"
                      >
                        View All My Classes 
                        <StarIcon className="h-4 w-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Subscription Status */}
          <div className="space-y-6">
            {/* Subscription Status */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
              <div className={`px-6 py-4 ${activeSubscription ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}>
                <div className="flex items-center space-x-2">
                  {activeSubscription ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  )}
                  <h3 className="text-lg font-bold text-white">Subscription</h3>
                </div>
              </div>
              <div className="p-6">
                {activeSubscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-800 font-bold text-lg">Active Plan</span>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-gray-700">
                        📋 {activeSubscription.passName || activeSubscription.type}
                      </p>
                      <p className="text-sm text-gray-600">
                        🎯 {activeSubscription.remainingClips ?? '∞'} classes remaining
                      </p>
                      <p className="text-sm text-gray-600">
                        ⏰ Expires: {format(new Date(activeSubscription.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-orange-800 font-bold text-lg">No Active Plan</span>
                    </div>
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        🚀 Get a subscription to unlock unlimited dancing!
                      </p>
                      <Link
                        href="/subscriptions"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                      >
                        <CreditCardIcon className="h-4 w-4 mr-2" />
                        Get Started
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-bold text-white">Quick Actions</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <Link
                  href="/calendar"
                  className="flex items-center p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full p-3 mr-4">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Browse Classes</p>
                    <p className="text-sm text-gray-600">🔍 Find your perfect class</p>
                  </div>
                </Link>

                <Link
                  href="/my-classes"
                  className="flex items-center p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 hover:from-emerald-100 hover:to-green-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full p-3 mr-4">
                    <BookOpenIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">My Classes</p>
                    <p className="text-sm text-gray-600">📚 Your dance schedule</p>
                  </div>
                </Link>

                <Link
                  href="/subscriptions"
                  className="flex items-center p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-3 mr-4">
                    <CreditCardIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Subscriptions</p>
                    <p className="text-sm text-gray-600">💳 Manage your plans</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
