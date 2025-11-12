import React from 'react';
import { Button } from './Button';

interface TokenExpiredMessageProps {
  title?: string;
  message: string;
  additionalInfo?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const TokenExpiredMessage: React.FC<TokenExpiredMessageProps> = ({
  title = 'Invalid or Expired Link',
  message,
  additionalInfo,
  actionLabel,
  onAction,
  isLoading = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-1">{title}</h3>
            <p className="text-sm text-red-800">{message}</p>
            {additionalInfo && (
              <p className="text-sm text-red-800 mt-2">{additionalInfo}</p>
            )}
          </div>
        </div>
      </div>

      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onAction}
          isLoading={isLoading}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
