'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import Link from 'next/link';
import { format } from 'date-fns';

interface Booking {
  _id: string;
  date: string;
  parentClass: {
    title: string;
    instructor: { name: string };
    danceStyle: string;
    location: string;
  };
  userBooking: {
    bookingType: string;
    bookingTime: string;
  };
}

export default function MyClassesPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (isLoaded && user && tenantSlug) {
      fetchBookings();
    }
  }, [isLoaded, user, tenantSlug]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error('Failed to fetch bookings:', response.statusText);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view your classes.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.date) > now);
  const pastBookings = bookings.filter(booking => new Date(booking.date) <= now);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href={`/${tenantSlug}`} className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                {tenant.schoolName}
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link href={`/${tenantSlug}`} className="text-gray-500 hover:text-gray-900">Home</Link>
              <Link href={`/${tenantSlug}/classes`} className="text-gray-500 hover:text-gray-900">Classes</Link>
              <Link href={`/${tenantSlug}/calendar`} className="text-gray-500 hover:text-gray-900">Calendar</Link>
              <Link href={`/${tenantSlug}/subscriptions`} className="text-gray-500 hover:text-gray-900">Passes</Link>
              <Link href={`/${tenantSlug}/my-classes`} className="text-gray-900 font-medium">My Classes</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
              <p className="text-gray-600 mt-2">View all your booked classes at {tenant.schoolName}</p>
            </div>
            <Link 
              href={`/${tenantSlug}`} 
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Classes</h2>
            {upcomingBookings.length > 0 && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {upcomingBookings.length} class{upcomingBookings.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 002.25 2.25v7.5m-18 0h18" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming classes booked</h3>
              <p className="text-gray-500 mb-6">Ready to start dancing? Browse our available classes and book your next session.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/${tenantSlug}/calendar`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90"
                  style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 002.25 2.25v7.5m-18 0h18" />
                  </svg>
                  View Calendar
                </Link>
                <Link
                  href={`/${tenantSlug}/classes`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium transition-colors hover:bg-gray-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  Browse Classes
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const classDate = new Date(booking.date);
                const now = new Date();
                const isToday = classDate.toDateString() === now.toDateString();
                const isTomorrow = classDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
                const daysUntil = Math.ceil((classDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={booking._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">{booking.parentClass.title}</h3>
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                              </svg>
                              {booking.parentClass.danceStyle}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {isToday ? (
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                                Today
                              </span>
                            ) : isTomorrow ? (
                              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                                Tomorrow
                              </span>
                            ) : daysUntil <= 7 ? (
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                                In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 002.25 2.25v7.5m-18 0h18" />
                              </svg>
                              <span className="font-medium">{format(classDate, 'EEEE, MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center text-gray-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">{format(classDate, 'h:mm a')}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                              <span>{booking.parentClass.instructor.name}</span>
                            </div>
                            <div className="flex items-center text-gray-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              <span>{booking.parentClass.location}</span>
                            </div>
                          </div>
                        </div>
                        
                        {booking.userBooking && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center text-xs text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Booked on {format(new Date(booking.userBooking.bookingTime), 'MMM d, yyyy')} • {booking.userBooking.bookingType}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Classes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Past Classes</h2>
          {pastBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No past classes</p>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-4 opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{booking.parentClass.title}</h3>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-gray-700">
                        {format(new Date(booking.date), 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Instructor: {booking.parentClass.instructor.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {booking.parentClass.location}
                      </p>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
