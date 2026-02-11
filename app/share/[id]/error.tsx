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
    console.error("Share page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <h2 className="text-2xl font-bold text-purple-400">
          Failed to load shared project
        </h2>
        <p className="text-gray-400">
          This project may have been deleted or is no longer available.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-purple-600 px-6 py-3 font-medium hover:bg-purple-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg bg-gray-800 px-6 py-3 font-medium hover:bg-gray-700 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
