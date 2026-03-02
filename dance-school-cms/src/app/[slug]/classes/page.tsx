'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { AcademicCapIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ReadMoreText from '@/components/ReadMoreText';

interface ClassData {
  _id: string;
  title: string;
  description: string;
  instructor: {
    _id: string;
    name: string;
    email: string;
  };
  duration: number;
  capacity: number;
  level: string;
  price: number;
  isActive: boolean;
}

export default function ClassesPage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const tenantSlug = params.slug as string;

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`/api/classes/public?tenantSlug=${tenantSlug}`);
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        } else {
          setClasses([]);
        }
      } catch {
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    if (tenantSlug) {
      fetchClasses();
    }
  }, [tenantSlug]);

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
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <Link
              href={`/${tenantSlug}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Main Page
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Our Dance Classes
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Discover our wide range of dance classes for all skill levels. From beginner-friendly sessions to advanced workshops.
            </p>

            {/* Level Filter Pills */}
            {classes.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {['all', 'beginner', 'improvers', 'intermediate', 'advanced'].map((level) => {
                  const count = level === 'all' ? classes.length : classes.filter(c => c.level === level).length;
                  if (level !== 'all' && count === 0) return null;
                  return (
                    <button
                      key={level}
                      onClick={() => setActiveFilter(level)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        activeFilter === level
                          ? 'text-white shadow-md scale-105'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      style={activeFilter === level ? { backgroundColor: tenant.branding?.primaryColor || '#3B82F6' } : {}}
                    >
                      {level === 'all' ? 'All Classes' : level.charAt(0).toUpperCase() + level.slice(1)}
                      <span className={`ml-1.5 text-xs ${activeFilter === level ? 'text-white/80' : 'text-gray-400'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {(() => {
          const filtered = activeFilter === 'all' ? classes : classes.filter(c => c.level === activeFilter);
          return filtered.length === 0 && activeFilter !== 'all' ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No {activeFilter} classes available at the moment.</p>
              <button onClick={() => setActiveFilter('all')} className="mt-3 text-sm font-medium underline" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                View all classes
              </button>
            </div>
          ) : null;
        })()}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(activeFilter === 'all' ? classes : classes.filter(c => c.level === activeFilter)).map((classItem) => (
            <div key={classItem._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{classItem.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    classItem.level === 'beginner' 
                      ? 'bg-green-100 text-green-800'
                      : classItem.level === 'improvers'
                      ? 'bg-blue-100 text-blue-800'
                      : classItem.level === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : classItem.level === 'advanced'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {classItem.level.charAt(0).toUpperCase() + classItem.level.slice(1)}
                  </span>
                </div>
                
                <ReadMoreText 
                  text={classItem.description} 
                  className="text-gray-600 mb-4"
                  maxLength={120}
                />
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <AcademicCapIcon className="h-4 w-4 mr-2" />
                    <span>Instructor: {classItem.instructor?.name || 'TBA'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{classItem.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    <span>Max {classItem.capacity} students</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                    {classItem.price} kr
                  </div>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button 
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-colors text-sm sm:text-base"
                        style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                      >
                        <span className="sm:hidden">Sign In</span>
                        <span className="hidden sm:inline">Sign In to Book</span>
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href={`/${tenantSlug}/calendar`}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-colors inline-block text-center text-sm sm:text-base"
                      style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                    >
                      Book Class
                    </Link>
                  </SignedIn>
                </div>
              </div>
            </div>
          ))}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-12">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Check back soon for new classes!
            </p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
            Ready to Start Dancing?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join our community and discover the joy of dance!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${tenantSlug}/calendar`}
              className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
              style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
            >
              View Schedule
            </Link>
            <Link
              href={`/${tenantSlug}/subscriptions`}
              className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
              style={{ backgroundColor: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }}
            >
              View Passes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
