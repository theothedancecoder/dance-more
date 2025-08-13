'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CookiePolicyProps {
  tenantBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

export default function CookiePolicy({ tenantBranding }: CookiePolicyProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    hideBanner();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    hideBanner();
  };

  const hideBanner = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  const primaryColor = tenantBranding?.primaryColor || '#3B82F6';
  const secondaryColor = tenantBranding?.secondaryColor || '#8B5CF6';
  const accentColor = tenantBranding?.accentColor || '#F59E0B';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Cookie Banner */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        <div 
          className={`max-w-6xl mx-auto bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 p-6 sm:p-8 transform transition-all duration-500 ${
            isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
          }`}
          style={{
            boxShadow: `0 25px 50px -12px ${primaryColor}20, 0 0 0 1px ${primaryColor}10`
          }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Cookie Icon */}
            <div 
              className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-xl sm:text-2xl font-bold mb-3 bg-gradient-to-r bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`
                }}
              >
                We Value Your Privacy
              </h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience, provide personalized content, 
                analyze website traffic, and support our authentication system. This includes:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-gray-600">Essential cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <span className="text-gray-600">Analytics cookies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-gray-600">Preference cookies</span>
                </div>
              </div>

              <p className="text-gray-600 text-xs sm:text-sm">
                By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more in our{' '}
                <Link 
                  href="/privacy" 
                  className="font-semibold hover:underline transition-colors"
                  style={{ color: primaryColor }}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={handleDecline}
                className="px-6 py-3 rounded-xl text-gray-700 font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-8 py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  boxShadow: `0 8px 25px ${primaryColor}40`
                }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
