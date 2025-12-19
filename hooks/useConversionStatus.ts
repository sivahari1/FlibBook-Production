import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversionProgress, ConversionStatus } from '@/lib/types/conversion';

interface UseConversionStatusOptions {
  documentId: string;
  enabled?: boolean;
  pollInterval?: number;
  onComplete?: (progress: ConversionProgress) => void;
  onError?: (error: string) => void;
}

interface ConversionStatusResult {
  progress: ConversionProgress | null;
  isLoading: boolean;
  error: string | null;
  startConversion: (priority?: string) => Promise<void>;
  retryConversion: () => Promise<void>;
  cancelConversion: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useConversionStatus({
  documentId,
  enabled = true,
  pollInterval = 2000,
  onComplete,
  onError,
}: UseConversionStatusOptions): ConversionStatusResult {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const fetchStatus = useCallback(async (): Promise<ConversionProgress | null> => {
    try {
      const response = await fetch(`/api/documents/${documentId}/conversion-status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversion status';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [documentId, onError]);

  const startPolling = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    const poll = async () => {
      if (!mountedRef.current) return;

      const newProgress = await fetchStatus();
      
      if (!mountedRef.current) return;

      if (newProgress) {
        setProgress(newProgress);
        setError(null);

        // Check if conversion is complete
        if (newProgress.status === 'completed') {
          onComplete?.(newProgress);
          return; // Stop polling
        }

        // Check if conversion failed and no more retries
        if (newProgress.status === 'failed' && newProgress.retryCount >= 3) {
          return; // Stop polling
        }

        // Continue polling for active conversions
        if (newProgress.status === 'queued' || newProgress.status === 'processing') {
          pollTimeoutRef.current = setTimeout(poll, pollInterval);
        }
      }
    };

    poll();
  }, [enabled, fetchStatus, onComplete, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  // Start polling when enabled or documentId changes
  useEffect(() => {
    if (enabled && documentId) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, documentId, startPolling, stopPolling]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newProgress = await fetchStatus();
      if (newProgress && mountedRef.current) {
        setProgress(newProgress);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchStatus]);

  const performAction = useCallback(async (action: string, priority?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/conversion-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, priority }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.job && mountedRef.current) {
        setProgress(result.job);
        // Start polling for the new job
        startPolling();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} conversion`;
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [documentId, onError, startPolling]);

  const startConversion = useCallback(async (priority: string = 'normal') => {
    await performAction('start', priority);
  }, [performAction]);

  const retryConversion = useCallback(async () => {
    await performAction('retry');
  }, [performAction]);

  const cancelConversion = useCallback(async () => {
    stopPolling();
    await performAction('cancel');
  }, [performAction, stopPolling]);

  return {
    progress,
    isLoading,
    error,
    startConversion,
    retryConversion,
    cancelConversion,
    refetch,
  };
}

// Helper hook for simple conversion status checking
export function useConversionProgress(documentId: string, enabled: boolean = true) {
  const [status, setStatus] = useState<ConversionStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const { progress: conversionProgress, error } = useConversionStatus({
    documentId,
    enabled,
    onComplete: (progress) => {
      setStatus('completed');
      setProgress(100);
      setMessage('Conversion completed successfully');
    },
    onError: (error) => {
      setStatus('failed');
      setMessage(error);
    },
  });

  useEffect(() => {
    if (conversionProgress) {
      setStatus(conversionProgress.status as ConversionStatus);
      setProgress(conversionProgress.progress);
      setMessage(conversionProgress.message);
    }
  }, [conversionProgress]);

  return {
    status,
    progress,
    message,
    error,
    isActive: status === 'queued' || status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
  };
}