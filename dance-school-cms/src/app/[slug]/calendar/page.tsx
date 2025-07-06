'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { CalendarIcon, ClockIcon, UserGroupIcon, MapPinIcon } from '@heroicons/react/24/outline';

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

export default function CalendarPage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    const fetchClassInstances = async () => {
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // Get next 30 days

        const response = await fetch(`/api/classes/instances/public?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&tenantSlug=${tenantSlug}`);

        if (response.ok) {
          const data = await response.json();
          setClassInstances(data.instances || []);
        } else {
          console.error('Failed to fetch class instances:', response.statusText);
          setClassInstances([]);
        }
      } catch (err) {
        console.error('Error fetching class instances:', err);
        setClassInstances([]);
      } finally {
        setLoading(false);
      }
    };

    if (tenantSlug) {
      fetchClassInstances();
    }
  }, [tenantSlug]);

  const filteredInstances = classInstances.filter(instance => instance.date === selectedDate);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
              <Link href={`/${tenantSlug}/calendar`} className="text-gray-900 font-medium">Calendar</Link>
              <Link href={`/${tenantSlug}/subscriptions`} className="text-gray-500 hover:text-gray-900">Passes</Link>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-gray-500 hover:text-gray-900">Sign In</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href={`/${tenantSlug}/my-classes`} className="text-gray-500 hover:text-gray-900">My Classes</Link>
              </SignedIn>
            </nav>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Class Schedule
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Book your spot in our upcoming dance classes. Select a date to see available sessions.
            </p>
          </div>
        </div>
      </section>

      {/* Calendar Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Date Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
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
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((days) => {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = date.getDate();
                    
                    return (
                      <button
                        key={days}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          selectedDate === dateStr
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${dayName} ${dayNum}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Class Instances */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Classes for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
            </div>

            {filteredInstances.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No classes scheduled</h3>
                <p className="mt-1 text-gray-500">
                  There are no classes scheduled for this date. Try selecting a different date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstances.map((instance) => (
                  <div key={instance._id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{instance.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            instance.level === 'Beginner' 
                              ? 'bg-green-100 text-green-800'
                              : instance.level === 'Intermediate'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {instance.level}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            <span>{instance.startTime} - {instance.endTime}</span>
                          </div>
                          <div className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 mr-2" />
                            <span>{instance.booked}/{instance.capacity} booked</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium">Instructor: {instance.instructor}</span>
                          </div>
                          {instance.location && (
                            <div className="flex items-center">
                              <MapPinIcon className="h-4 w-4 mr-2" />
                              <span>{instance.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                            {instance.price} kr
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-500">
                              {instance.capacity - instance.booked} spots left
                            </div>
                            
                            {instance.booked >= instance.capacity ? (
                              <button 
                                disabled
                                className="px-6 py-2 rounded-lg bg-gray-300 text-gray-500 font-medium cursor-not-allowed"
                              >
                                Fully Booked
                              </button>
                            ) : (
                              <>
                                <SignedOut>
                                  <SignInButton mode="modal">
                                    <button 
                                      className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
                                      style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                                    >
                                      Sign In to Book
                                    </button>
                                  </SignInButton>
                                </SignedOut>
                                <SignedIn>
                                  <button 
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-colors hover:opacity-90"
                                    style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                                  >
                                    Book Now
                                  </button>
                                </SignedIn>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
            Need a Class Pass?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Save money with our flexible class passes and subscription options.
          </p>
          <Link
            href={`/${tenantSlug}/subscriptions`}
            className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
            style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
          >
            View Passes & Subscriptions
          </Link>
        </div>
      </section>
    </div>
  );
}
