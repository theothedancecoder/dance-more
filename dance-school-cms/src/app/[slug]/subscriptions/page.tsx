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

  const tenantSlug = params.slug as string;

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
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}>
                Your Passes
              </h2>
              
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
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Link
                            href={`/${tenantSlug}/calendar`}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-colors"
                            style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                          >
                            Book Classes
                          </Link>
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
    </div>
  );
}
