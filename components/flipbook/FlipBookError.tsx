import { AlertCircle, RefreshCw } from 'lucide-react';

interface FlipBookErrorProps {
  error: string;
  onRetry?: () => void;
}

export function FlipBookError({ error, onRetry }: FlipBookErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-lg p-8">
      <div className="bg-white rounded-full p-4 shadow-lg mb-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Failed to Load Flipbook
      </h3>
      
      <p className="text-gray-600 text-center max-w-md mb-6">
        {error || 'An unexpected error occurred while loading the document.'}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
      
      <p className="mt-4 text-sm text-gray-500">
        If the problem persists, please contact support.
      </p>
    </div>
  );
}
