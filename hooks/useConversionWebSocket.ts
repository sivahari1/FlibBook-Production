import { useEffect, useRef, useState, useCallback } from 'react';
import { ConversionProgress } from '@/lib/types/conversion';

interface WebSocketMessage {
  type: 'connected' | 'conversion_progress' | 'conversion_complete' | 'error' | 'ping' | 'pong';
  documentId?: string;
  progress?: ConversionProgress;
  result?: { success: boolean; totalPages?: number; error?: string };
  error?: { message: string; code?: string; retryable?: boolean };
  timestamp: string;
  connectionId?: string;
}

interface UseConversionWebSocketOptions {
  documentId: string;
  enabled?: boolean;
  onProgress?: (progress: ConversionProgress) => void;
  onComplete?: (result: { success: boolean; totalPages?: number; error?: string }) => void;
  onError?: (error: { message: string; code?: string; retryable?: boolean }) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
}

export function useConversionWebSocket({
  documentId,
  enabled = true,
  onProgress,
  onComplete,
  onError,
  onConnectionChange,
}: UseConversionWebSocketOptions) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const connect = useCallback(() => {
    if (!enabled || !documentId) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      // Note: In a real implementation, you'd use the actual WebSocket URL
      // For now, we'll simulate the WebSocket connection
      const wsUrl = `/api/websocket/conversion-progress?documentId=${documentId}`;
      
      // Since Next.js doesn't support WebSocket upgrades directly,
      // we'll use Server-Sent Events (SSE) as an alternative for real-time updates
      // or integrate with a separate WebSocket server
      
      // For demonstration, we'll create a mock WebSocket-like interface
      const mockWs = createMockWebSocket(wsUrl);
      
      wsRef.current = mockWs;

      mockWs.onopen = () => {
        setState(prev => ({ ...prev, connected: true, connecting: false, error: null }));
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      mockWs.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));

          switch (message.type) {
            case 'conversion_progress':
              if (message.progress) {
                onProgress?.(message.progress);
              }
              break;
            
            case 'conversion_complete':
              if (message.result) {
                onComplete?.(message.result);
              }
              break;
            
            case 'error':
              if (message.error) {
                onError?.(message.error);
              }
              break;
            
            case 'ping':
              // Respond to ping with pong
              mockWs.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      mockWs.onclose = () => {
        setState(prev => ({ ...prev, connected: false, connecting: false }));
        onConnectionChange?.(false);
        
        // Attempt to reconnect if enabled and within retry limits
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      mockWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: 'Connection failed' 
        }));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: 'Failed to connect' 
      }));
    }
  }, [documentId, enabled, onProgress, onComplete, onError, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({ ...prev, connected: false, connecting: false }));
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && state.connected) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, [state.connected]);

  const subscribe = useCallback((docId: string) => {
    sendMessage({ type: 'subscribe', documentId: docId });
  }, [sendMessage]);

  const unsubscribe = useCallback((docId: string) => {
    sendMessage({ type: 'unsubscribe', documentId: docId });
  }, [sendMessage]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
  };
}

// Mock WebSocket implementation for demonstration
// In production, this would be replaced with actual WebSocket or SSE
function createMockWebSocket(url: string): WebSocket {
  const mockWs = {
    readyState: WebSocket.CONNECTING,
    url,
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onclose: null as ((event: CloseEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    
    send: (data: string) => {
      // Mock send implementation
      console.log('Mock WebSocket send:', data);
    },
    
    close: () => {
      mockWs.readyState = WebSocket.CLOSED;
      setTimeout(() => {
        mockWs.onclose?.({} as CloseEvent);
      }, 0);
    },
  };

  // Simulate connection opening
  setTimeout(() => {
    mockWs.readyState = WebSocket.OPEN;
    mockWs.onopen?.({} as Event);
    
    // Send initial connected message
    setTimeout(() => {
      mockWs.onmessage?.({
        data: JSON.stringify({
          type: 'connected',
          connectionId: 'mock_connection_id',
          documentId: new URL(url).searchParams.get('documentId'),
          timestamp: new Date().toISOString(),
        }),
      } as MessageEvent);
    }, 100);
  }, 100);

  return mockWs as unknown as WebSocket;
}

// Alternative implementation using Server-Sent Events (SSE)
export function useConversionSSE({
  documentId,
  enabled = true,
  onProgress,
  onComplete,
  onError,
}: Omit<UseConversionWebSocketOptions, 'onConnectionChange'>) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !documentId) return;

    const eventSource = new EventSource(`/api/sse/conversion-progress?documentId=${documentId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'progress':
            onProgress?.(data.progress);
            break;
          case 'complete':
            onComplete?.(data.result);
            break;
          case 'error':
            onError?.(data.error);
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [documentId, enabled, onProgress, onComplete, onError]);

  return { connected };
}