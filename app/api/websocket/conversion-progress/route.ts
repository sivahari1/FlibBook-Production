import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WebSocketManager } from '@/lib/services/websocket-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return new Response('Document ID required', { status: 400 });
    }

    // Check if the request is a WebSocket upgrade
    const upgrade = request.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Get WebSocket manager instance
    const wsManager = WebSocketManager.getInstance();
    
    // Handle WebSocket connection
    const response = await wsManager.handleConnection(request, {
      userId: session.user.id,
      documentId,
    });

    return response;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}