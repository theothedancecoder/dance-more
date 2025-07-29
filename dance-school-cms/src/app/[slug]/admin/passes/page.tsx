'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { CreditCardIcon, PlusIcon, TicketIcon } from '@heroicons/react/24/outline';

interface PassData {
  _id: string;
  name: string;
  type: 'single' | 'multi-pass' | 'multi' | 'unlimited';
  price: number;
  validityType: 'days' | 'date';
  validityDays?: number;
  expiryDate?: string;
  classesLimit?: number;
  isActive: boolean;
  description?: string;
}

export default function PassesManagementPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [passes, setPasses] = useState<PassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPass, setEditingPass] = useState<PassData | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  const handleCreatePass = async (formData: {
    name: string;
    description: string;
    type: string;
    price: number;
    validityType: string;
    validityDays?: number;
    expiryDate?: string;
    classesLimit?: number;
    isActive: boolean;
  }) => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/passes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create pass');
      }

      const result = await response.json();
      
      // Refresh the passes list
      const updatedResponse = await fetch('/api/admin/passes', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        setPasses(data.passes || []);
      }
      
      setShowCreateModal(false);
      alert('Pass created successfully!');
    } catch (err) {
      alert('Failed to create pass: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleEditPass = (pass: PassData) => {
    setEditingPass(pass);
    setShowEditModal(true);
  };

  const handleUpdatePass = async (formData: {
    name: string;
    description: string;
    type: string;
    price: number;
    validityType: string;
    validityDays?: number;
    expiryDate?: string;
    classesLimit?: number;
    isActive: boolean;
  }) => {
    if (!editingPass) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/passes/${editingPass._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update pass');
      }

      const result = await response.json();
      
      // Refresh the passes list
      const updatedResponse = await fetch('/api/admin/passes', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });
      
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        setPasses(data.passes || []);
      }
      
      setShowEditModal(false);
      setEditingPass(null);
      alert('Pass updated successfully!');
    } catch (err) {
      alert('Failed to update pass: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  };

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
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
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
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
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
                      {['unlimited', 'multi'].includes(pass.type) ? (
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
                          pass.type === 'unlimited'
                            ? 'bg-blue-100 text-blue-800'
                            : pass.type === 'multi'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {pass.type === 'single' ? 'Single Class' : 
                           pass.type === 'multi-pass' ? 'Multi-Class Pass' :
                           pass.type === 'multi' ? 'Clipcard' : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Price:</span>
                      <span className="font-medium text-gray-900">{pass.price} kr</span>
                    </div>
                    {pass.classesLimit && (
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>Classes:</span>
                        <span className="font-medium text-gray-900">{pass.classesLimit}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>Validity:</span>
                      <span className="font-medium text-gray-900">
                        {pass.validityType === 'days' && pass.validityDays 
                          ? `${pass.validityDays} days`
                          : pass.validityType === 'date' && pass.expiryDate
                          ? `Until ${new Date(pass.expiryDate).toLocaleDateString()}`
                          : 'Not set'
                        }
                      </span>
                    </div>
                  </div>

                  {pass.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{pass.description}</p>
                    </div>
                  )}

                  <div className="mt-6 flex space-x-3">
                    <button 
                      onClick={() => handleEditPass(pass)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5"
          >
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

          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5"
          >
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

      {/* Create Pass Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Pass</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const validityType = formData.get('validityType') as string;
                const data = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  type: formData.get('type') as string,
                  price: Number(formData.get('price')),
                  validityType,
                  validityDays: validityType === 'days' ? Number(formData.get('validityDays')) : undefined,
                  expiryDate: validityType === 'date' ? formData.get('expiryDate') as string : undefined,
                  classesLimit: ['multi', 'multi-pass'].includes(formData.get('type') as string) ? Number(formData.get('classesLimit')) : undefined,
                  isActive: formData.get('isActive') === 'on',
                };
                handleCreatePass(data);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Monthly Pass"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe what this pass includes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      name="type"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="single">Single Class</option>
                      <option value="multi">Multi-Class Package</option>
                      <option value="unlimited">Unlimited</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (kr)</label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="299"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Validity Type</label>
                    <select
                      name="validityType"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const form = e.target.form;
                        const validityDaysField = form?.querySelector('[name="validityDays"]') as HTMLInputElement;
                        const expiryDateField = form?.querySelector('[name="expiryDate"]') as HTMLInputElement;
                        
                        if (e.target.value === 'days') {
                          validityDaysField.style.display = 'block';
                          expiryDateField.style.display = 'none';
                          validityDaysField.required = true;
                          expiryDateField.required = false;
                        } else {
                          validityDaysField.style.display = 'none';
                          expiryDateField.style.display = 'block';
                          validityDaysField.required = false;
                          expiryDateField.required = true;
                        }
                      }}
                    >
                      <option value="days">Valid for X days from purchase</option>
                      <option value="date">Valid until specific date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valid for (days)</label>
                    <input
                      type="number"
                      name="validityDays"
                      required
                      min="1"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="datetime-local"
                      name="expiryDate"
                      style={{ display: 'none' }}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Classes Limit (for multi-class packages)</label>
                    <input
                      type="number"
                      name="classesLimit"
                      min="1"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Active (available for purchase)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pass Modal */}
      {showEditModal && editingPass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Pass</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const validityType = formData.get('validityType') as string;
                const data = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  type: formData.get('type') as string,
                  price: Number(formData.get('price')),
                  validityType,
                  validityDays: validityType === 'days' ? Number(formData.get('validityDays')) : undefined,
                  expiryDate: validityType === 'date' ? formData.get('expiryDate') as string : undefined,
                  classesLimit: ['multi', 'multi-pass'].includes(formData.get('type') as string) ? Number(formData.get('classesLimit')) : undefined,
                  isActive: formData.get('isActive') === 'on',
                };
                handleUpdatePass(data);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingPass.name}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Monthly Pass"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={editingPass.description || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe what this pass includes..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      name="type"
                      required
                      defaultValue={editingPass.type}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="single">Single Class</option>
                      <option value="multi">Multi-Class Package</option>
                      <option value="unlimited">Unlimited</option>
                      <option value="multi-pass">Multi-Pass</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (kr)</label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="0.01"
                      defaultValue={editingPass.price}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="299"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Validity Type</label>
                    <select
                      name="validityType"
                      required
                      defaultValue={editingPass.validityType}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        const form = e.target.form;
                        const validityDaysField = form?.querySelector('[name="validityDays"]') as HTMLInputElement;
                        const expiryDateField = form?.querySelector('[name="expiryDate"]') as HTMLInputElement;
                        
                        if (e.target.value === 'days') {
                          validityDaysField.style.display = 'block';
                          expiryDateField.style.display = 'none';
                          validityDaysField.required = true;
                          expiryDateField.required = false;
                        } else {
                          validityDaysField.style.display = 'none';
                          expiryDateField.style.display = 'block';
                          validityDaysField.required = false;
                          expiryDateField.required = true;
                        }
                      }}
                    >
                      <option value="days">Valid for X days from purchase</option>
                      <option value="date">Valid until specific date</option>
                    </select>
                  </div>

                  <div style={{ display: editingPass.validityType === 'days' ? 'block' : 'none' }}>
                    <label className="block text-sm font-medium text-gray-700">Valid for (days)</label>
                    <input
                      type="number"
                      name="validityDays"
                      required={editingPass.validityType === 'days'}
                      min="1"
                      defaultValue={editingPass.validityDays || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="30"
                    />
                  </div>

                  <div style={{ display: editingPass.validityType === 'date' ? 'block' : 'none' }}>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="datetime-local"
                      name="expiryDate"
                      required={editingPass.validityType === 'date'}
                      defaultValue={editingPass.expiryDate ? new Date(editingPass.expiryDate).toISOString().slice(0, 16) : ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Classes Limit (for multi-class packages)</label>
                    <input
                      type="number"
                      name="classesLimit"
                      min="1"
                      defaultValue={editingPass.classesLimit || ''}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingPass.isActive}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Active (available for purchase)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingPass(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Pass'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
