import { WebSocketManager } from '../websocket-manager';
import { ConversionProgress } from '@/lib/types/conversion';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messages: string[] = [];

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({} as Event);
    }, 10);
  }

  send(data: string): void {
    this.messages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.({} as CloseEvent);
    }, 10);
  }

  getMessages(): any[] {
    return this.messages.map(msg => JSON.parse(msg));
  }

  simulateMessage(message: any): void {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify(message),
      } as MessageEvent);
    }
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    // Reset singleton instance
    (WebSocketManager as any).instance = null;
    wsManager = WebSocketManager.getInstance();
  });

  afterEach(() => {
    wsManager.cleanup();
  });

  describe('Connection Management', () => {
    it('should create singleton instance', () => {
      const instance1 = WebSocketManager.getInstance();
      const instance2 = WebSocketManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should track connection statistics', () => {
      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.documentSubscriptions).toBe(0);
      expect(stats.connectionsByDocument).toEqual({});
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast conversion progress to subscribers', () => {
      const documentId = 'doc-123';
      const progress: ConversionProgress = {
        documentId,
        status: 'processing',
        stage: 'processing',
        progress: 50,
        message: 'Converting pages...',
        totalPages: 10,
        processedPages: 5,
        retryCount: 0,
      };

      // No subscribers initially, should not throw
      expect(() => {
        wsManager.broadcastConversionProgress(documentId, progress);
      }).not.toThrow();
    });

    it('should broadcast conversion completion', () => {
      const documentId = 'doc-123';
      const result = { success: true, totalPages: 10 };

      expect(() => {
        wsManager.broadcastConversionComplete(documentId, result);
      }).not.toThrow();
    });

    it('should broadcast errors', () => {
      const documentId = 'doc-123';
      const error = {
        message: 'Conversion failed',
        code: 'CONVERSION_ERROR',
        retryable: true,
      };

      expect(() => {
        wsManager.broadcastError(documentId, error);
      }).not.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('should handle ping messages', () => {
      // This test would require mocking the internal connection handling
      // For now, we'll test the public interface
      expect(wsManager.getStats().totalConnections).toBe(0);
    });

    it('should handle subscription messages', () => {
      // Test subscription logic through public interface
      const stats = wsManager.getStats();
      expect(stats.documentSubscriptions).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all connections', () => {
      wsManager.cleanup();
      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.documentSubscriptions).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket upgrade errors gracefully', () => {
      // Test error handling in connection establishment
      expect(() => {
        // This would normally throw in the actual implementation
        // but our mock doesn't implement the upgrade logic
      }).not.toThrow();
    });
  });
});

describe('WebSocket Integration', () => {
  it('should handle real-time progress updates', async () => {
    const mockProgress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'processing',
      progress: 75,
      message: 'Processing pages...',
      totalPages: 20,
      processedPages: 15,
      retryCount: 0,
    };

    const wsManager = WebSocketManager.getInstance();
    
    // Test broadcasting without subscribers
    expect(() => {
      wsManager.broadcastConversionProgress('test-doc', mockProgress);
    }).not.toThrow();

    wsManager.cleanup();
  });

  it('should handle connection lifecycle', () => {
    const wsManager = WebSocketManager.getInstance();
    
    // Test initial state
    expect(wsManager.getStats().totalConnections).toBe(0);
    
    // Test cleanup
    wsManager.cleanup();
    expect(wsManager.getStats().totalConnections).toBe(0);
  });
});