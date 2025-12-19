/**
 * Problem Report Modal Component
 * 
 * Allows users to report persistent document viewing issues
 * with detailed context for support team.
 * 
 * Task 5.3: Add manual retry mechanisms - "Report Problem" functionality
 * Requirements: 2.4, 3.2
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DocumentErrorType } from '@/lib/resilience/document-error-recovery';
import { ErrorContext } from '@/lib/errors/user-friendly-messages';

interface ProblemReportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Error type that occurred */
  errorType: DocumentErrorType;
  /** Document ID */
  documentId: string;
  /** Document title */
  documentTitle?: string;
  /** Error context */
  errorContext?: ErrorContext;
  /** Original error message */
  errorMessage?: string;
}

interface ProblemReport {
  category: string;
  description: string;
  stepsToReproduce: string;
  urgency: 'low' | 'medium' | 'high';
  contactMethod: 'email' | 'phone' | 'none';
  contactInfo?: string;
}

export function ProblemReportModal({
  isOpen,
  onClose,
  errorType,
  documentId,
  documentTitle,
  errorContext,
  errorMessage
}: ProblemReportModalProps) {
  const [report, setReport] = useState<ProblemReport>({
    category: getDefaultCategory(errorType),
    description: '',
    stepsToReproduce: '',
    urgency: 'medium',
    contactMethod: 'email',
    contactInfo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function getDefaultCategory(errorType: DocumentErrorType): string {
    switch (errorType) {
      case DocumentErrorType.CONVERSION_FAILED:
        return 'document-conversion';
      case DocumentErrorType.NETWORK_FAILURE:
        return 'connection-issue';
      case DocumentErrorType.STORAGE_URL_EXPIRED:
        return 'access-issue';
      case DocumentErrorType.PAGES_NOT_FOUND:
        return 'missing-content';
      case DocumentErrorType.TIMEOUT:
        return 'performance-issue';
      case DocumentErrorType.DOCUMENT_CORRUPTED:
        return 'file-corruption';
      case DocumentErrorType.PERMISSION_DENIED:
        return 'access-denied';
      default:
        return 'other';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare report data
      const reportData = {
        ...report,
        documentId,
        documentTitle,
        errorType,
        errorMessage,
        errorContext,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Submit to support API
      const response = await fetch('/api/support/problem-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        setSubmitted(true);
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 3000);
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting problem report:', error);
      alert('Failed to submit report. Please try again or contact support directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSubmitted(false);
    }
  };

  if (submitted) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Report Submitted">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Thank You!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your problem report has been submitted successfully. Our support team will review it and get back to you soon.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This window will close automatically in a few seconds.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report Problem">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Problem Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Problem Category
          </label>
          <select
            value={report.category}
            onChange={(e) => setReport(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="document-conversion">Document Conversion Issue</option>
            <option value="connection-issue">Network/Connection Problem</option>
            <option value="access-issue">Access/Permission Problem</option>
            <option value="missing-content">Missing or Corrupted Content</option>
            <option value="performance-issue">Slow Loading/Timeout</option>
            <option value="file-corruption">File Corruption</option>
            <option value="access-denied">Access Denied</option>
            <option value="other">Other Issue</option>
          </select>
        </div>

        {/* Problem Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Describe the Problem
          </label>
          <textarea
            value={report.description}
            onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Please describe what happened and what you expected to happen..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            required
          />
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Steps to Reproduce (Optional)
          </label>
          <textarea
            value={report.stepsToReproduce}
            onChange={(e) => setReport(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
            placeholder="1. I clicked on...&#10;2. Then I tried to...&#10;3. The error occurred when..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
        </div>

        {/* Urgency Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Urgency Level
          </label>
          <select
            value={report.urgency}
            onChange={(e) => setReport(prev => ({ ...prev, urgency: e.target.value as 'low' | 'medium' | 'high' }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="low">Low - I can work around this</option>
            <option value="medium">Medium - This is inconvenient</option>
            <option value="high">High - This blocks my work</option>
          </select>
        </div>

        {/* Contact Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            How should we contact you?
          </label>
          <select
            value={report.contactMethod}
            onChange={(e) => setReport(prev => ({ ...prev, contactMethod: e.target.value as 'email' | 'phone' | 'none' }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="email">Email me with updates</option>
            <option value="phone">Call me if needed</option>
            <option value="none">No contact needed</option>
          </select>
        </div>

        {/* Contact Info */}
        {report.contactMethod !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {report.contactMethod === 'email' ? 'Email Address' : 'Phone Number'}
            </label>
            <input
              type={report.contactMethod === 'email' ? 'email' : 'tel'}
              value={report.contactInfo}
              onChange={(e) => setReport(prev => ({ ...prev, contactInfo: e.target.value }))}
              placeholder={report.contactMethod === 'email' ? 'your@email.com' : '+1 (555) 123-4567'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Technical Details */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Technical Details (Automatically Included)
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>Document:</strong> {documentTitle || 'Unknown'}</div>
            <div><strong>Document ID:</strong> {documentId}</div>
            <div><strong>Error Type:</strong> {errorType}</div>
            {errorMessage && <div><strong>Error Message:</strong> {errorMessage}</div>}
            <div><strong>Browser:</strong> {errorContext?.browserInfo?.name || 'Unknown'} {errorContext?.browserInfo?.version || ''}</div>
            <div><strong>Retry Count:</strong> {errorContext?.retryCount || 0}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Report'
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ProblemReportModal;