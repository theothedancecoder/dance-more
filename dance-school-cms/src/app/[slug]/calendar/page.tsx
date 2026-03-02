'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, MapPinIcon, TableCellsIcon, ViewColumnsIcon } from '@heroicons/react/24/outline';
import WeeklySchedule from '@/components/WeeklySchedule';
import ClassCalendar from '@/components/ClassCalendar';

interface ClassInstance {
  _id: string;
  title: string;
  instructor: string;
  startTime: string;
  endTime: string;
  date: string;
  capacity: number;
  booked: number;
  price: number;
  level: string;
  location?: string;
}

type ViewMode = 'calendar' | 'weekly' | 'daily';

export default function CalendarPage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string; redirectUrl?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [confirmInstance, setConfirmInstance] = useState<ClassInstance | null>(null);

  const tenantSlug = params.slug as string;

  const handleBookClass = async (classInstanceId: string) => {
    // If called from the confirm modal, proceed; otherwise show the modal first
    if (!confirmInstance || confirmInstance._id !== classInstanceId) {
      const instance = classInstances.find(i => i._id === classInstanceId);
      if (instance) {
        setConfirmInstance(instance);
        return;
      }
    }
    setConfirmInstance(null);
    setBookingLoading(classInstanceId);
    setBookingMessage(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ classInstanceId }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Class booked successfully!' });
        
        // Update the class instance in the local state
        setClassInstances(prev => prev.map(instance => 
          instance._id === classInstanceId 
            ? { ...instance, booked: instance.booked + 1 }
            : instance
        ));
        
        // Clear success message after 3 seconds
        setTimeout(() => setBookingMessage(null), 3000);
      } else {
        // Handle enhanced error messages with redirect URLs
        let errorText = data.error || 'Failed to book class';
        if (data.message) {
          errorText = data.message;
        }
        if (data.redirectUrl) {
          errorText += ` Click here to visit the Passes & Subscriptions page.`;
        }
        
        setBookingMessage({ 
          type: 'error', 
          text: errorText,
          redirectUrl: data.redirectUrl 
        });
        // Clear error message after 8 seconds (longer for redirect messages)
        setTimeout(() => setBookingMessage(null), 8000);
      }
    } catch (error) {
      console.error('Error booking class:', error);
      setBookingMessage({ type: 'error', text: 'Network error. Please try again.' });
      setTimeout(() => setBookingMessage(null), 5000);
    } finally {
      setBookingLoading(null);
    }
  };

  useEffect(() => {
    const fetchClassInstances = async () => {
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30);

        const response = await fetch(`/api/classes/instances/public?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&tenantSlug=${tenantSlug}`);

        if (response.ok) {
          const data = await response.json();
          setClassInstances(data.instances || []);
        } else {
          setClassInstances([]);
        }
      } catch {
        setClassInstances([]);
      } finally {
        setLoading(false);
      }
    };

    if (tenantSlug) {
      fetchClassInstances();
    }
  }, [tenantSlug]);

  const filteredInstances = classInstances.filter(instance => {
    // Extract date part from ISO string for comparison
    const instanceDate = instance.date.split('T')[0];
    return instanceDate === selectedDate;
  });

  if (isLoading || loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Class Schedule
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8">
              Book your spot in our upcoming dance classes. Choose your preferred view below.
            </p>
            
            {/* View Mode Selector */}
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center justify-center px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <TableCellsIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Weekly Table</span>
                <span className="sm:hidden">Weekly</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center justify-center px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Calendar View</span>
                <span className="sm:hidden">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center justify-center px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ViewColumnsIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Daily View</span>
                <span className="sm:hidden">Daily</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Message */}
      {bookingMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className={`p-4 rounded-lg ${
            bookingMessage.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {bookingMessage.redirectUrl ? (
              <div>
                {bookingMessage.text.replace(' Click here to visit the Passes & Subscriptions page.', '')}{' '}
                <a 
                  href={bookingMessage.redirectUrl}
                  className="underline font-medium hover:no-underline"
                >
                  Click here to visit the Passes & Subscriptions page.
                </a>
              </div>
            ) : (
              bookingMessage.text
            )}
          </div>
        </div>
      )}

      {/* Calendar Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {viewMode === 'weekly' && (
          <WeeklySchedule 
            tenantSlug={tenantSlug} 
            onBookClass={handleBookClass}
            bookingLoading={bookingLoading}
          />
        )}

        {viewMode === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <ClassCalendar />
          </div>
        )}

        {viewMode === 'daily' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
            {/* Date Selector */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                  Select Date
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((days) => {
                      const date = new Date();
                      date.setDate(date.getDate() + days);
                      // Use local date string to avoid timezone issues
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;
                      
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = date.getDate();
                      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                      
                      return (
                        <button
                          key={days}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                            selectedDate === dateStr
                              ? 'bg-blue-100 text-blue-800'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${dayName} ${monthName} ${dayNum}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Class Instances */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Classes for {(() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const date = new Date(year, month - 1, day); // month is 0-indexed
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric'
                    });
                  })()}
                </h2>
              </div>

              {filteredInstances.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No classes scheduled</h3>
                  <p className="mt-1 text-gray-500">
                    There are no classes scheduled for this date. Try selecting a different date.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInstances.map((instance) => (
                    <div key={instance._id} className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-0">{instance.title}</h3>
                          <span className={`self-start sm:self-center px-3 py-1 rounded-full text-sm font-medium ${
                            instance.level === 'Beginner' 
                              ? 'bg-green-100 text-green-800'
                              : instance.level === 'Intermediate'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {instance.level}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{instance.startTime} - {instance.endTime}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium">Instructor: {instance.instructor}</span>
                          </div>
                          {instance.location && (
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>{instance.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                            {instance.price} {tenant?.settings?.currency || tenant?.stripeConnect?.currency || 'kr'}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            {instance.booked >= instance.capacity ? (
                              <button 
                                disabled
                                className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg bg-gray-300 text-gray-500 font-medium cursor-not-allowed"
                              >
                                Fully Booked
                              </button>
                            ) : (
                              <>
                                <SignedOut>
                                  <SignInButton mode="modal">
                                    <button 
                                      className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-colors"
                                      style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                                    >
                                      Sign In to Book
                                    </button>
                                  </SignInButton>
                                </SignedOut>
                                <SignedIn>
                                  <button 
                                    onClick={() => handleBookClass(instance._id)}
                                    disabled={bookingLoading === instance._id}
                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                                  >
                                    {bookingLoading === instance._id ? 'Booking...' : 'Book Now'}
                                  </button>
                                </SignedIn>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
            Need a Class Pass?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
            Save money with our flexible class passes and subscription options.
          </p>
          <Link
            href={`/${tenantSlug}/subscriptions`}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
            style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
          >
            View Passes & Subscriptions
          </Link>
        </div>
      </section>

      {/* Booking Confirmation Modal */}
      {confirmInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
              <button
                onClick={() => setConfirmInstance(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">{confirmInstance.title}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{(() => {
                    const [y, m, d] = confirmInstance.date.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  })()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{confirmInstance.startTime} – {confirmInstance.endTime}</span>
                </div>
                {confirmInstance.location && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{confirmInstance.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 col-span-2">
                  <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Instructor: {confirmInstance.instructor}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">Spots available</span>
                <span className="text-sm font-medium text-gray-700">{confirmInstance.capacity - confirmInstance.booked} / {confirmInstance.capacity}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              This class will be deducted from your active pass. Make sure you can attend before confirming.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmInstance(null)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBookClass(confirmInstance._id)}
                disabled={bookingLoading === confirmInstance._id}
                className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
              >
                {bookingLoading === confirmInstance._id ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
