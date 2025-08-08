import Navigation from '@/components/Navigation';
import NotificationBanner from '@/components/NotificationBanner';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <NotificationBanner />
      </div>
      {children}
    </>
  );
}
