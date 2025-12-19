'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface EmailShareFormProps {
  documentId: string;
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  expiresAt: string;
  canDownload: boolean;
  note: string;
  watermarkText: string;
}

export const EmailShareForm: React.FC<EmailShareFormProps> = ({
  documentId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    expiresAt: '',
    canDownload: false,
    note: '',
    watermarkText: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: {
        documentId: string;
        email: string;
        canDownload: boolean;
        expiresAt?: string;
        note?: string;
        watermarkText?: string;
      } = {
        documentId,
        email: formData.email,
        canDownload: formData.canDownload,
      };

      if (formData.expiresAt) {
        payload.expiresAt = new Date(formData.expiresAt).toISOString();
      }
      if (formData.note) {
        payload.note = formData.note;
      }
      if (formData.watermarkText && formData.watermarkText.trim() !== '') {
        payload.watermarkText = formData.watermarkText.trim();
      }

      const response = await fetch('/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to share document');
      }

      setSuccess(true);
      setFormData({
        email: '',
        expiresAt: '',
        canDownload: false,
        note: '',
        watermarkText: '',
      });

      // Auto-close after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setError(null);
    setFormData({
      email: '',
      expiresAt: '',
      canDownload: false,
      note: '',
      watermarkText: '',
    });
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
            Document Shared Successfully!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            An email notification has been sent to the recipient.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleReset} variant="secondary" className="flex-1">
            Share with Another Person
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

      {/* Email Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recipient Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="user@example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          The document will be shared directly with this email address
        </p>
      </div>

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
          id="emailCanDownload"
          checked={formData.canDownload}
          onChange={(e) =>
            setFormData({ ...formData, canDownload: e.target.checked })
          }
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="emailCanDownload"
          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
        >
          Allow download
        </label>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Personal Note (Optional)
        </label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Add a personal message..."
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Include a message with your share
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formData.note.length}/500
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="flex-1"
          disabled={!formData.email}
        >
          Share Document
        </Button>
      </div>
    </form>
  );
};
