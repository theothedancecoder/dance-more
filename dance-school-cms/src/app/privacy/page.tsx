'use client';

import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';

export default function PrivacyPolicyPage() {
  const { tenant } = useTenant();
  
  const companyName = tenant?.schoolName || 'Dance-More';
  const contactEmail = 'privacy@dance-more.com';
  const lastUpdated = 'January 15, 2025';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link 
              href={tenant ? `/${tenant.slug}` : '/'}
              className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {companyName}
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
          <div className="text-center mb-12">
            <h1 
              className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: tenant?.branding?.primaryColor 
                  ? `linear-gradient(45deg, ${tenant.branding.primaryColor}, ${tenant.branding.secondaryColor || tenant.branding.primaryColor})`
                  : 'linear-gradient(45deg, #3B82F6, #8B5CF6)'
              }}
            >
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to {companyName}. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our 
                dance school management platform and related services.
              </p>
              <p className="text-gray-700 leading-relaxed">
                This policy applies to all users of our platform, including dance school administrators, instructors, 
                students, and visitors to our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Name, email address, and contact information</li>
                <li>Profile information and preferences</li>
                <li>Payment and billing information (processed securely through Stripe)</li>
                <li>Class bookings and attendance records</li>
                <li>Communication history and support requests</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Technical Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use your personal information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Service Provision:</strong> To provide and maintain our dance school management services</li>
                <li><strong>Account Management:</strong> To create and manage your user account</li>
                <li><strong>Class Booking:</strong> To process class bookings and manage schedules</li>
                <li><strong>Payment Processing:</strong> To handle payments and billing (via Stripe)</li>
                <li><strong>Communication:</strong> To send important updates, notifications, and support responses</li>
                <li><strong>Analytics:</strong> To improve our services and user experience</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and protect our rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Essential Cookies</h4>
                  <p className="text-sm text-gray-600">Required for basic site functionality, authentication, and security.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Analytics Cookies</h4>
                  <p className="text-sm text-gray-600">Help us understand how users interact with our platform to improve services.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Preference Cookies</h4>
                  <p className="text-sm text-gray-600">Remember your settings and preferences for a personalized experience.</p>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed">
                You can manage your cookie preferences through our cookie banner or your browser settings. 
                Note that disabling certain cookies may affect site functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Third Parties</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information with trusted third parties in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Payment Processing:</strong> Stripe for secure payment processing</li>
                <li><strong>Authentication:</strong> Clerk for user authentication and account management</li>
                <li><strong>Analytics:</strong> Analytics providers to understand usage patterns</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                We never sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights (GDPR)</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under the General Data Protection Regulation (GDPR), you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li><strong>Right to Access:</strong> Request copies of your personal data</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing</li>
                <li><strong>Right to Data Portability:</strong> Request transfer of your data</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                To exercise these rights, please contact us at {contactEmail}.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure payment processing through PCI-compliant providers</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal data only as long as necessary for the purposes outlined in this policy 
                or as required by law. Account data is typically retained for the duration of your account plus 
                a reasonable period thereafter for legal and business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your data may be transferred to and processed in countries outside your residence. We ensure 
                appropriate safeguards are in place to protect your data in accordance with applicable data 
                protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes 
                by posting the new policy on this page and updating the "Last updated" date. We encourage you 
                to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> {contactEmail}</p>
                <p className="text-gray-700 mb-2"><strong>Company:</strong> {companyName}</p>
                <p className="text-gray-700">
                  <strong>Data Protection Officer:</strong> Available upon request
                </p>
              </div>
            </section>
          </div>

          {/* Back to top */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Back to top
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
