'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { CreditCardIcon, BanknotesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface PaymentData {
  _id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  customerName: string;
  customerEmail: string;
  passName: string;
  createdAt: string;
  paymentMethod: string;
}

export default function PaymentsPage() {
  const params = useParams();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = params.slug as string;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    const fetchPayments = async () => {
      try {
        // For now, we'll show placeholder data since we don't have a payments API endpoint yet
        setPayments([
          {
            _id: '1',
            amount: 299,
            currency: 'NOK',
            status: 'completed',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            passName: 'Monthly Subscription',
            createdAt: '2024-01-15T10:30:00Z',
            paymentMethod: 'card'
          },
          {
            _id: '2',
            amount: 150,
            currency: 'NOK',
            status: 'completed',
            customerName: 'Jane Smith',
            customerEmail: 'jane@example.com',
            passName: '5-Class Clipcard',
            createdAt: '2024-01-14T14:20:00Z',
            paymentMethod: 'vipps'
          },
          {
            _id: '3',
            amount: 199,
            currency: 'NOK',
            status: 'pending',
            customerName: 'Mike Johnson',
            customerEmail: 'mike@example.com',
            passName: 'Drop-in Class',
            createdAt: '2024-01-13T16:45:00Z',
            paymentMethod: 'card'
          }
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [isLoaded, isSignedIn, userId, tenantSlug]);

  const totalRevenue = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const completedPayments = payments.filter(payment => payment.status === 'completed').length;
  const pendingPayments = payments.filter(payment => payment.status === 'pending').length;

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
          <p className="text-gray-600">Please sign in to access payments.</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Payments & Bookings</h1>
              <p className="text-sm text-gray-500">View payment transactions and class bookings</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href={`/${tenantSlug}/admin/passes`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Manage Passes
              </Link>
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalRevenue} kr</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Payments</dt>
                    <dd className="text-lg font-medium text-gray-900">{payments.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{completedPayments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{pendingPayments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Payments</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Payment transactions and booking history.
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <li key={payment._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CreditCardIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {payment.customerName}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <p>{payment.customerEmail}</p>
                          <span className="mx-2">•</span>
                          <p>{payment.passName}</p>
                          <span className="mx-2">•</span>
                          <p>{payment.paymentMethod}</p>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()} at {new Date(payment.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {payment.amount} {payment.currency}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                          View Details
                        </button>
                        {payment.status === 'completed' && (
                          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                            Refund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${tenantSlug}/admin/passes`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Manage Passes
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Create and edit subscription passes
                  </dd>
                </dl>
              </div>
            </div>
          </Link>

          <Link
            href={`/${tenantSlug}/admin/reports`}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow p-5 block"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Financial Reports
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Revenue and payment analytics
                  </dd>
                </dl>
              </div>
            </div>
          </Link>

          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Export Data
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Download payment reports
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
