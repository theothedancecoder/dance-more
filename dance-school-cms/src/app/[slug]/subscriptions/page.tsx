'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { CreditCardIcon, TicketIcon, CheckIcon, StarIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import ReadMoreText from '@/components/ReadMoreText';

interface PassData {
  _id: string;
  name: string;
  type: 'single' | 'multi-pass' | 'multi' | 'unlimited';
  price: number;
  validityType: 'days' | 'date';
  validityDays?: number;
  expiryDate?: string;
  classesLimit?: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
}

interface UserSubscription {
  _id: string;
  type: string;
  passName: string;
  startDate: string;
  endDate: string;
  remainingClips?: number;
  isActive: boolean;
  purchasePrice: number;
  daysRemaining: number;
  isExpired: boolean;
  originalPass?: {
    name: string;
    type: string;
  };
}

// Helper function to get display name for subscription types
const getPassDisplayName = (type: string): string => {
  const typeNames: { [key: string]: string } = {
    'single': 'Drop-in Class',
    'multi-pass': 'Multi-Class Package',
    'clipcard': 'Class Package',
    'monthly': 'Monthly Unlimited'
  };
  return typeNames[type] || 'Class Package';
};

export default function SubscriptionsPage() {
  const params = useParams();
  const { tenant, isLoading, error } = useTenant();
  const [passes, setPasses] = useState<PassData[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<UserSubscription[]>([]);
  const [expiredSubscriptions, setExpiredSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [upgradeOptions, setUpgradeOptions] = useState<PassData[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

  const tenantSlug = params.slug as string;

  // Check for success parameter in URL (after payment)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    
    if (success === 'true' && sessionId) {
      // Start polling for subscription status
      checkSubscriptionStatus(sessionId);
    }
  }, []);

  const checkSubscriptionStatus = async (sessionId: string, attempt = 1, maxAttempts = 15) => {
    if (attempt > maxAttempts) {
      setStatusMessage('⚠️ Taking longer than expected. Your pass should appear shortly. Try refreshing the page.');
      setCheckingStatus(false);
      return;
    }

    setCheckingStatus(true);
    setStatusMessage(`⏳ Confirming your purchase... (${attempt}/${maxAttempts})`);

    try {
      const response = await fetch('/api/user/subscription-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.found) {
        setStatusMessage('✅ Success! Your pass is now active.');
        setCheckingStatus(false);
        // Refresh subscriptions
        await fetchUserSubscriptions();
        // Clear URL parameters
        window.history.replaceState({}, '', `/${tenantSlug}/subscriptions`);
      } else if (data.webhookError) {
        setStatusMessage('⚠️ ' + data.message);
        setCheckingStatus(false);
        // Try manual sync as fallback
        await handleManualSync();
      } else {
        // Keep polling
        setTimeout(() => {
          checkSubscriptionStatus(sessionId, attempt + 1, maxAttempts);
        }, 2000); // Check every 2 seconds
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setStatusMessage('⚠️ Unable to confirm purchase. Please refresh the page.');
      setCheckingStatus(false);
    }
  };

  const handleManualSync = async () => {
    setManualSyncLoading(true);
    setStatusMessage('🔄 Syncing your passes...');
    
    try {
      const response = await fetch('/api/user/sync-subscriptions', {
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.createdCount > 0) {
          setStatusMessage(`✅ Found and activated ${data.createdCount} missing pass${data.createdCount > 1 ? 'es' : ''}!`);
          await fetchUserSubscriptions();
        } else if (data.skippedCount > 0) {
          setStatusMessage('✅ All your passes are already synced.');
        } else {
          setStatusMessage('ℹ️ No missing passes found. If you just made a purchase, please wait a moment and try again.');
        }
      } else {
        setStatusMessage('❌ Sync failed. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error syncing subscriptions:', error);
      setStatusMessage('❌ Sync failed. Please try again or contact support.');
    } finally {
      setManualSyncLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handlePurchase = async (pass: PassData) => {
    try {
      // Create Stripe checkout session for pass purchase
      const response = await fetch('/api/stripe/checkout-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'x-tenant-id': tenant?._id || '',
        },
        body: JSON.stringify({
          passId: pass._id,
          successUrl: `${window.location.origin}/${tenantSlug}/payment/success`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to process purchase. Please try again.');
    }
  };

  const handleUpgradePass = async (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setUpgradeLoading(true);
    setShowUpgradeModal(true);

    try {
      // Fetch available upgrade options
      const response = await fetch('/api/user/passes/upgrade-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          subscriptionId: subscription._id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUpgradeOptions(data.upgradeOptions || []);
      } else {
        console.error('Failed to fetch upgrade options');
        setUpgradeOptions([]);
      }
    } catch (error) {
      console.error('Error fetching upgrade options:', error);
      setUpgradeOptions([]);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUpgradeConfirm = async (targetPass: PassData) => {
    if (!selectedSubscription) return;

    try {
      setUpgradeLoading(true);

      // Create Stripe checkout session for upgrade
      const response = await fetch('/api/stripe/checkout-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'x-tenant-id': tenant?._id || '',
        },
        body: JSON.stringify({
          passId: targetPass._id,
          upgradeFromSubscriptionId: selectedSubscription._id,
          successUrl: `${window.location.origin}/${tenantSlug}/payment/success`,
          cancelUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create upgrade checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to process upgrade. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const syncMissingSubscriptions = async () => {
    try {
      console.log('🔄 Syncing missing subscriptions...');
      const response = await fetch('/api/user/sync-subscriptions', {
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sync result:', data.message);
        if (data.createdCount > 0) {
          console.log(`🎉 Created ${data.createdCount} missing subscriptions!`);
          // Show notification to user
          setStatusMessage(`✅ Found ${data.createdCount} missing pass${data.createdCount > 1 ? 'es' : ''}!`);
          setTimeout(() => setStatusMessage(''), 5000);
        }
      } else {
        console.error('❌ Failed to sync subscriptions:', response.statusText);
      }
    } catch (err) {
      console.error('❌ Error syncing subscriptions:', err);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      console.log('Fetching user subscriptions for tenant:', tenantSlug);
      const response = await fetch('/api/user/subscriptions', {
        headers: {
          'x-tenant-slug': tenantSlug,
        },
      });

      console.log('User subscriptions response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User subscriptions data:', data);
        console.log('Active subscriptions:', data.activeSubscriptions);
        console.log('Expired subscriptions:', data.expiredSubscriptions);
        setActiveSubscriptions(data.activeSubscriptions || []);
        setExpiredSubscriptions(data.expiredSubscriptions || []);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch user subscriptions:', response.statusText, errorData);
        setActiveSubscriptions([]);
        setExpiredSubscriptions([]);
      }
    } catch (err) {
      console.error('Error fetching user subscriptions:', err);
      setActiveSubscriptions([]);
      setExpiredSubscriptions([]);
    }
  };

  useEffect(() => {
    const fetchPasses = async () => {
      try {
        const response = await fetch('/api/passes/public', {
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPasses(data.passes || []);
        } else {
          console.error('Failed to fetch passes:', response.statusText);
          setPasses([]);
        }
      } catch (err) {
        console.error('Error fetching passes:', err);
        setPasses([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async () => {
      if (tenantSlug) {
        await fetchPasses();
        // First sync any missing subscriptions, then fetch user subscriptions
        await syncMissingSubscriptions();
        await fetchUserSubscriptions();
      }
    };

    fetchData();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
              Passes & Subscriptions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose from our flexible class packages and subscription options. Find the perfect plan for your dance journey.
            </p>
          </div>
        </div>
      </section>

      {/* User's Subscriptions with Tabs */}
      <SignedIn>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Status Message Banner */}
          {(statusMessage || checkingStatus) && (
            <div className={`mb-6 p-4 rounded-lg ${
              statusMessage.includes('✅') ? 'bg-green-50 border border-green-200' :
              statusMessage.includes('❌') ? 'bg-red-50 border border-red-200' :
              statusMessage.includes('⚠️') ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  statusMessage.includes('✅') ? 'text-green-800' :
                  statusMessage.includes('❌') ? 'text-red-800' :
                  statusMessage.includes('⚠️') ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {statusMessage || 'Processing...'}
                </p>
                {checkingStatus && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                )}
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                Your Passes
              </h2>
              
              {/* Tab Navigation and Manual Sync Button */}
              <div className="flex items-center gap-4">
                {/* Manual Sync Button */}
                <button
                  onClick={handleManualSync}
                  disabled={manualSyncLoading || checkingStatus}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Sync missing passes from recent purchases"
                >
                  {manualSyncLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Missing Pass?
                    </>
                  )}
                </button>

                {/* Tab Navigation */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'active'
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={activeTab === 'active' ? { backgroundColor: tenant.branding?.primaryColor || '#3B82F6' } : {}}
                  >
                    <CheckIcon className="h-4 w-4 inline mr-2" />
                    Active ({activeSubscriptions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('expired')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'expired'
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={activeTab === 'expired' ? { backgroundColor: tenant.branding?.primaryColor || '#3B82F6' } : {}}
                  >
                    <ClockIcon className="h-4 w-4 inline mr-2" />
                    History ({expiredSubscriptions.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Active Passes Tab */}
            {activeTab === 'active' && (
              <>
                {activeSubscriptions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeSubscriptions.map((subscription: UserSubscription) => (
                      <div key={subscription._id} className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: tenant.branding?.primaryColor || '#3B82F6' }}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {subscription.passName || subscription.originalPass?.name || getPassDisplayName(subscription.type)}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            subscription.daysRemaining > 7 
                              ? 'bg-green-100 text-green-800' 
                              : subscription.daysRemaining > 0 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {subscription.daysRemaining > 0 ? `${subscription.daysRemaining} days left` : 'Expired'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-medium capitalize">
                              {subscription.type === 'monthly' ? 'Unlimited' : 
                               subscription.type === 'clipcard' ? 'Clipcard' :
                               subscription.type === 'multi-pass' ? 'Multi-Pass' : 'Single Class'}
                            </span>
                          </div>
                          
                          {subscription.remainingClips !== undefined && (
                            <div className="flex justify-between">
                              <span>Classes remaining:</span>
                              <span className="font-medium">{subscription.remainingClips}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between">
                            <span>Valid until:</span>
                            <span className="font-medium">{new Date(subscription.endDate).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Purchased:</span>
                            <span className="font-medium">{new Date(subscription.startDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                          <Link
                            href={`/${tenantSlug}/calendar`}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-colors"
                            style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                          >
                            Book Classes
                          </Link>
                          <button
                            onClick={() => handleUpgradePass(subscription)}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                            style={{ 
                              borderColor: tenant.branding?.primaryColor || '#3B82F6',
                              color: tenant.branding?.primaryColor || '#3B82F6'
                            }}
                          >
                            Upgrade Pass
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="mb-4">
                      <CheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Passes</h3>
                    <p className="text-gray-600 mb-6">
                      You don't have any active passes yet. Purchase a pass below to start booking classes!
                    </p>
                    <Link
                      href="#passes"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-colors"
                      style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                      onClick={(e) => {
                        e.preventDefault();
                        document.querySelector('#passes')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Browse Passes
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Expired Passes Tab */}
            {activeTab === 'expired' && (
              <>
                {expiredSubscriptions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {expiredSubscriptions.map((subscription: UserSubscription) => (
                      <div key={subscription._id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-300 opacity-75">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-700">
                            {subscription.passName || subscription.originalPass?.name || getPassDisplayName(subscription.type)}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircleIcon className="h-3 w-3 inline mr-1" />
                            Expired
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-medium capitalize">
                              {subscription.type === 'monthly' ? 'Unlimited' : 
                               subscription.type === 'clipcard' ? 'Clipcard' :
                               subscription.type === 'multi-pass' ? 'Multi-Pass' : 'Single Class'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Expired on:</span>
                            <span className="font-medium">{new Date(subscription.endDate).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Purchased:</span>
                            <span className="font-medium">{new Date(subscription.startDate).toLocaleDateString()}</span>
                          </div>

                          {subscription.purchasePrice && (
                            <div className="flex justify-between">
                              <span>Price paid:</span>
                              <span className="font-medium">{subscription.purchasePrice} kr</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="mb-4">
                      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Expired Passes</h3>
                    <p className="text-gray-600">
                      Your expired passes from the last 30 days will appear here.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </SignedIn>

      {/* Pricing Cards */}
      <section id="passes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {passes.map((pass) => (
            <div 
              key={pass._id} 
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                pass.isPopular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {pass.isPopular && (
                <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 text-sm font-medium">
                  <StarIcon className="inline h-4 w-4 mr-1" />
                  Most Popular
                </div>
              )}
              
              <div className={`p-6 ${pass.isPopular ? 'pt-12' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {['unlimited', 'multi'].includes(pass.type) ? (
                      <CreditCardIcon className="h-8 w-8 text-blue-500 mr-3" />
                    ) : (
                      <TicketIcon className="h-8 w-8 text-green-500 mr-3" />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{pass.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
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

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                      {pass.price}
                    </span>
                    <span className="text-gray-500 ml-1">kr</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {pass.type === 'unlimited' ? 'Unlimited classes' : 
                     pass.classesLimit ? `${pass.classesLimit} class${pass.classesLimit > 1 ? 'es' : ''}` : '1 class'}
                    {' • '}
                    {pass.validityType === 'days' && pass.validityDays 
                      ? `Valid for ${pass.validityDays} days`
                      : pass.validityType === 'date' && pass.expiryDate
                      ? `Valid until ${new Date(pass.expiryDate).toLocaleDateString()}`
                      : 'Validity not set'
                    }
                  </div>
                </div>

                <ReadMoreText 
                  text={pass.description} 
                  className="text-gray-600 mb-6"
                  maxLength={150}
                />

                <ul className="space-y-3 mb-8">
                  {(pass.features || []).map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <SignedOut>
                  <Link
                    href={`/${tenantSlug}/sign-in`}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors block text-center ${
                      pass.isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border-2 text-blue-600 hover:bg-blue-50'
                    }`}
                    style={pass.isPopular ? {} : { 
                      borderColor: tenant.branding?.primaryColor || '#3B82F6',
                      color: tenant.branding?.primaryColor || '#3B82F6'
                    }}
                  >
                    Sign In to Purchase
                  </Link>
                </SignedOut>
                <SignedIn>
                  <button 
                    onClick={() => handlePurchase(pass)}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      pass.isPopular
                        ? 'text-white hover:opacity-90'
                        : 'border-2 hover:bg-blue-50'
                    }`}
                    style={pass.isPopular ? { 
                      backgroundColor: tenant.branding?.primaryColor || '#3B82F6'
                    } : { 
                      borderColor: tenant.branding?.primaryColor || '#3B82F6',
                      color: tenant.branding?.primaryColor || '#3B82F6'
                    }}
                  >
                    Purchase Now
                  </button>
                </SignedIn>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                How It Works
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</span>
                  <span>Choose your preferred pass or subscription</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</span>
                  <span>Complete your purchase securely online</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</span>
                  <span>Book classes through our calendar system</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">4</span>
                  <span>Enjoy your dance classes!</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                Need Help Choosing?
              </h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900">New to dance?</h4>
                  <p className="text-sm">Start with a drop-in class or 5-class package to explore different styles.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Regular dancer?</h4>
                  <p className="text-sm">The 10-class package offers great value and flexibility for consistent practice.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Dance enthusiast?</h4>
                  <p className="text-sm">Monthly unlimited gives you access to all classes with the best value.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
            Ready to Start Dancing?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join our community and discover the joy of dance with flexible payment options.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${tenantSlug}/calendar`}
              className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
              style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
            >
              View Class Schedule
            </Link>
            <Link
              href={`/${tenantSlug}/classes`}
              className="px-8 py-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block"
              style={{ backgroundColor: tenant.branding?.secondaryColor || tenant.branding?.primaryColor || '#3B82F6' }}
            >
              Browse Classes
            </Link>
          </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                  Upgrade Your Pass
                </h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                Upgrade from your current "{selectedSubscription.passName}" to a better plan and pay only the difference.
              </p>
            </div>

            <div className="p-6">
              {upgradeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading upgrade options...</span>
                </div>
              ) : upgradeOptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upgradeOptions.map((pass) => {
                    const currentPrice = selectedSubscription.purchasePrice || 0;
                    const upgradeCost = Math.max(0, pass.price - currentPrice);
                    
                    return (
                      <div key={pass._id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{pass.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
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

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex justify-between">
                            <span>Original Price:</span>
                            <span className="font-medium">{pass.price} kr</span>
                          </div>
                          <div className="flex justify-between">
                            <span>You Paid:</span>
                            <span className="font-medium">{currentPrice} kr</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Upgrade Cost:</span>
                            <span className="font-bold text-green-600">
                              {upgradeCost === 0 ? 'FREE' : `${upgradeCost} kr`}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                          <p>{pass.description}</p>
                          <div className="mt-2">
                            {pass.type === 'unlimited' ? 'Unlimited classes' : 
                             pass.classesLimit ? `${pass.classesLimit} class${pass.classesLimit > 1 ? 'es' : ''}` : '1 class'}
                            {' • '}
                            {pass.validityType === 'days' && pass.validityDays 
                              ? `Valid for ${pass.validityDays} days`
                              : pass.validityType === 'date' && pass.expiryDate
                              ? `Valid until ${new Date(pass.expiryDate).toLocaleDateString()}`
                              : 'Validity not set'
                            }
                          </div>
                        </div>

                        <button
                          onClick={() => handleUpgradeConfirm(pass)}
                          disabled={upgradeLoading}
                          className="w-full py-3 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                        >
                          {upgradeLoading ? 'Processing...' : `Upgrade for ${upgradeCost === 0 ? 'FREE' : `${upgradeCost} kr`}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <CheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Upgrades Available</h3>
                  <p className="text-gray-600">
                    You already have the best available pass, or there are no higher-tier options available for upgrade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
