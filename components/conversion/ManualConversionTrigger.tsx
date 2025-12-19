/**
 * Manual Conversion Trigger Component
 * 
 * Provides a user interface for manually triggering document conversion
 * with priority selection and status feedback. Used when automatic conversion
 * fails or when users want to prioritize specific documents.
 * 
 * Requirements: 2.4, 3.2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ConversionOptions {
  documentId: string;
  documentTitle: string;
  contentType: string;
  convertible: boolean;
  existingPages: number;
  hasPages: boolean;
  currentConversion?: {
    jobId: string;
    status: string;
    progress: number;
    estimatedCompletion?: string;
    startedAt: string;
  };
  queue: {
    depth: number;
    activeJobs: number;
    averageProcessingTime: number;
    estimatedWaitTime: number;
  };
  options: {
    availablePriorities: string[];
    canForceReconvert: boolean;
    recommendedPriority: string;
  };
}

interface ConversionResult {
  success: boolean;
  data?: {
    documentId: string;
    documentTitle: string;
    conversionId: string;
    priority: string;
    force: boolean;
    queue: {
      position: number;
      estimatedWaitTime: number;
      estimatedWaitTimeFormatted: string;
    };
    status: {
      stage: string;
      progress: number;
      message: string;
    };
  };
  error?: string;
  message?: string;
}

interface ManualConversionTriggerProps {
  documentId: string;
  onConversionStarted?: (result: ConversionResult) => void;
  onClose?: () => void;
  className?: string;
}

export function ManualConversionTrigger({
  documentId,
  onConversionStarted,
  onClose,
  className = '',
}: ManualConversionTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConversionOptions | null>(null);
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [force, setForce] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);

  // Load conversion options when modal opens
  useEffect(() => {
    if (isOpen && !options) {
      loadConversionOptions();
    }
  }, [isOpen, documentId]);

  const loadConversionOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/convert`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversion options');
      }

      setOptions(data.data);
      setPriority(data.data.options.recommendedPriority as 'high' | 'normal' | 'low');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion options');
    } finally {
      setLoading(false);
    }
  };

  const triggerConversion = async () => {
    if (!options) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority,
          force,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger conversion');
      }

      setResult(data);
      onConversionStarted?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger conversion');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setOptions(null);
    setResult(null);
    setError(null);
    setReason('');
    setForce(false);
    onClose?.();
  };

  const getPriorityDescription = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Process immediately (for urgent documents)';
      case 'normal':
        return 'Standard processing time';
      case 'low':
        return 'Process when system is less busy';
      default:
        return '';
    }
  };

  const formatWaitTime = (ms: number) => {
    if (ms < 1000) return 'Less than 1 second';
    
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={className}
        disabled={loading}
      >
        Manual Convert
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Manual Document Conversion"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {loading && !options && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading conversion options...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Conversion Started</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{result.message}</p>
                    {result.data && (
                      <div className="mt-2 space-y-1">
                        <p><strong>Conversion ID:</strong> {result.data.conversionId}</p>
                        <p><strong>Queue Position:</strong> {result.data.queue.position}</p>
                        <p><strong>Estimated Wait:</strong> {result.data.queue.estimatedWaitTimeFormatted}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {options && !result && (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Title:</span>
                    <p className="text-gray-900">{options.documentTitle}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <p className="text-gray-900">{options.contentType}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Convertible:</span>
                    <p className={options.convertible ? 'text-green-600' : 'text-red-600'}>
                      {options.convertible ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Existing Pages:</span>
                    <p className="text-gray-900">{options.existingPages}</p>
                  </div>
                </div>
              </div>

              {!options.convertible && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800">
                    This document type cannot be converted to pages. Only PDF documents support conversion.
                  </p>
                </div>
              )}

              {options.currentConversion && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Conversion In Progress</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Status:</strong> {options.currentConversion.status}</p>
                    <p><strong>Progress:</strong> {options.currentConversion.progress}%</p>
                    {options.currentConversion.estimatedCompletion && (
                      <p><strong>Estimated Completion:</strong> {new Date(options.currentConversion.estimatedCompletion).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              {options.convertible && !options.currentConversion && (
                <div className="space-y-4">
                  {/* Priority Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conversion Priority
                    </label>
                    <div className="space-y-2">
                      {options.options.availablePriorities.map((p) => (
                        <label key={p} className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value={p}
                            checked={priority === p}
                            onChange={(e) => setPriority(e.target.value as 'high' | 'normal' | 'low')}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-900 capitalize">{p}</span>
                            <p className="text-xs text-gray-500">{getPriorityDescription(p)}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Force Reconversion */}
                  {options.options.canForceReconvert && (
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={force}
                          onChange={(e) => setForce(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">Force Reconversion</span>
                          <p className="text-xs text-gray-500">
                            Reconvert even though pages already exist (use if previous conversion had issues)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why are you manually triggering this conversion?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* Queue Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Current Queue Status</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Queue Depth:</span>
                        <p className="text-gray-900">{options.queue.depth} jobs</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Active Jobs:</span>
                        <p className="text-gray-900">{options.queue.activeJobs}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Estimated Wait Time:</span>
                        <p className="text-gray-900">{formatWaitTime(options.queue.estimatedWaitTime)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            {options?.convertible && !options.currentConversion && !result && (
              <Button
                onClick={triggerConversion}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Conversion...
                  </>
                ) : (
                  'Start Conversion'
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}