'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface TenantSearchProps {
  placeholder?: string;
  showAllSchools?: boolean;
  className?: string;
}

export default function TenantSearch({ 
  placeholder = "Search for dance schools...", 
  showAllSchools = false,
  className = ""
}: TenantSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Tenant[]>([]);
  const [allSchools, setAllSchools] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load all schools on component mount if showAllSchools is true
  useEffect(() => {
    if (showAllSchools) {
      loadAllSchools();
    }
  }, [showAllSchools]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllSchools = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenants/public?limit=50');
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setAllSchools(data.tenants);
      } else {
        setError('Failed to load dance schools');
      }
    } catch (err) {
      setError('Error loading dance schools');
      console.error('Error loading all schools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (searchQuery: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tenants/public/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      
      if (response.ok) {
        const data: SearchResponse = await response.json();
        setResults(data.tenants);
        setIsOpen(true);
      } else {
        setError('Search failed');
        setResults([]);
      }
    } catch (err) {
      setError('Search error occurred');
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolClick = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/${slug}`);
  };

  const handleInputFocus = () => {
    if (query.trim() && results.length > 0) {
      setIsOpen(true);
    }
  };

  const displaySchools = showAllSchools && !query.trim() ? allSchools : results;

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-lg"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (displaySchools.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-96 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-red-600">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                <p className="text-sm font-medium text-gray-600">
                  {query.trim() ? `Found ${displaySchools.length} dance school${displaySchools.length !== 1 ? 's' : ''}` : `All Dance Schools (${displaySchools.length})`}
                </p>
              </div>

              {/* School Results */}
              <div className="py-2">
                {displaySchools.map((school) => (
                  <button
                    key={school._id}
                    onClick={() => handleSchoolClick(school.slug.current)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition-colors duration-150 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      {/* School Logo */}
                      <div className="flex-shrink-0">
                        {school.logo?.asset?.url ? (
                          <Image
                            src={school.logo.asset.url}
                            alt={`${school.schoolName} logo`}
                            width={48}
                            height={48}
                            className="rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-150"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {school.schoolName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* School Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-150 truncate">
                          {school.schoolName}
                        </h3>
                        {school.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {school.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            {school.classCount} classes
                          </span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {school.upcomingClasses} upcoming
                          </span>
                          {school.totalStudents !== undefined && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {school.totalStudents} students
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visit Arrow */}
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* View All Link */}
              {query.trim() && results.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                  <Link
                    href="/schools"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
                    onClick={() => setIsOpen(false)}
                  >
                    View all search results →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
