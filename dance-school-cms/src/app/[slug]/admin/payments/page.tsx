'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import StripeConnectSetup from '@/components/StripeConnectSetup';
import PaymentsTable from '@/components/PaymentsTable';
import { 
  CreditCardIcon, 
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'connect' | 'transactions' | 'settings';

interface Transaction {
  _id: string;
  type: 'booking' | 'subscription';
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  passName: string;
  createdAt: string;
  paymentMethod: string;
  paymentId: string;
  email: string;
  class?: {
    _id: string;
    title: string;
    price: number;
  };
  pass?: {
    _id: string;
    name: string;
    price: number;
    type: string;
  };
  user: {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function PaymentsPage() {
  const params = useParams();
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyPaymentsCount, setMonthlyPaymentsCount] = useState(0);

  const tenantSlug = params.slug as string;

  // Function to refresh tenant data
  const refreshTenantData = () => {
    setRefreshKey(prev => prev + 1);
    // Force a page refresh to get updated tenant data
    window.location.reload();
  };

  // Function to fetch transactions
  const fetchTransactions = async () => {
    if (!tenant?._id) return;
    
    setLoadingTransactions(true);
    try {
      console.log('🔄 Fetching admin payments for tenant:', tenant.schoolName);
      const response = await fetch('/api/admin/payments', {
        headers: {
          'x-tenant-id': tenant._id,
          'x-tenant-slug': tenantSlug,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin payments data:', data);
        
        // Map the API response to ensure all required fields are present
        const mappedTransactions = (data.payments || []).map((payment: any) => ({
          ...payment,
          email: payment.customerEmail || payment.email || 'No email provided'
          // Remove type override - API now returns correct type directly
        }));
        
        setTransactions(mappedTransactions);
        
        // Update revenue data from API response
        setMonthlyRevenue(data.monthlyRevenue || 0);
        setTotalRevenue(data.totalRevenue || 0);
        setMonthlyPaymentsCount(data.monthlyPaymentsCount || 0);
      } else {
        console.error('❌ Failed to fetch admin payments:', response.statusText);
        setTransactions([]);
        setMonthlyRevenue(0);
        setTotalRevenue(0);
        setMonthlyPaymentsCount(0);
      }
    } catch (error) {
      console.error('❌ Error fetching admin payments:', error);
      setTransactions([]);
      setMonthlyRevenue(0);
      setTotalRevenue(0);
      setMonthlyPaymentsCount(0);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Listen for Stripe Connect status changes
  useEffect(() => {
    const handleStripeConnectUpdate = () => {
      refreshTenantData();
    };

    // Listen for custom events from StripeConnectSetup component
    window.addEventListener('stripeConnectUpdated', handleStripeConnectUpdate);
    
    return () => {
      window.removeEventListener('stripeConnectUpdated', handleStripeConnectUpdate);
    };
  }, []);

  // Fetch transactions and revenue data when tab changes to overview/transactions or tenant changes
  useEffect(() => {
    if ((activeTab === 'transactions' || activeTab === 'overview') && tenant?._id) {
      fetchTransactions();
    }
  }, [activeTab, tenant?._id]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'connect', name: 'Stripe Connect', icon: CreditCardIcon },
    { id: 'transactions', name: 'Transactions', icon: BanknotesIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payments & Billing</h1>
        <p className="mt-2 text-gray-600">
          Manage your payment processing, view transactions, and configure billing settings.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Status Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <CreditCardIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                  <p className="text-sm text-gray-600">
                    {tenant.stripeConnect?.accountStatus === 'active' 
                      ? 'Ready to accept payments' 
                      : 'Setup required'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  tenant.stripeConnect?.accountStatus === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {tenant.stripeConnect?.accountStatus === 'active' ? 'Active' : 'Setup Needed'}
                </span>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {monthlyRevenue.toFixed(2)} NOK
                  </p>
                  <p className="text-sm text-gray-600">
                    Revenue ({monthlyPaymentsCount} transactions)
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Model Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Revenue Model</h3>
                  <p className="text-2xl font-bold text-green-600">
                    0% Fees
                  </p>
                  <p className="text-sm text-gray-600">Subscription model - keep 100%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'connect' && (
          <StripeConnectSetup />
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                <p className="text-sm text-gray-600">View and manage your payment transactions</p>
              </div>
              <button
                onClick={fetchTransactions}
                disabled={loadingTransactions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingTransactions ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading transactions...</span>
              </div>
            ) : (
              <PaymentsTable transactions={transactions} />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Settings</h2>
            
            <div className="space-y-6">
              {/* Currency Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="nok">Norwegian Krone (NOK)</option>
                  <option value="eur">Euro (EUR)</option>
                  <option value="usd">US Dollar (USD)</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  This currency will be used for new classes and passes.
                </p>
              </div>

              {/* Revenue Model Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revenue Model
                </label>
                <div className="bg-green-50 rounded-md p-3 max-w-xs border border-green-200">
                  <p className="text-sm text-green-900 font-medium">
                    Subscription Model - 0% Transaction Fees
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    You keep 100% of your student payments. Platform costs are covered by your subscription.
                  </p>
                </div>
              </div>

              {/* Auto-payout Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Schedule
                </label>
                <div className="bg-gray-50 rounded-md p-3 max-w-xs">
                  <p className="text-sm text-gray-900">Daily</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Funds are automatically transferred to your bank account daily.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
