'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

interface Pass {
  _id: string;
  name: string;
  type: string;
  price: number;
  validityType: string | null;
  validityDays: number | null;
  expiryDate: string | null;
  classesLimit: number | null;
  isActive: boolean;
  _createdAt: string;
  _updatedAt: string;
}

export default function PassManagement() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPasses();
  }, []);

  const fetchPasses = async () => {
    try {
      const response = await fetch('/api/admin/passes');
      if (response.ok) {
        const data = await response.json();
        setPasses(data.passes);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch passes' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading passes' });
    } finally {
      setLoading(false);
    }
  };

  const togglePassStatus = async (passId: string, currentStatus: boolean) => {
    setUpdating(passId);
    try {
      const response = await fetch(`/api/admin/passes/${passId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message });
        
        // Update the local state
        setPasses(passes.map(pass => 
          pass._id === passId 
            ? { ...pass, isActive: !currentStatus }
            : pass
        ));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update pass' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating pass status' });
    } finally {
      setUpdating(null);
    }
  };

  const formatPrice = (price: number) => {
    return `${price} kr`;
  };

  const formatValidity = (pass: Pass) => {
    if (pass.validityType === 'date' && pass.expiryDate) {
      return `Fixed: ${new Date(pass.expiryDate).toLocaleDateString()}`;
    } else if (pass.validityDays) {
      return `${pass.validityDays} days`;
    }
    return 'Not configured';
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading passes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Pass Management
              </h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              All Passes ({passes.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage pass availability and settings. Inactive passes cannot be purchased by customers.
            </p>
          </div>

          <ul className="divide-y divide-gray-200">
            {passes.map((pass) => (
              <li key={pass._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {pass.name}
                      </h4>
                      {getStatusBadge(pass.isActive)}
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Type:</span>
                        <p className="text-sm text-gray-900 capitalize">{pass.type}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Price:</span>
                        <p className="text-sm text-gray-900">{formatPrice(pass.price)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Validity:</span>
                        <p className="text-sm text-gray-900">{formatValidity(pass)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Classes:</span>
                        <p className="text-sm text-gray-900">
                          {pass.classesLimit ? `${pass.classesLimit} classes` : 'Unlimited'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => togglePassStatus(pass._id, pass.isActive)}
                      disabled={updating === pass._id}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        pass.isActive
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      } ${updating === pass._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {updating === pass._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        pass.isActive ? 'Deactivate' : 'Activate'
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {passes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No passes found.</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pass Status Information
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Active passes</strong> are available for purchase by customers</li>
                <li><strong>Inactive passes</strong> are hidden from customers and cannot be purchased</li>
                <li>Existing subscriptions remain valid even if the pass is deactivated</li>
                <li>You can reactivate passes at any time</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
