'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import PlatformSubscription from '@/components/PlatformSubscription';
import { useTenant } from '@/contexts/TenantContext';

export default function SubscriptionPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  const { tenant } = useTenant();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Subscription</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your {tenant?.schoolName} subscription plan
              </p>
            </div>
            
            <nav className="flex space-x-4">
              <Link
                href={`/${tenantSlug}/admin`}
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href={`/${tenantSlug}/admin/payments`}
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Payments
              </Link>
              <Link
                href={`/${tenantSlug}/admin/subscription`}
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Subscription
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlatformSubscription />
      </div>
    </div>
  );
}
