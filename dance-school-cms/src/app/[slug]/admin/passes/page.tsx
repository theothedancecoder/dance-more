'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { CreditCardIcon, PlusIcon, TicketIcon } from '@heroicons/react/24/outline';

interface PassData {
  _id: string;
  name: string;
  type: 'subscription' | 'clipcard';
  price: number;
  credits: number;
  validityDays: number;
  isActive: boolean;
  description?: string;
}

export default function PassesManagementPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [passes, setPasses] = useState<PassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    const fetchPasses = async () => {
      try {
        const response = await fetch('/api/admin/passes', {
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch passes');
        }

        const data = await response.json();
        setPasses(data.passes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPasses();
  }, [isLoaded, isSignedIn, userId, tenantSlug]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access passes management.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={`/${tenantSlug}/admin`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Passes & Clipcards</h1>
              <p className="text-sm text-gray-500">Create and manage subscription passes and clipcards</p>
            </div>
            <div className="flex space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <PlusIcon className="h-5 w-5" />
                <span>Create New Pass</span>
              </button>
              <Link
                href={`/${tenantSlug}/admin`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Passes</dt>
                    <dd className="text-lg font-medium text-gray-900">{passes.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TicketIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Passes</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {passes.filter(pass => pass.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg. Price</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {passes.length > 0 
                        ? `${(passes.reduce((sum, pass) => sum + pass.price, 0) / passes.length).toFixed(0)} kr`
                        : '0 kr'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {passes.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No passes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first pass or clipcard.
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Pass
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {passes.map((pass) => (
              <div key={pass._id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {pass.type === 'subscription' ? (
                        <CreditCardIcon className="h-8 w-8 text-blue-500" />
                      ) : (
                        <TicketIcon className="h-8 w-8 text-green-500" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{pass.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pass.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pass.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pass.type === 'subscription'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {pass.type === 'subscription' ? 'Subscription' : 'Clipcard'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Price:</span>
                      <span className="font-medium text-gray-900">{pass.price} kr</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>Credits:</span>
                      <span className="font-medium text-gray-900">{pass.credits}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>Valid for:</span>
                      <span className="font-medium text-gray-900">{pass.validityDays} days</span>
                    </div>
                  </div>

                  {pass.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{pass.description}</p>
                    </div>
                  )}

                  <div className="mt-6 flex space-x-3">
                    <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                      Edit
                    </button>
                    <button className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700">
                      View Sales
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <button className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Create Subscription
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Monthly or yearly subscriptions
                  </dd>
                </dl>
              </div>
            </div>
          </button>

          <button className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TicketIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Create Clipcard
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Multi-class credit packages
                  </dd>
                </dl>
              </div>
            </div>
          </button>

          <Link
            href={`/${tenantSlug}/admin/payments`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    View Payments
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Payment transactions and history
                  </dd>
                </dl>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
