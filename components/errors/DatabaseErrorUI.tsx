'use client';

export function DatabaseErrorUI() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Database Connection Error
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Unable to connect to the database. Your Supabase project might be paused.
        </p>
        <div className="space-y-3">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
          >
            Open Supabase Dashboard
          </a>
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
          >
            Retry Connection
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          If your project is paused, click "Resume Project" in the Supabase dashboard, wait 1-2 minutes, then retry.
        </p>
      </div>
    </div>
  );
}