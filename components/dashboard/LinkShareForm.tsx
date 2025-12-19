'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface LinkShareFormProps {
  documentId: string;
  onSuccess?: () => void;
}

interface FormData {
  expiresAt: string;
  maxViews: string;
  password: string;
  restrictToEmail: string;
  canDownload: boolean;
  watermarkText: string;
}

export const LinkShareForm: React.FC<LinkShareFormProps> = ({
  documentId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<FormData>({
    expiresAt: '',
    maxViews: '',
    password: '',
    restrictToEmail: '',
    canDownload: false,
    watermarkText: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: {
        documentId: string;
        canDownload: boolean;
        expiresAt?: string;
        maxViews?: number;
        password?: string;
        restrictToEmail?: string;
        watermarkText?: string;
      } = {
        documentId,
        canDownload: formData.canDownload,
      };

      if (formData.expiresAt) {
        // Ensure the date is in the future
        const expirationDate = new Date(formData.expiresAt);
        if (expirationDate <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        payload.expiresAt = expirationDate.toISOString();
      }
      if (formData.maxViews && formData.maxViews.trim() !== '') {
        const maxViewsNum = parseInt(formData.maxViews, 10);
        if (isNaN(maxViewsNum) || maxViewsNum < 1 || maxViewsNum > 10000) {
          throw new Error('Maximum views must be between 1 and 10,000');
        }
        payload.maxViews = maxViewsNum;
      }
      if (formData.password && formData.password.trim() !== '') {
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        payload.password = formData.password;
      }
      if (formData.restrictToEmail && formData.restrictToEmail.trim() !== '') {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.restrictToEmail)) {
          throw new Error('Invalid email format');
        }
        payload.restrictToEmail = formData.restrictToEmail;
      }
      if (formData.watermarkText && formData.watermarkText.trim() !== '') {
        payload.watermarkText = formData.watermarkText.trim();
      }

      const response = await fetch('/api/share/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create share link');
      }

      setShareUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setShareUrl(null);
    setFormData({
      expiresAt: '',
      maxViews: '',
      password: '',
      restrictToEmail: '',
      canDownload: false,
      watermarkText: '',
    });
    setError(null);
  };

  if (shareUrl) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Share link created successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Copy the link below to share your document.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Share URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <Button onClick={handleCopy} variant="primary">
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleReset} variant="secondary" className="flex-1">
            Create Another Link
          </Button>
          <Button onClick={onSuccess} variant="primary" className="flex-1">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Expiration Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expiration Date (Optional)
        </label>
        <input
          type="datetime-local"
          value={formData.expiresAt}
          onChange={(e) =>
            setFormData({ ...formData, expiresAt: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Leave empty for no expiration
        </p>
      </div>

      {/* Max Views */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Maximum Views (Optional)
        </label>
        <input
          type="number"
          min="1"
          max="10000"
          value={formData.maxViews}
          onChange={(e) =>
            setFormData({ ...formData, maxViews: e.target.value })
          }
          placeholder="Unlimited"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Limit how many times this link can be viewed
        </p>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password Protection (Optional)
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="Enter password"
            minLength={8}
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Minimum 8 characters
        </p>
      </div>

      {/* Restrict to Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Restrict to Email (Optional)
        </label>
        <input
          type="email"
          value={formData.restrictToEmail}
          onChange={(e) =>
            setFormData({ ...formData, restrictToEmail: e.target.value })
          }
          placeholder="user@example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Only this email address can access the link
        </p>
      </div>

      {/* Watermark Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Watermark Text (Optional)
        </label>
        <input
          type="text"
          value={formData.watermarkText}
          onChange={(e) =>
            setFormData({ ...formData, watermarkText: e.target.value })
          }
          placeholder="e.g., CONFIDENTIAL, FOR REVIEW ONLY"
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This text will appear on each page of the shared document
        </p>
      </div>

      {/* Can Download */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="canDownload"
          checked={formData.canDownload}
          onChange={(e) =>
            setFormData({ ...formData, canDownload: e.target.checked })
          }
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="canDownload"
          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
        >
          Allow download
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="flex-1"
        >
          Generate Share Link
        </Button>
      </div>
    </form>
  );
};
