'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SubscriptionPlan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
}

interface SubscriptionDetails {
  id: string;
  status: string;
  plan: string;
  billing: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextInvoiceAmount: number;
  nextInvoiceDate: string | null;
  cancelAtPeriodEnd: boolean;
}

interface TenantSubscription {
  tenant: {
    id: string;
    name: string;
    subscription: {
      plan: string;
      status: string;
    };
  };
  subscriptionDetails: SubscriptionDetails | null;
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Up to 100 students',
      'Basic class management',
      'Payment processing',
      'Email support'
    ]
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: [
      'Up to 500 students',
      'Advanced class management',
      'Payment processing',
      'Analytics & reports',
      'Priority support',
      'Custom branding'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      'Unlimited students',
      'Full feature access',
      'Payment processing',
      'Advanced analytics',
      'Dedicated support',
      'White-label solution',
      'API access'
    ]
  }
};

export default function PlatformSubscription() {
  const { tenant } = useTenant();
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (tenant?._id) {
      fetchSubscription();
    }
  }, [tenant]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/platform/subscriptions/manage?tenantId=${tenant?._id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: string, billing: 'monthly' | 'yearly') => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/platform/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant?._id,
          plan,
          billing,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/platform/subscriptions/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant?._id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchSubscription();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/platform/subscriptions/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant?._id,
          action: 'reactivate',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchSubscription();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'canceling':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'canceled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'canceling':
        return 'Canceling';
      case 'canceled':
        return 'Canceled';
      case 'past_due':
        return 'Past Due';
      default:
        return 'Inactive';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.tenant.subscription.plan || 'free';
  const isActive = subscription?.subscriptionDetails?.status === 'active';
  const isCanceling = subscription?.subscriptionDetails?.cancelAtPeriodEnd;

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {subscription?.subscriptionDetails && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(subscription.subscriptionDetails.status)}
                <span className="font-medium">
                  {SUBSCRIPTION_PLANS[subscription.subscriptionDetails.plan]?.name || subscription.subscriptionDetails.plan} Plan
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusText(subscription.subscriptionDetails.status)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-1">
                Billing: {subscription.subscriptionDetails.billing}
              </p>
              
              <p className="text-sm text-gray-600">
                Current period: {new Date(subscription.subscriptionDetails.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.subscriptionDetails.currentPeriodEnd).toLocaleDateString()}
              </p>
              
              {subscription.subscriptionDetails.nextInvoiceDate && (
                <p className="text-sm text-gray-600">
                  Next payment: ${subscription.subscriptionDetails.nextInvoiceAmount} on {new Date(subscription.subscriptionDetails.nextInvoiceDate).toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              {isActive && !isCanceling && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Cancel Subscription'}
                </button>
              )}
              
              {isCanceling && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Reactivate Subscription'}
                </button>
              )}
            </div>
          </div>
          
          {isCanceling && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Subscription Canceling
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your subscription will remain active until {new Date(subscription.subscriptionDetails.currentPeriodEnd).toLocaleDateString()}.
                      You can reactivate it anytime before then.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription Plans */}
      {(!isActive || currentPlan === 'free') && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Choose Your Plan</h3>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedBilling('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedBilling === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedBilling('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedBilling === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs text-green-600">(Save 17%)</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => {
              const price = selectedBilling === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              const isCurrentPlan = planKey === currentPlan;
              const isRecommended = planKey === 'professional';
              
              return (
                <div
                  key={planKey}
                  className={`relative rounded-lg border-2 p-6 ${
                    isRecommended
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-gray-200'
                  } ${isCurrentPlan ? 'bg-gray-50' : 'bg-white'}`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-gray-900">${price}</span>
                      <span className="text-gray-600">/{selectedBilling === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    
                    {selectedBilling === 'yearly' && (
                      <p className="text-sm text-green-600 mt-1">
                        Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice}/year
                      </p>
                    )}
                  </div>
                  
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-8">
                    {isCurrentPlan ? (
                      <div className="w-full py-2 px-4 border border-gray-300 rounded-md text-center text-gray-500">
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(planKey, selectedBilling)}
                        disabled={actionLoading}
                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 ${
                          isRecommended
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {actionLoading ? 'Processing...' : 'Subscribe'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
