'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console
    console.error('Member viewer error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Something went wrong!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            There was an error loading the document viewer.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-mono">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={reset} variant="secondary">
              Try Again
            </Button>
            <Link href="/member/my-jstudyroom">
              <Button>Back to My jstudyroom</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}