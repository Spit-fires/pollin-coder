"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="bg-black text-white">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
            <h1 className="text-4xl font-bold text-purple-400">
              Something went wrong
            </h1>
            <p className="text-gray-400">
              We encountered an unexpected error. Please try again.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="mt-4 rounded bg-gray-900 p-4 text-left text-sm text-red-400">
                <p className="font-mono">{error.message}</p>
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-lg bg-gray-800 px-6 py-3 font-medium text-white hover:bg-gray-700 transition-colors"
              >
                Go home
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
