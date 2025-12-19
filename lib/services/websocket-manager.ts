import { NextRequest } from 'next/server';
import { ConversionProgress } from '@/lib/types/conversion';

interface WebSocketConnection {
  id: string;
  userId: string;
  documentId: string;
  socket: WebSocket;
  lastPing: number;
}

interface ConnectionContext {
  userId: string;
  documentId: string;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocketConnection> = new Map();
  private documentSubscriptions: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPingInterval();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  async handleConnection(request: NextRequest, context: ConnectionContext): Promise<Response> {
    try {
      // Create WebSocket connection
      const { socket, response } = this.upgradeToWebSocket(request);
      
      const connectionId = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id: connectionId,
        userId: context.userId,
        documentId: context.documentId,
        socket,
        lastPing: Date.now(),
      };

      // Store connection
      this.connections.set(connectionId, connection);
      
      // Subscribe to document updates
      this.subscribeToDocument(context.documentId, connectionId);

      // Set up event handlers
      this.setupSocketHandlers(connection);

      // Send initial connection confirmation
      this.sendMessage(connectionId, {
        type: 'connected',
        connectionId,
        documentId: context.documentId,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      throw error;
    }
  }

  private upgradeToWebSocket(request: NextRequest): { socket: WebSocket; response: Response } {
    // Note: This is a simplified implementation
    // In a production environment, you'd use a proper WebSocket library
    // like 'ws' or integrate with a WebSocket server like Socket.IO
    
    // For Next.js, we need to use a different approach since WebSocket
    // upgrade isn't directly supported in the App Router
    // This would typically be handled by a separate WebSocket server
    
    throw new Error('WebSocket upgrade not implemented in this environment');
  }

  private setupSocketHandlers(connection: WebSocketConnection): void {
    const { socket, id } = connection;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(id, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      this.removeConnection(id);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.removeConnection(id);
    };
  }

  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'ping':
        connection.lastPing = Date.now();
        this.sendMessage(connectionId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'subscribe':
        if (message.documentId) {
          this.subscribeToDocument(message.documentId, connectionId);
        }
        break;
      
      case 'unsubscribe':
        if (message.documentId) {
          this.unsubscribeFromDocument(message.documentId, connectionId);
        }
        break;
    }
  }

  private subscribeToDocument(documentId: string, connectionId: string): void {
    if (!this.documentSubscriptions.has(documentId)) {
      this.documentSubscriptions.set(documentId, new Set());
    }
    this.documentSubscriptions.get(documentId)!.add(connectionId);
  }

  private unsubscribeFromDocument(documentId: string, connectionId: string): void {
    const subscribers = this.documentSubscriptions.get(documentId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.documentSubscriptions.delete(documentId);
      }
    }
  }

  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove from document subscriptions
      this.unsubscribeFromDocument(connection.documentId, connectionId);
      
      // Close socket if still open
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close();
      }
      
      // Remove from connections
      this.connections.delete(connectionId);
    }
  }

  private sendMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.removeConnection(connectionId);
      }
    }
  }

  /**
   * Broadcast conversion progress update to all subscribers of a document
   */
  broadcastConversionProgress(documentId: string, progress: ConversionProgress): void {
    const subscribers = this.documentSubscriptions.get(documentId);
    if (!subscribers) return;

    const message = {
      type: 'conversion_progress',
      documentId,
      progress,
      timestamp: new Date().toISOString(),
    };

    subscribers.forEach(connectionId => {
      this.sendMessage(connectionId, message);
    });
  }

  /**
   * Broadcast conversion completion to all subscribers of a document
   */
  broadcastConversionComplete(documentId: string, result: { success: boolean; totalPages?: number; error?: string }): void {
    const subscribers = this.documentSubscriptions.get(documentId);
    if (!subscribers) return;

    const message = {
      type: 'conversion_complete',
      documentId,
      result,
      timestamp: new Date().toISOString(),
    };

    subscribers.forEach(connectionId => {
      this.sendMessage(connectionId, message);
    });
  }

  /**
   * Broadcast error to all subscribers of a document
   */
  broadcastError(documentId: string, error: { message: string; code?: string; retryable?: boolean }): void {
    const subscribers = this.documentSubscriptions.get(documentId);
    if (!subscribers) return;

    const message = {
      type: 'error',
      documentId,
      error,
      timestamp: new Date().toISOString(),
    };

    subscribers.forEach(connectionId => {
      this.sendMessage(connectionId, message);
    });
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      this.connections.forEach((connection, id) => {
        // Check for stale connections (no ping in 60 seconds)
        if (now - connection.lastPing > 60000) {
          staleConnections.push(id);
        } else {
          // Send ping to active connections
          this.sendMessage(id, { type: 'ping', timestamp: new Date().toISOString() });
        }
      });

      // Remove stale connections
      staleConnections.forEach(id => this.removeConnection(id));
    }, 30000); // Check every 30 seconds
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    documentSubscriptions: number;
    connectionsByDocument: Record<string, number>;
  } {
    const connectionsByDocument: Record<string, number> = {};
    
    this.documentSubscriptions.forEach((subscribers, documentId) => {
      connectionsByDocument[documentId] = subscribers.size;
    });

    return {
      totalConnections: this.connections.size,
      documentSubscriptions: this.documentSubscriptions.size,
      connectionsByDocument,
    };
  }

  /**
   * Cleanup all connections (for graceful shutdown)
   */
  cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.connections.forEach((connection) => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close();
      }
    });

    this.connections.clear();
    this.documentSubscriptions.clear();
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();