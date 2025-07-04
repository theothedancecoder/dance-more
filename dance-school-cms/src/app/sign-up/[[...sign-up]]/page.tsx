import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Sign Up
        </h1>
        <SignUp fallbackRedirectUrl="/register-school" />
      </div>
    </main>
  );
}
