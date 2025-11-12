import React from 'react';

interface EmailSentMessageProps {
  email: string;
  title?: string;
  message?: string;
  additionalInfo?: string;
}

export const EmailSentMessage: React.FC<EmailSentMessageProps> = ({
  email,
  title = 'Check your email',
  message,
  additionalInfo,
}) => {
  return (
    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-green-900 mb-1">{title}</h3>
          {message && (
            <p className="text-sm text-green-800">
              {message}{' '}
              <strong>{email}</strong>
            </p>
          )}
          {!message && (
            <p className="text-sm text-green-800">
              We've sent an email to <strong>{email}</strong>
            </p>
          )}
          {additionalInfo && (
            <p className="text-sm text-green-800 mt-2">{additionalInfo}</p>
          )}
        </div>
      </div>
    </div>
  );
};
