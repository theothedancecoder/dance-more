'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  accountStatus?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  onboardingCompleted?: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  country?: string;
  currency?: string;
  businessType?: string;
  email?: string;
}

export default function StripeConnectSetup() {
  const { tenant } = useTenant();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      fetchStatus();
    }
  }, [tenant]);

  const fetchStatus = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      console.log('🔄 StripeConnectSetup: Fetching status for tenant:', tenant._id);
      const response = await fetch('/api/stripe/connect/status', {
        headers: {
          'x-tenant-id': tenant._id,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });

      console.log('📊 StripeConnectSetup: Status response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ StripeConnectSetup: Status data:', data);
        setStatus(data);
        // Emit event to notify parent components of status change
        window.dispatchEvent(new CustomEvent('stripeConnectUpdated'));
      } else {
        const errorData = await response.json();
        console.error('❌ StripeConnectSetup: Status error:', errorData);
        setError(errorData.error || 'Failed to fetch status');
      }
    } catch (err) {
      console.error('❌ StripeConnectSetup: Status fetch error:', err);
      setError('Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    if (!tenant) {
      console.error('❌ StripeConnectSetup: No tenant available');
      return;
    }
    
    try {
      console.log('🚀 StripeConnectSetup: Starting createAccount for tenant:', tenant._id);
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant._id,
        },
        body: JSON.stringify({
          businessType: 'individual', // or 'company'
          country: 'NO'
        })
      });

      console.log('📊 StripeConnectSetup: Create account response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ StripeConnectSetup: Account created:', data);
        await fetchStatus(); // Refresh status
        // Emit event to notify parent components
        window.dispatchEvent(new CustomEvent('stripeConnectUpdated'));
        await startOnboarding(); // Immediately start onboarding
      } else {
        const errorData = await response.json();
        console.error('❌ StripeConnectSetup: Create account error:', errorData);
        setError(errorData.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('❌ StripeConnectSetup: Create account exception:', err);
      setError('Failed to create account');
    } finally {
      setActionLoading(false);
    }
  };

  const startOnboarding = async () => {
    if (!tenant) {
      console.error('❌ StripeConnectSetup: No tenant available for onboarding');
      return;
    }
    
    try {
      console.log('🚀 StripeConnectSetup: Starting onboarding for tenant:', tenant._id);
      setActionLoading(true);
      setError(null);

      const returnUrl = `${window.location.origin}/${tenant.slug?.current}/admin/payments/stripe/return`;
      console.log('🔗 StripeConnectSetup: Return URL:', returnUrl);

      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant._id,
        },
        body: JSON.stringify({
          returnUrl
        })
      });

      console.log('📊 StripeConnectSetup: Onboard response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ StripeConnectSetup: Onboarding URL:', data.onboardingUrl);
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else {
        const errorData = await response.json();
        console.error('❌ StripeConnectSetup: Onboard error:', errorData);
        setError(errorData.error || 'Failed to start onboarding');
      }
    } catch (err) {
      console.error('❌ StripeConnectSetup: Onboard exception:', err);
      setError('Failed to start onboarding');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (accountStatus?: string) => {
    switch (accountStatus) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'restricted': return 'text-red-600 bg-red-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (accountStatus?: string) => {
    switch (accountStatus) {
      case 'active': return 'Active';
      case 'pending': return 'Pending Verification';
      case 'restricted': return 'Restricted';
      case 'rejected': return 'Rejected';
      default: return 'Not Connected';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CreditCardIcon className="h-8 w-8 text-blue-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Stripe Connect</h2>
            <p className="text-sm text-gray-600">Accept payments directly to your account</p>
          </div>
        </div>
        
        {status?.connected && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.accountStatus)}`}>
            {getStatusText(status.accountStatus)}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!status?.connected ? (
        <div className="text-center py-8">
          <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Stripe Account</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Set up Stripe Connect to receive payments directly to your bank account. 
            With our subscription model, you keep 100% of your student payments - no transaction fees!
          </p>
          
          <button
            onClick={createAccount}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Setting up...' : 'Connect with Stripe'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Charges</span>
                {status.chargesEnabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {status.chargesEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Payouts</span>
                {status.payoutsEnabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-sm font-medium text-gray-600">Currency</span>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {status.currency?.toUpperCase() || 'NOK'}
              </p>
            </div>
          </div>

          {/* Requirements */}
          {status.requirements && (status.requirements.currentlyDue.length > 0 || status.requirements.pastDue.length > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="font-medium text-yellow-800">Action Required</h3>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                Complete your account setup to start receiving payments.
              </p>
              
              {status.requirements.pastDue.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-red-700">Past Due:</p>
                  <ul className="text-sm text-red-600 ml-4">
                    {status.requirements.pastDue.map((req, index) => (
                      <li key={index}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {status.requirements.currentlyDue.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-700">Currently Due:</p>
                  <ul className="text-sm text-yellow-600 ml-4">
                    {status.requirements.currentlyDue.map((req, index) => (
                      <li key={index}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!status.onboardingCompleted && (
              <button
                onClick={startOnboarding}
                disabled={actionLoading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                {actionLoading ? 'Loading...' : 'Complete Setup'}
              </button>
            )}
            
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh Status
            </button>
          </div>

          {/* Account Info */}
          {status.accountId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Account ID:</span> {status.accountId}</p>
                <p><span className="font-medium">Country:</span> {status.country}</p>
                <p><span className="font-medium">Business Type:</span> {status.businessType}</p>
                {status.email && <p><span className="font-medium">Email:</span> {status.email}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
