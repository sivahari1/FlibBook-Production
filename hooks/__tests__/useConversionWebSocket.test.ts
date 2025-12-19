import { renderHook, act } from '@testing-library/react';
import { useConversionWebSocket, useConversionSSE } from '../useConversionWebSocket';
import { ConversionProgress } from '@/lib/types/conversion';
import { vi } from 'vitest';

// Mock EventSource for SSE tests
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.({} as Event);
    }, 10);
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify(data),
      } as MessageEvent);
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror({} as Event);
    }
  }
}

// Set up global mocks
(global as any).EventSource = MockEventSource;

describe('useConversionWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useConversionWebSocket({
        documentId: 'test-doc',
        enabled: false, // Disabled to prevent connection
      })
    );

    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastMessage).toBe(null);
  });
});

describe('useConversionSSE', () => {
  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() =>
      useConversionSSE({
        documentId: 'test-doc',
        enabled: false,
      })
    );

    expect(result.current.connected).toBe(false);
  });

  it('should connect when enabled', async () => {
    const { result } = renderHook(() =>
      useConversionSSE({
        documentId: 'test-doc',
        enabled: true,
      })
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.connected).toBe(true);
  });

  it('should handle progress messages', async () => {
    const onProgress = vi.fn();
    const { result } = renderHook(() =>
      useConversionSSE({
        documentId: 'test-doc',
        enabled: true,
        onProgress,
      })
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    const mockProgress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'processing',
      progress: 75,
      message: 'Almost done...',
      totalPages: 10,
      processedPages: 8,
      retryCount: 0,
    };

    // Simulate SSE message
    act(() => {
      const mockEventSource = (result.current as any).eventSourceRef?.current;
      if (mockEventSource && mockEventSource.simulateMessage) {
        mockEventSource.simulateMessage({
          type: 'progress',
          progress: mockProgress,
        });
      }
    });

    expect(onProgress).toHaveBeenCalledWith(mockProgress);
  });

  it('should handle completion messages', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useConversionSSE({
        documentId: 'test-doc',
        enabled: true,
        onComplete,
      })
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    const completionResult = { success: true, totalPages: 15 };

    // Simulate completion message
    act(() => {
      const mockEventSource = (result.current as any).eventSourceRef?.current;
      if (mockEventSource && mockEventSource.simulateMessage) {
        mockEventSource.simulateMessage({
          type: 'complete',
          result: completionResult,
        });
      }
    });

    expect(onComplete).toHaveBeenCalledWith(completionResult);
  });

  it('should disconnect when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useConversionSSE({
          documentId: 'test-doc',
          enabled,
        }),
      { initialProps: { enabled: true } }
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.connected).toBe(true);

    // Disable connection
    rerender({ enabled: false });

    expect(result.current.connected).toBe(false);
  });
});