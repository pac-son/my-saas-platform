import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 animate-in fade-in zoom-in duration-300">
        <h1 className="text-4xl font-extrabold text-indigo-600 mb-4">Student Wallet</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Your complete digital wallet and micro-savings platform.
        </p>

        {/* What users see when logged out */}
        <SignedOut>
          <div className="flex flex-col gap-4">
            <SignInButton mode="modal">
              <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors">
                Create an Account
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        {/* What users see when logged in */}
        <SignedIn>
          <div className="flex flex-col gap-4 items-center">
            <p className="text-gray-600 mb-2">Welcome back! You are securely authenticated.</p>
            <Link 
              href="/dashboard" 
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors block"
            >
              Go to My Dashboard &rarr;
            </Link>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}