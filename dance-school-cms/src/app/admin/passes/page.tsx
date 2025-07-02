'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface Pass {
  _id?: string;
  name: string;
  description: string;
  type: 'single' | 'multi-pass' | 'multi' | 'unlimited';
  price: number;
  validityDays: number;
  classesLimit: number | null;
  isActive: boolean;
}

export default function PassesManagementPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPass, setEditingPass] = useState<Pass | null>(null);
  const [formData, setFormData] = useState<Pass>({
    name: '',
    description: '',
    type: 'multi',
    price: 0,
    validityDays: 30,
    classesLimit: 10,
    isActive: true
  });

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in');
      return;
    }
    if (userId) {
      fetchPasses();
    }
  }, [isLoaded, userId, router]);

  const fetchPasses = async () => {
    try {
      const response = await fetch('/api/admin/passes');
      if (response.ok) {
        const data = await response.json();
        setPasses(data.passes || []);
      }
    } catch (error) {
      console.error('Error fetching passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked :
               value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPass ? `/api/admin/passes/${editingPass._id}` : '/api/admin/passes';
      const method = editingPass ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchPasses();
        resetForm();
        alert(editingPass ? 'Pass updated successfully!' : 'Pass created successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save pass');
      }
    } catch (error) {
      console.error('Error saving pass:', error);
      alert('Failed to save pass');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'multi',
      price: 0,
      validityDays: 30,
      classesLimit: 10,
      isActive: true
    });
    setShowCreateForm(false);
    setEditingPass(null);
  };

  const handleEdit = (pass: Pass) => {
    setFormData(pass);
    setEditingPass(pass);
    setShowCreateForm(true);
  };

  const handleDelete = async (passId: string) => {
    if (!confirm('Are you sure you want to delete this pass?')) return;
    
    try {
      const response = await fetch(`/api/admin/passes/${passId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchPasses();
        alert('Pass deleted successfully!');
      } else {
        alert('Failed to delete pass');
      }
    } catch (error) {
      console.error('Error deleting pass:', error);
      alert('Failed to delete pass');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Passes & Clipcards Management</h1>
              <p className="text-gray-600 mt-2">
                Create and manage subscription passes and clipcards for your dance school
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Admin</span>
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create New Pass
              </button>
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingPass ? 'Edit Pass' : 'Create New Pass'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pass Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., 10-Class Clipcard"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pass Type *
                  </label>
                  <select
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="single">Single Class</option>
                    <option value="multi-pass">Multi-Class Pass</option>
                    <option value="multi">Multi-Class (Clipcard)</option>
                    <option value="unlimited">Unlimited Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (kr) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validity (Days) *
                  </label>
                  <input
                    type="number"
                    name="validityDays"
                    required
                    min="1"
                    value={formData.validityDays}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {(formData.type === 'multi' || formData.type === 'multi-pass') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Classes *
                    </label>
                    <input
                      type="number"
                      name="classesLimit"
                      required
                      min="1"
                      value={formData.classesLimit || ''}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Active (available for purchase)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Describe what this pass includes..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingPass ? 'Update Pass' : 'Create Pass'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Passes List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Current Passes</h2>
          </div>
          
          {passes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No passes created yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Your First Pass
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {passes.map((pass) => (
                <div key={pass._id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{pass.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pass.type === 'unlimited' ? 'bg-purple-100 text-purple-800' :
                          pass.type === 'multi' ? 'bg-blue-100 text-blue-800' :
                          pass.type === 'multi-pass' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {pass.type === 'unlimited' ? 'Unlimited' :
                           pass.type === 'multi' ? 'Clipcard' :
                           pass.type === 'multi-pass' ? 'Multi-Pass' : 'Single'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pass.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {pass.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{pass.description}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">{pass.price} kr</span>
                        {(pass.type === 'multi' || pass.type === 'multi-pass') && <span> • {pass.classesLimit} classes</span>}
                        <span> • Valid for {pass.validityDays} days</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(pass)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pass._id!)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Setup Templates */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Setup Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900">Single Class Pass</h4>
              <p className="text-sm text-gray-600 mt-1">Perfect for trial classes or drop-ins</p>
              <p className="text-sm text-blue-600 mt-2">Suggested: 200 kr, 7 days validity</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900">5-Class Multi-Pass</h4>
              <p className="text-sm text-gray-600 mt-1">Great for monthly commitment without clipcard restrictions</p>
              <p className="text-sm text-blue-600 mt-2">Suggested: 900 kr, 5 classes, 30 days validity</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900">10-Class Clipcard</h4>
              <p className="text-sm text-gray-600 mt-1">Popular choice for regular students</p>
              <p className="text-sm text-blue-600 mt-2">Suggested: 1800 kr, 90 days validity</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900">Unlimited Monthly</h4>
              <p className="text-sm text-gray-600 mt-1">Best value for dedicated dancers</p>
              <p className="text-sm text-blue-600 mt-2">Suggested: 1200 kr, 30 days validity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
