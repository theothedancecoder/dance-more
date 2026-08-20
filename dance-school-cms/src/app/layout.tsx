import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { TenantProvider } from '@/contexts/TenantContext';
import "./globals.css";
import "./animations.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance School CMS",
  description: "Comprehensive dance school management system",
  applicationName: "Dance School CMS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dance School CMS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/favicon-32.png?v=3',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon-192.png?v=3',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon-32.png?v=3',
    apple: [
      {
        url: '/apple-touch-icon.png?v=3',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <TenantProvider>
            {children}
          </TenantProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
