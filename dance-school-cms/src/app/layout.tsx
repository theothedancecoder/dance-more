import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { TenantProvider } from '@/contexts/TenantContext';
import ValentinesBanner from '@/components/ValentinesBanner'; // VALENTINE'S DAY - Remove after season
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        url: '/api/favicon?format=png&size=16',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/api/favicon?format=png&size=32',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/api/favicon?format=png&size=180',
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
          {/* VALENTINE'S DAY - Remove after season */}
          <ValentinesBanner />
          
          <TenantProvider>
            {children}
          </TenantProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
