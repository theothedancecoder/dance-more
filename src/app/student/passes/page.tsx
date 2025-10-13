'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

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
}

interface Subscription {
  _id: string;
  passName: string;
  passId: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  classesUsed: number;
  classesLimit: number | null;
  remainingDays: number;
  isExpired: boolean;
}

interface UpgradeOption {
  pass: Pass;
  upgradeCost: number;
  canUpgrade: boolean;
  reason?: string;
}

export default function StudentPassesPage() {
  const { user } = useUser();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availablePasses, setAvailablePasses] = useState<Pass[]>([]);
  const [upgradeOptions, setUpgradeOptions] = useState<{ [key: string]: UpgradeOption[] }>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserPasses();
      fetchAvailablePasses();
    }
  }, [user]);

  const fetchUserPasses = async () => {
    try {
      console.log('🔍 Fetching user passes...');
      const response = await fetch('/api/student/passes');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Passes fetched successfully:', data.subscriptions);
        
        // Filter out any subscriptions with critical missing data
        const validSubscriptions = data.subscriptions.filter((sub: Subscription) => {
          const isValid = sub._id && sub.passName && sub.endDate !== null;
          if (!isValid) {
            console.warn('⚠️ Filtering out invalid subscription:', sub);
          }
          return isValid;
        });
        
        setSubscriptions(validSubscriptions);
        
        if (validSubscriptions.length !== data.subscriptions.length) {
          console.warn(`⚠️ Filtered ${data.subscriptions.length - validSubscriptions.length} invalid subscriptions`);
        }
      } else {
        console.error('❌ Failed to fetch passes:', response.status, response.statusText);
        setMessage({ type: 'error', text: 'Failed to fetch your passes' });
      }
    } catch (error) {
      console.error('❌ Error loading passes:', error);
      setMessage({ type: 'error', text: 'Error loading your passes' });
    }
  };

  const fetchAvailablePasses = async () => {
    try {
      // Fetch passes with expired filter enabled for student view
      const response = await fetch('/api/admin/passes?filterExpired=true');
      if (response.ok) {
        const data = await response.json();
        // Passes are already filtered by the API (active and non-expired)
        setAvailablePasses(data.passes);
        calculateUpgradeOptions(data.passes);
      }
    } catch (error) {
      console.error('Error loading available passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUpgradeOptions = (passes: Pass[]) => {
    const options: { [key: string]: UpgradeOption[] } = {};
    
    subscriptions.forEach(subscription => {
      if (!subscription.isActive || subscription.isExpired) return;
      
      const currentPassPrice = passes.find(p => p._id === subscription.passId)?.price || 0;
      
      options[subscription._id] = passes
        .filter(pass => pass._id !== subscription.passId)
        .map(pass => {
          const upgradeCost = Math.max(0, pass.price - currentPassPrice);
          const canUpgrade = pass.price > currentPassPrice;
          
          return {
            pass,
            upgradeCost,
            canUpgrade,
            reason: !canUpgrade ? 'This pass costs less than your current pass' : undefined
          };
        })
        .sort((a, b) => a.upgradeCost - b.upgradeCost);
    });
    
    setUpgradeOptions(options);
  };

  const handleUpgrade = async (subscriptionId: string, newPassId: string) => {
    setUpgrading(`${subscriptionId}-${newPassId}`);
    
    try {
      const response = await fetch('/api/student/passes/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          newPassId,
          successUrl: `${window.location.origin}/student/passes?upgraded=true`,
          cancelUrl: `${window.location.origin}/student/passes`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to initiate upgrade' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error processing upgrade' });
    } finally {
      setUpgrading(null);
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'N/A';
    return `${price} kr`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      );
    }
    
    if (!subscription.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Inactive
        </span>
      );
    }

    if (subscription.remainingDays <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expires Soon
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your passes...</p>
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
              <Link href="/student" className="text-blue-600 hover:text-blue-800">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                My Passes
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

        {/* Current Passes */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Current Passes ({subscriptions.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage and upgrade your dance passes
            </p>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">You don't have any passes yet.</p>
              <Link 
                href="/classes" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Classes & Passes
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {subscriptions.map((subscription) => (
                <li key={subscription._id} className="px-4 py-6 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {subscription.passName}
                        </h4>
                        {getStatusBadge(subscription)}
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Valid Until:</span>
                          <p className="text-sm text-gray-900">{formatDate(subscription.endDate)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Days Remaining:</span>
                          <p className="text-sm text-gray-900">{subscription.remainingDays} days</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Classes Used:</span>
                          <p className="text-sm text-gray-900">
                            {subscription.classesUsed || 0} / {subscription.classesLimit || '∞'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Type:</span>
                          <p className="text-sm text-gray-900 capitalize">{subscription.type}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade Options */}
                  {subscription.isActive && !subscription.isExpired && upgradeOptions[subscription._id] && (
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Upgrade Options:</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {upgradeOptions[subscription._id]
                          .filter(option => option.canUpgrade)
                          .slice(0, 3)
                          .map((option) => (
                          <div key={option.pass._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-gray-900">{option.pass.name}</h6>
                              <span className="text-sm font-medium text-green-600">
                                +{formatPrice(option.upgradeCost)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">
                              {option.pass.classesLimit ? `${option.pass.classesLimit} classes` : 'Unlimited classes'}
                              {option.pass.validityDays && ` • ${option.pass.validityDays} days`}
                            </p>
                            <button
                              onClick={() => handleUpgrade(subscription._id, option.pass._id)}
                              disabled={upgrading === `${subscription._id}-${option.pass._id}`}
                              className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {upgrading === `${subscription._id}-${option.pass._id}` ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                `Upgrade for ${formatPrice(option.upgradeCost)}`
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {upgradeOptions[subscription._id].filter(option => option.canUpgrade).length > 3 && (
                        <p className="mt-3 text-sm text-gray-500">
                          +{upgradeOptions[subscription._id].filter(option => option.canUpgrade).length - 3} more upgrade options available
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Information Box */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pass Upgrade Information
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <ul className="list-disc list-inside space-y-1">
                <li>Upgrade costs are calculated as the difference between pass prices</li>
                <li>Your remaining classes and validity period will be preserved</li>
                <li>Upgrades take effect immediately after payment</li>
                <li>You can only upgrade to passes that cost more than your current pass</li>
                <li>Contact support if you need help choosing the right pass</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
