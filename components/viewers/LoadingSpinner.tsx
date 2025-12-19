'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LoadingSpinner - Reusable loading indicator
 * 
 * Provides consistent loading UI across viewer components
 */
function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'md',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`} data-testid="loading-spinner">
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4 ${sizeClasses[size]}`}
          data-testid="spinner"
        ></div>
        <p className="text-white" data-testid="loading-message">{message}</p>
      </div>
    </div>
  );
}

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;