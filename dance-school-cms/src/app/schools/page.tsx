'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import TenantSearch from '@/components/TenantSearch';

interface Tenant {
  _id: string;
  schoolName: string;
  slug: {
    current: string;
  };
  description?: string;
  logo?: {
    asset?: {
      url: string;
    };
  };
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  classCount: number;
  upcomingClasses: number;
  totalStudents?: number;
}

interface SearchResponse {
  tenants: Tenant[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'students' | 'classes'>('name');

  useEffect(() => {
    loadAllSchools();
  }, []);

  const loadAllSchools = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenants/public?limit=50&sort=name');
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setSchools(data.tenants);
      } else {
        setError('Failed to load dance schools');
      }
    } catch (err) {
      setError('Error loading dance schools');
      console.error('Error loading schools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedSchools = [...schools].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.schoolName.localeCompare(b.schoolName);
      case 'students':
        return (b.totalStudents || 0) - (a.totalStudents || 0);
      case 'classes':
        return b.classCount - a.classCount;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      
      {/* Header */}
      <section className="relative py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Discover <span className="text-gradient-alt">Dance Schools</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Find the perfect dance school for your journey. Browse through our community of passionate dance instructors and studios.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <TenantSearch 
                placeholder="Search dance schools by name or style..."
                className="w-full"
              />
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-600">
                {isLoading ? 'Loading...' : `${schools.length} dance school${schools.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'students' | 'classes')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">School Name</option>
                <option value="students">Most Students</option>
                <option value="classes">Most Classes</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Schools Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="flex space-x-4">
                  <div className="h-3 bg-gray-200 rounded flex-1"></div>
                  <div className="h-3 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 rounded-2xl p-8 max-w-md mx-auto">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Schools</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadAllSchools}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : sortedSchools.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Dance Schools Found</h3>
              <p className="text-gray-600">Check back later as more schools join our platform.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedSchools.map((school) => (
              <Link
                key={school._id}
                href={`/${school.slug.current}`}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
              >
                <div className="p-6">
                  {/* School Logo */}
                  <div className="flex items-center mb-4">
                    {school.logo?.asset?.url ? (
                      <Image
                        src={school.logo.asset.url}
                        alt={`${school.schoolName} logo`}
                        width={64}
                        height={64}
                        className="rounded-xl shadow-md group-hover:shadow-lg transition-shadow duration-300"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-2xl">
                          {school.schoolName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                        {school.schoolName}
                      </h3>
                      {school.branding?.primaryColor && (
                        <div 
                          className="w-12 h-1 rounded-full mt-2"
                          style={{ backgroundColor: school.branding.primaryColor }}
                        ></div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {school.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {school.description}
                    </p>
                  )}

                  {/* Visit Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      Visit School
                    </span>
                    <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Don't see your dance school?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join our platform and create your own branded dance school portal.
          </p>
          <Link
            href="/register-school"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register Your School
          </Link>
        </div>
      </section>
    </div>
  );
}
