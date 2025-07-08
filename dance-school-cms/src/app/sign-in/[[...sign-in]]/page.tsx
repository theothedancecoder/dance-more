'use client';

import { SignIn, useAuth } from '@clerk/nextjs';
import AuthRedirect from '@/components/AuthRedirect';

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();

  // If user is already signed in, handle redirect
  if (isLoaded && isSignedIn) {
    return <AuthRedirect />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Sign In
        </h1>
        <SignIn 
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/dashboard"
          afterSignInUrl="/dashboard"
          signUpUrl="/sign-up"
          redirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
