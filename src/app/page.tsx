import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Dance School CMS
        </h1>
        
        <SignedOut>
          <div className="flex flex-col space-y-4 max-w-md mx-auto">
            <SignInButton mode="modal">
              <button className="rounded-md bg-blue-500 px-4 py-2 text-center text-white hover:bg-blue-600">
                Sign In
              </button>
            </SignInButton>
            <Link
              href="/sign-up"
              className="rounded-md bg-green-500 px-4 py-2 text-center text-white hover:bg-green-600"
            >
              Sign Up
            </Link>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Explore Our Content
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/classes"
                className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Dance Classes
                </h3>
                <p className="text-gray-600">
                  Browse our wide range of dance classes for all skill levels.
                </p>
              </Link>
              
              <Link
                href="/blog"
                className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Blog & News
                </h3>
                <p className="text-gray-600">
                  Stay updated with the latest news and tips from our dance community.
                </p>
              </Link>
              
              <Link
                href="/studio"
                className="bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sanity Studio
                </h3>
                <p className="text-gray-600">
                  Content management system for administrators.
                </p>
              </Link>
            </div>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div className="flex flex-col items-center space-y-4">
            <p className="text-gray-600">Welcome back!</p>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-500 px-4 py-2 text-center text-white hover:bg-blue-600"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/classes"
                className="rounded-md bg-purple-500 px-4 py-2 text-center text-white hover:bg-purple-600"
              >
                View Classes
              </Link>
              <Link
                href="/blog"
                className="rounded-md bg-green-500 px-4 py-2 text-center text-white hover:bg-green-600"
              >
                Read Blog
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </main>
  );
}
