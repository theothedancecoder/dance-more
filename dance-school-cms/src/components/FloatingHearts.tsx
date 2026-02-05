'use client';

import { useEffect, useState } from 'react';

/**
 * VALENTINE'S DAY COMPONENT
 * Displays floating hearts in the background
 * Remove after Valentine's Day season
 */

interface Heart {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

export default function FloatingHearts() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    // Generate random hearts
    const generatedHearts: Heart[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // Random position from 0-100%
      delay: Math.random() * 8, // Random delay 0-8s
      duration: 8 + Math.random() * 4, // Random duration 8-12s
      size: 20 + Math.random() * 30, // Random size 20-50px
      opacity: 0.1 + Math.random() * 0.2, // Random opacity 0.1-0.3
    }));
    setHearts(generatedHearts);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute"
          style={{
            left: `${heart.left}%`,
            bottom: '-50px',
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            opacity: heart.opacity,
          }}
        >
          <svg
            width={heart.size}
            height={heart.size}
            viewBox="0 0 24 24"
            fill="none"
            className="rose-petal"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="url(#valentine-gradient)"
            />
            <defs>
              <linearGradient id="valentine-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6b9d" />
                <stop offset="50%" stopColor="#ffc3a0" />
                <stop offset="100%" stopColor="#ffafbd" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}
    </div>
  );
}
