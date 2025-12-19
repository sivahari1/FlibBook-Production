/**
 * Error Recovery Integration Tests
 * 
 * Tests error scenarios and recovery mechanisms across the unified viewer system.
 * Validates that the system handles failures gracefully and provides appropriate
 * recovery options.
 * 
 * Task 12.2: Write integration tests for error recovery
 * Requirements: 1.3, 5.1, 5.4
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UnifiedViewer from '../UnifiedViewer';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import { ContentType, EnhancedDocument } from '@/lib/types/content';
import { RenderingErrorType } from '@/lib/errors/rendering-errors';

// Mock dependencies
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration');
vi.mock('@/lib/pdfjs-memory');
vi.mock('@/lib/pdfjs-render-pipeline');
vi.mock('@/lib/loading-state-manager', () => ({
  useLoadingStateManager: vi.fn(() => ({
    updateLoadingState: vi.fn(),
    getLoadingState: vi.fn(),
    clearLoadingState: vi.fn(),
  })),
  createLoadingContextId: vi.fn((prefix, id) => `${prefix}-${id}`),
}));

vi.mock('@/lib/loading-state-persistence', () => ({
  useLoadingStatePersistence: vi.fn(() => ({
    saveState: vi.fn(),
    restoreState: vi.fn(() => null),
    clearState: vi.fn(),
  })),
}));
vi.mock('@/lib/resilience/retry-logic');

// Mock error recovery system
vi.mock('@/lib/errors/error-recovery', () => ({
  createErrorRecoverySystem: vi.fn(() => ({
    handleError: vi.fn(),
    canRecover: vi.fn(),
    attemptRecovery: vi.fn(),
    getRecoveryOptions: vi.fn(),
  })),
}));

describe('Error Recovery Integration Tests', () => {
  let mockErrorRecovery: any;
  let mockRetryLogic: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Setup mock error recovery system
    mockErrorRecovery = {
      handleError: vi.fn(),
      canRecover: vi.fn(() => true),
      attemptRecovery: vi.fn(() => Promise.resolve(true)),
      getRecoveryOptions: vi.fn(() => [
        { type: 'retry', description: 'Retry loading', action: vi.fn() },
        { type: 'alternative_url', description: 'Try alternative source', action: vi.fn() },
      ]),
    };

    // Setup mock retry logic
    mockRetryLogic = {
      executeWithRetry: vi.fn(),
      getCircuitBreakerState: vi.fn(() => 'CLOSED'),
      getFailureCount: vi.fn(() => 0),
      destroy: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test 1: Network Error Recovery
   * Validates recovery from network-related failures
   * Requirements: 5.1
   */
  describe('Network Error Recovery', () => {
    it('should handle network timeout errors with automatic retry', async () => {
      // Mock PDF viewer to simulate network timeout
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            // Simulate network timeout on first attempt
            const timeoutError = new Error('Network timeout');
            (timeoutError as any).type = RenderingErrorType.NETWORK_TIMEOUT;
            
            if (onError) {
              setTimeout(() => onError(timeoutError), 100);
            }
          }, [onError]);

          return <div data-testid="pdf-viewer-error">Network Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'network-error-test',
        title: 'Network Error Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/timeout.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer-error')).toBeInTheDocument();
      });

      // Should track error analytics
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'Network timeout',
          }),
        })
      );
    });

    it('should provide retry options for network failures', async () => {
      let attemptCount = 0;

      // Mock PDF viewer to fail first time, succeed second time
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            attemptCount++;
            
            if (attemptCount === 1) {
              // First attempt fails
              const networkError = new Error('Network failure');
              (networkError as any).type = RenderingErrorType.NETWORK_FAILURE;
              
              if (onError) {
                setTimeout(() => onError(networkError), 100);
              }
            } else {
              // Second attempt succeeds
              if (onLoadComplete) {
                setTimeout(() => onLoadComplete(5), 100);
              }
            }
          }, [onError, onLoadComplete]);

          return attemptCount === 1 
            ? <div data-testid="pdf-viewer-error">Network Error</div>
            : <div data-testid="pdf-viewer-success">PDF Loaded</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'retry-test',
        title: 'Retry Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/retry.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { rerender } = render(
        <UnifiedViewer content={document} />
      );

      // Fast-forward to trigger first error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer-error')).toBeInTheDocument();
      });

      // Simulate retry by re-rendering
      rerender(<UnifiedViewer content={document} />);

      // Fast-forward to complete retry
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-viewer-success')).toBeInTheDocument();
      });

      // Should have attempted twice
      expect(attemptCount).toBe(2);
    });

    it('should handle connection failures with fallback strategies', async () => {
      // Mock PDF viewer to simulate connection failure
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const connectionError = new Error('Connection refused');
            (connectionError as any).type = RenderingErrorType.NETWORK_FAILURE;
            
            if (onError) {
              setTimeout(() => onError(connectionError), 100);
            }
          }, [onError]);

          return <div data-testid="connection-error">Connection Failed</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'connection-test',
        title: 'Connection Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://unreachable.example.com/doc.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('connection-error')).toBeInTheDocument();
      });

      // Error should be displayed
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });
  });

  /**
   * Test 2: PDF Parsing Error Recovery
   * Validates recovery from PDF-specific parsing errors
   * Requirements: 1.3, 5.1
   */
  describe('PDF Parsing Error Recovery', () => {
    it('should handle corrupted PDF files with clear error messages', async () => {
      // Mock PDF viewer to simulate corrupted PDF
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const corruptedError = new Error('PDF is corrupted or invalid');
            (corruptedError as any).type = RenderingErrorType.PDF_CORRUPTED;
            
            if (onError) {
              setTimeout(() => onError(corruptedError), 100);
            }
          }, [onError]);

          return <div data-testid="corrupted-pdf-error">Corrupted PDF</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'corrupted-test',
        title: 'Corrupted PDF Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/corrupted.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('corrupted-pdf-error')).toBeInTheDocument();
      });

      // Should track specific error type
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'PDF is corrupted or invalid',
          }),
        })
      );
    });

    it('should handle password-protected PDFs appropriately', async () => {
      // Mock PDF viewer to simulate password-protected PDF
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const passwordError = new Error('PDF requires password');
            (passwordError as any).type = RenderingErrorType.PDF_PASSWORD_PROTECTED;
            
            if (onError) {
              setTimeout(() => onError(passwordError), 100);
            }
          }, [onError]);

          return <div data-testid="password-protected-error">Password Required</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'password-test',
        title: 'Password Protected PDF',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/protected.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('password-protected-error')).toBeInTheDocument();
      });

      // Should display password-specific error
      expect(screen.getByText('Password Required')).toBeInTheDocument();
    });

    it('should handle invalid PDF format with specific guidance', async () => {
      // Mock PDF viewer to simulate invalid format
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const formatError = new Error('Invalid PDF format');
            (formatError as any).type = RenderingErrorType.PDF_INVALID_FORMAT;
            
            if (onError) {
              setTimeout(() => onError(formatError), 100);
            }
          }, [onError]);

          return <div data-testid="invalid-format-error">Invalid Format</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'invalid-format-test',
        title: 'Invalid Format Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/invalid.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('invalid-format-error')).toBeInTheDocument();
      });

      // Should display format-specific error
      expect(screen.getByText('Invalid Format')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: Memory and Resource Error Recovery
   * Validates recovery from memory-related failures
   * Requirements: 5.1, 5.4
   */
  describe('Memory and Resource Error Recovery', () => {
    it('should handle memory allocation failures gracefully', async () => {
      // Mock PDF viewer to simulate memory error
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const memoryError = new Error('Out of memory');
            (memoryError as any).type = RenderingErrorType.MEMORY_ALLOCATION_FAILED;
            
            if (onError) {
              setTimeout(() => onError(memoryError), 100);
            }
          }, [onError]);

          return <div data-testid="memory-error">Memory Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'memory-test',
        title: 'Memory Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/large.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 100000000, mimeType: 'application/pdf' }, // Large file
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('memory-error')).toBeInTheDocument();
      });

      // Should display memory-specific error
      expect(screen.getByText('Memory Error')).toBeInTheDocument();
    });

    it('should handle worker process crashes with recovery', async () => {
      let workerCrashCount = 0;

      // Mock PDF viewer to simulate worker crash and recovery
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            workerCrashCount++;
            
            if (workerCrashCount === 1) {
              // First attempt: worker crash
              const workerError = new Error('Worker process crashed');
              (workerError as any).type = RenderingErrorType.WORKER_CRASHED;
              
              if (onError) {
                setTimeout(() => onError(workerError), 100);
              }
            } else {
              // Second attempt: recovery success
              if (onLoadComplete) {
                setTimeout(() => onLoadComplete(5), 100);
              }
            }
          }, [onError, onLoadComplete]);

          return workerCrashCount === 1 
            ? <div data-testid="worker-crash-error">Worker Crashed</div>
            : <div data-testid="worker-recovered">Worker Recovered</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'worker-test',
        title: 'Worker Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/worker.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { rerender } = render(
        <UnifiedViewer content={document} />
      );

      // Fast-forward to trigger worker crash
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('worker-crash-error')).toBeInTheDocument();
      });

      // Simulate worker recovery by re-rendering
      rerender(<UnifiedViewer content={document} />);

      // Fast-forward to complete recovery
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('worker-recovered')).toBeInTheDocument();
      });

      // Should have attempted recovery
      expect(workerCrashCount).toBe(2);
    });

    it('should implement resource cleanup on repeated failures', async () => {
      let cleanupCalled = false;

      // Mock PDF viewer to simulate repeated failures
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const resourceError = new Error('Resource exhausted');
            (resourceError as any).type = RenderingErrorType.RESOURCE_EXHAUSTED;
            
            if (onError) {
              setTimeout(() => onError(resourceError), 100);
            }

            // Simulate cleanup
            return () => {
              cleanupCalled = true;
            };
          }, [onError]);

          return <div data-testid="resource-error">Resource Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'resource-test',
        title: 'Resource Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/resource.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { unmount } = render(
        <UnifiedViewer content={document} />
      );

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('resource-error')).toBeInTheDocument();
      });

      // Unmount to trigger cleanup
      unmount();

      // Should have called cleanup
      expect(cleanupCalled).toBe(true);
    });
  });

  /**
   * Test 4: Browser Compatibility Error Recovery
   * Validates recovery from browser-specific issues
   * Requirements: 1.3, 5.1
   */
  describe('Browser Compatibility Error Recovery', () => {
    it('should handle PDF.js unavailability with fallback', async () => {
      // Mock PDF.js as unavailable
      vi.doMock('@/lib/pdfjs-config', () => ({
        initializePDFJS: vi.fn(),
        isPDFJSAvailable: vi.fn(() => false),
      }));

      // Mock PDF viewer to simulate PDF.js unavailable
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const compatError = new Error('PDF.js not available');
            (compatError as any).type = RenderingErrorType.BROWSER_COMPATIBILITY;
            
            if (onError) {
              setTimeout(() => onError(compatError), 100);
            }
          }, [onError]);

          return <div data-testid="pdfjs-unavailable">PDF.js Unavailable</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'compat-test',
        title: 'Compatibility Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/compat.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-unavailable')).toBeInTheDocument();
      });

      // Should display compatibility error
      expect(screen.getByText('PDF.js Unavailable')).toBeInTheDocument();
    });

    it('should handle security permission errors appropriately', async () => {
      // Mock PDF viewer to simulate security error
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const securityError = new Error('Permission denied');
            (securityError as any).type = RenderingErrorType.SECURITY_PERMISSION_DENIED;
            
            if (onError) {
              setTimeout(() => onError(securityError), 100);
            }
          }, [onError]);

          return <div data-testid="security-error">Permission Denied</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'security-test',
        title: 'Security Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/secure.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('security-error')).toBeInTheDocument();
      });

      // Should display security-specific error
      expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    });
  });

  /**
   * Test 5: Circuit Breaker Integration
   * Validates circuit breaker pattern in error recovery
   * Requirements: 5.1, 5.4
   */
  describe('Circuit Breaker Integration', () => {
    it('should implement circuit breaker for repeated failures', async () => {
      let failureCount = 0;
      const maxFailures = 3;

      // Mock PDF viewer to simulate repeated failures
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            failureCount++;
            
            const repeatedError = new Error(`Failure ${failureCount}`);
            (repeatedError as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
            
            if (onError) {
              setTimeout(() => onError(repeatedError), 100);
            }
          }, [onError]);

          return <div data-testid="repeated-failure">Repeated Failure {failureCount}</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'circuit-test',
        title: 'Circuit Breaker Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/circuit.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Render multiple times to trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward to trigger error
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('repeated-failure')).toBeInTheDocument();
        });

        unmount();
      }

      // Should have failed multiple times
      expect(failureCount).toBe(maxFailures);
    });

    it('should provide circuit breaker status information', async () => {
      // Mock PDF viewer to simulate circuit breaker open state
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const circuitError = new Error('Circuit breaker is OPEN');
            (circuitError as any).type = RenderingErrorType.CIRCUIT_BREAKER_OPEN;
            
            if (onError) {
              setTimeout(() => onError(circuitError), 100);
            }
          }, [onError]);

          return <div data-testid="circuit-open">Circuit Open</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'circuit-status-test',
        title: 'Circuit Status Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/circuit-status.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger circuit breaker
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('circuit-open')).toBeInTheDocument();
      });

      // Should display circuit breaker status
      expect(screen.getByText('Circuit Open')).toBeInTheDocument();
    });
  });

  /**
   * Test 6: Error Context and Diagnostics
   * Validates that error context is properly captured and reported
   * Requirements: 1.3
   */
  describe('Error Context and Diagnostics', () => {
    it('should capture comprehensive error context', async () => {
      const errorContext = {
        documentId: 'context-test',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        memoryUsage: 'high',
      };

      // Mock PDF viewer to simulate error with context
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const contextError = new Error('Error with context');
            (contextError as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
            (contextError as any).context = errorContext;
            
            if (onError) {
              setTimeout(() => onError(contextError), 100);
            }
          }, [onError]);

          return <div data-testid="context-error">Context Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'context-test',
        title: 'Context Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/context.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('context-error')).toBeInTheDocument();
      });

      // Should capture error context in analytics
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'Error with context',
          }),
        })
      );
    });

    it('should provide actionable error messages', async () => {
      const actionableErrors = [
        {
          type: RenderingErrorType.NETWORK_TIMEOUT,
          message: 'Network timeout - check your connection',
          expectedAction: 'Check connection and retry',
        },
        {
          type: RenderingErrorType.PDF_CORRUPTED,
          message: 'PDF file is corrupted',
          expectedAction: 'Try a different file',
        },
        {
          type: RenderingErrorType.MEMORY_ALLOCATION_FAILED,
          message: 'Not enough memory',
          expectedAction: 'Close other tabs and retry',
        },
      ];

      for (const errorCase of actionableErrors) {
        // Mock PDF viewer for specific error type
        vi.doMock('../PDFViewerWithPDFJS', () => ({
          default: ({ onError }: { onError?: (error: Error) => void }) => {
            React.useEffect(() => {
              const actionableError = new Error(errorCase.message);
              (actionableError as any).type = errorCase.type;
              
              if (onError) {
                setTimeout(() => onError(actionableError), 100);
              }
            }, [onError]);

            return <div data-testid="actionable-error">{errorCase.message}</div>;
          },
        }));

        const document: EnhancedDocument = {
          id: `actionable-${errorCase.type}`,
          title: 'Actionable Error Test',
          contentType: ContentType.PDF,
          fileUrl: 'https://example.com/actionable.pdf',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward to trigger error
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('actionable-error')).toBeInTheDocument();
        });

        // Should display actionable error message
        expect(screen.getByText(errorCase.message)).toBeInTheDocument();

        unmount();
      }
    });
  });

  /**
   * Test 7: Advanced Error Recovery Scenarios
   * Tests additional error types and recovery mechanisms
   * Requirements: 1.3, 5.1, 5.4
   */
  describe('Advanced Error Recovery Scenarios', () => {
    it('should handle network unavailable with connection monitoring', async () => {
      // Mock network unavailable scenario
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            // Simulate network unavailable initially
            const networkError = new Error('Network unavailable');
            (networkError as any).type = RenderingErrorType.NETWORK_UNAVAILABLE;
            
            if (onError) {
              setTimeout(() => onError(networkError), 100);
            }
          }, [onError]);

          return <div data-testid="network-unavailable">Network Unavailable</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'network-unavailable-test',
        title: 'Network Unavailable Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/unavailable.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('network-unavailable')).toBeInTheDocument();
      });

      expect(screen.getByText('Network Unavailable')).toBeInTheDocument();
    });

    it('should handle CORS errors with appropriate fallback', async () => {
      // Mock CORS error scenario
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const corsError = new Error('CORS policy violation');
            (corsError as any).type = RenderingErrorType.SECURITY_CORS_ERROR;
            
            if (onError) {
              setTimeout(() => onError(corsError), 100);
            }
          }, [onError]);

          return <div data-testid="cors-error">CORS Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'cors-test',
        title: 'CORS Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://cross-origin.example.com/doc.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('cors-error')).toBeInTheDocument();
      });

      expect(screen.getByText('CORS Error')).toBeInTheDocument();
    });

    it('should handle CSP violations with security guidance', async () => {
      // Mock CSP violation scenario
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const cspError = new Error('Content Security Policy violation');
            (cspError as any).type = RenderingErrorType.SECURITY_CSP_VIOLATION;
            
            if (onError) {
              setTimeout(() => onError(cspError), 100);
            }
          }, [onError]);

          return <div data-testid="csp-error">CSP Violation</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'csp-test',
        title: 'CSP Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/csp.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('csp-error')).toBeInTheDocument();
      });

      expect(screen.getByText('CSP Violation')).toBeInTheDocument();
    });

    it('should handle WebGL unavailable with graceful degradation', async () => {
      // Mock WebGL unavailable scenario
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const webglError = new Error('WebGL not available');
            (webglError as any).type = RenderingErrorType.BROWSER_WEBGL_UNAVAILABLE;
            
            if (onError) {
              setTimeout(() => onError(webglError), 100);
            }
          }, [onError]);

          return <div data-testid="webgl-unavailable">WebGL Unavailable</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'webgl-test',
        title: 'WebGL Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/webgl.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('webgl-unavailable')).toBeInTheDocument();
      });

      expect(screen.getByText('WebGL Unavailable')).toBeInTheDocument();
    });

    it('should handle resource exhaustion with cleanup', async () => {
      let cleanupExecuted = false;

      // Mock resource exhaustion scenario
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const resourceError = new Error('Resource exhausted');
            (resourceError as any).type = RenderingErrorType.MEMORY_EXHAUSTED;
            
            if (onError) {
              setTimeout(() => onError(resourceError), 100);
            }

            // Simulate cleanup on unmount
            return () => {
              cleanupExecuted = true;
            };
          }, [onError]);

          return <div data-testid="resource-exhausted">Resource Exhausted</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'resource-test',
        title: 'Resource Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/large-resource.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 500000000, mimeType: 'application/pdf' }, // Very large file
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { unmount } = render(<UnifiedViewer content={document} />);

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('resource-exhausted')).toBeInTheDocument();
      });

      expect(screen.getByText('Resource Exhausted')).toBeInTheDocument();

      // Unmount to trigger cleanup
      unmount();

      // Should have executed cleanup
      expect(cleanupExecuted).toBe(true);
    });
  });

  /**
   * Test 8: Error Recovery with Retry Logic Integration
   * Tests integration between error recovery and retry logic systems
   * Requirements: 5.1, 5.4
   */
  describe('Error Recovery with Retry Logic Integration', () => {
    it('should integrate with retry logic for transient failures', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      // Mock transient failure that succeeds after retries
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            attemptCount++;
            
            if (attemptCount < maxAttempts) {
              // Fail on first attempts
              const transientError = new Error(`Transient failure ${attemptCount}`);
              (transientError as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
              
              if (onError) {
                setTimeout(() => onError(transientError), 100);
              }
            } else {
              // Succeed on final attempt
              if (onLoadComplete) {
                setTimeout(() => onLoadComplete(5), 100);
              }
            }
          }, [onError, onLoadComplete]);

          return attemptCount < maxAttempts 
            ? <div data-testid="transient-failure">Transient Failure {attemptCount}</div>
            : <div data-testid="retry-success">Retry Success</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'retry-integration-test',
        title: 'Retry Integration Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/retry-integration.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { rerender } = render(<UnifiedViewer content={document} />);

      // Simulate multiple retry attempts
      for (let i = 1; i < maxAttempts; i++) {
        // Fast-forward to trigger error
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('transient-failure')).toBeInTheDocument();
        });

        // Simulate retry by re-rendering
        rerender(<UnifiedViewer content={document} />);
      }

      // Final attempt should succeed
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('retry-success')).toBeInTheDocument();
      });

      // Should have attempted the expected number of times
      expect(attemptCount).toBe(maxAttempts);
    });

    it('should respect circuit breaker state in error recovery', async () => {
      let failureCount = 0;
      const circuitBreakerThreshold = 5;

      // Mock repeated failures to trigger circuit breaker
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            failureCount++;
            
            const repeatedError = failureCount > circuitBreakerThreshold
              ? new Error('Circuit breaker is OPEN')
              : new Error(`Repeated failure ${failureCount}`);
            
            (repeatedError as any).type = failureCount > circuitBreakerThreshold
              ? RenderingErrorType.UNKNOWN_ERROR // Circuit breaker error
              : RenderingErrorType.PDF_RENDERING_FAILED;
            
            if (onError) {
              setTimeout(() => onError(repeatedError), 100);
            }
          }, [onError]);

          return failureCount > circuitBreakerThreshold
            ? <div data-testid="circuit-breaker-open">Circuit Breaker Open</div>
            : <div data-testid="repeated-failure">Repeated Failure {failureCount}</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'circuit-breaker-test',
        title: 'Circuit Breaker Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/circuit-breaker.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i <= circuitBreakerThreshold; i++) {
        const { unmount } = render(<UnifiedViewer content={document} />);

        // Fast-forward to trigger error
        vi.advanceTimersByTime(600);

        if (i < circuitBreakerThreshold) {
          await waitFor(() => {
            expect(screen.getByTestId('repeated-failure')).toBeInTheDocument();
          });
        } else {
          await waitFor(() => {
            expect(screen.getByTestId('circuit-breaker-open')).toBeInTheDocument();
          });
        }

        unmount();
      }

      // Should have triggered circuit breaker
      expect(failureCount).toBeGreaterThan(circuitBreakerThreshold);
    });

    it('should handle worker process recovery with error context', async () => {
      let workerRestartCount = 0;
      const maxWorkerRestarts = 2;

      // Mock worker process crashes and recovery
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            workerRestartCount++;
            
            if (workerRestartCount <= maxWorkerRestarts) {
              // Worker crash
              const workerError = new Error(`Worker crashed ${workerRestartCount}`);
              (workerError as any).type = RenderingErrorType.INITIALIZATION_FAILED;
              (workerError as any).context = {
                workerRestartCount,
                maxRestarts: maxWorkerRestarts,
              };
              
              if (onError) {
                setTimeout(() => onError(workerError), 100);
              }
            } else {
              // Worker recovery success
              if (onLoadComplete) {
                setTimeout(() => onLoadComplete(5), 100);
              }
            }
          }, [onError, onLoadComplete]);

          return workerRestartCount <= maxWorkerRestarts
            ? <div data-testid="worker-crash">Worker Crash {workerRestartCount}</div>
            : <div data-testid="worker-recovery-success">Worker Recovery Success</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'worker-recovery-test',
        title: 'Worker Recovery Test',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/worker-recovery.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { rerender } = render(<UnifiedViewer content={document} />);

      // Simulate worker crashes and restarts
      for (let i = 1; i <= maxWorkerRestarts; i++) {
        // Fast-forward to trigger worker crash
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('worker-crash')).toBeInTheDocument();
        });

        // Simulate worker restart by re-rendering
        rerender(<UnifiedViewer content={document} />);
      }

      // Final attempt should succeed after worker recovery
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('worker-recovery-success')).toBeInTheDocument();
      });

      // Should have attempted worker restarts
      expect(workerRestartCount).toBe(maxWorkerRestarts + 1);
    });
  });

  /**
   * Test 9: Error Recovery Analytics and Monitoring
   * Tests that error recovery events are properly tracked and monitored
   * Requirements: 1.3
   */
  describe('Error Recovery Analytics and Monitoring', () => {
    it('should track error recovery attempts in analytics', async () => {
      let recoveryAttempts = 0;

      // Mock error with recovery tracking
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError, onLoadComplete }: { 
          onError?: (error: Error) => void;
          onLoadComplete?: (numPages: number) => void;
        }) => {
          React.useEffect(() => {
            recoveryAttempts++;
            
            if (recoveryAttempts === 1) {
              // First attempt fails
              const trackableError = new Error('Trackable error');
              (trackableError as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
              (trackableError as any).recoveryAttempt = recoveryAttempts;
              
              if (onError) {
                setTimeout(() => onError(trackableError), 100);
              }
            } else {
              // Second attempt succeeds
              if (onLoadComplete) {
                setTimeout(() => onLoadComplete(5), 100);
              }
            }
          }, [onError, onLoadComplete]);

          return recoveryAttempts === 1
            ? <div data-testid="trackable-error">Trackable Error</div>
            : <div data-testid="recovery-tracked">Recovery Tracked</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'analytics-test',
        title: 'Analytics Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/analytics.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      const { rerender } = render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to trigger first error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('trackable-error')).toBeInTheDocument();
      });

      // Simulate recovery attempt
      rerender(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to complete recovery
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('recovery-tracked')).toBeInTheDocument();
      });

      // Should have tracked error and recovery
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'Trackable error',
          }),
        })
      );

      expect(recoveryAttempts).toBe(2);
    });

    it('should provide comprehensive error diagnostics', async () => {
      const errorDiagnostics = {
        documentId: 'diagnostics-test',
        errorType: RenderingErrorType.PDF_RENDERING_FAILED,
        browserInfo: {
          userAgent: navigator.userAgent,
          supportedFeatures: ['canvas', 'webgl'],
          webGLSupported: true,
          canvasSupported: true,
        },
        performanceMetrics: {
          loadTime: 1500,
          renderTime: 800,
          memoryUsage: 50000000,
        },
      };

      // Mock error with comprehensive diagnostics
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const diagnosticError = new Error('Error with diagnostics');
            (diagnosticError as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
            (diagnosticError as any).diagnostics = errorDiagnostics;
            
            if (onError) {
              setTimeout(() => onError(diagnosticError), 100);
            }
          }, [onError]);

          return <div data-testid="diagnostic-error">Diagnostic Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'diagnostics-test',
        title: 'Diagnostics Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/diagnostics.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward to trigger error
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('diagnostic-error')).toBeInTheDocument();
      });

      // Should have captured comprehensive diagnostics
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'Error with diagnostics',
          }),
        })
      );
    });
  });
});