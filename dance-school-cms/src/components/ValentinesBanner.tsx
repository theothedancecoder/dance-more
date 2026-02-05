'use client';

import { useState, useEffect } from 'react';

/**
 * VALENTINE'S DAY COMPONENT
 * Displays a festive Valentine's Day banner
 * Remove after Valentine's Day season
 */

export default function ValentinesBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('valentines-banner-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem('valentines-banner-dismissed', 'true');
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative overflow-hidden gradient-valentine-romantic valentine-confetti transition-all duration-300 ${
        isClosing ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Animated hearts background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-[10%] floating-hearts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="rgba(255, 255, 255, 0.3)"
            />
          </svg>
        </div>
        <div className="absolute top-3 right-[15%] floating-hearts" style={{ animationDelay: '1s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="rgba(255, 255, 255, 0.2)"
            />
          </svg>
        </div>
        <div className="absolute top-1 left-[70%] floating-hearts" style={{ animationDelay: '2s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="rgba(255, 255, 255, 0.25)"
            />
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Animated heart icon */}
            <div className="heart-beat">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Banner text */}
            <div className="flex-1">
              <p className="text-white font-semibold text-sm sm:text-base text-center sm:text-left">
                💕 Happy Valentine's Day! Spread the love of dance with someone special 💕
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Dismiss Valentine's banner"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
