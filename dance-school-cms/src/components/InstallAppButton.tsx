'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallAppButton({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const isTenantRoute = !!pathname && pathname.split('/').filter(Boolean).length > 0 && !pathname.startsWith('/studio');

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    setIsIOS(ios);
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!isTenantRoute) {
    return null;
  }

  if (isStandalone) {
    return (
      <p className={`text-sm text-green-700 ${className}`}>
        App is already installed on this device.
      </p>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstall}
        className={`btn-gradient px-6 py-3 rounded-xl text-white font-semibold shadow-modern ${className}`}
      >
        Download App
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className={`text-sm text-gray-700 ${className}`}>
        On iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to download the app.
      </p>
    );
  }

  return (
    <p className={`text-sm text-gray-700 ${className}`}>
      To download this app, use your browser menu and choose <strong>Install App</strong> or{' '}
      <strong>Add to Home Screen</strong>.
    </p>
  );
}
