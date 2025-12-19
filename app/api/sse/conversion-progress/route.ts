import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';
import db from '@/lib/db';

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

    // Verify user has access to this document
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { userId: session.user.id },
          {
            bookShopItems: {
              some: {
                myJstudyroomItems: {
                  some: {
                    userId: session.user.id
                  }
                }
              }
            }
          }
        ]
      }
    });

    if (!document) {
      return new Response('Document not found or access denied', { status: 404 });
    }

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = {
          type: 'connected',
          documentId,
          timestamp: new Date().toISOString(),
        };
        
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
        );

        // Set up polling for conversion progress
        const conversionManager = getConversionJobManager();
        let lastProgress: any = null;
        
        const pollProgress = async () => {
          try {
            const progress = await conversionManager.getProgress(documentId);
            
            // Only send update if progress has changed
            if (progress && JSON.stringify(progress) !== JSON.stringify(lastProgress)) {
              lastProgress = progress;
              
              const message = {
                type: 'progress',
                documentId,
                progress,
                timestamp: new Date().toISOString(),
              };
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
              );

              // If conversion is complete or failed, send completion message
              if (progress.status === 'completed' || progress.status === 'failed') {
                const completionMessage = {
                  type: progress.status === 'completed' ? 'complete' : 'error',
                  documentId,
                  result: progress.status === 'completed' 
                    ? { success: true, totalPages: progress.totalPages }
                    : { success: false, error: progress.message },
                  timestamp: new Date().toISOString(),
                };
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(completionMessage)}\n\n`)
                );
              }
            }
          } catch (error) {
            console.error('Error polling conversion progress:', error);
            
            const errorMessage = {
              type: 'error',
              documentId,
              error: {
                message: 'Failed to get conversion progress',
                code: 'POLLING_ERROR',
                retryable: true,
              },
              timestamp: new Date().toISOString(),
            };
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
            );
          }
        };

        // Poll every 2 seconds
        const pollInterval = setInterval(pollProgress, 2000);
        
        // Initial poll
        pollProgress();

        // Send keep-alive ping every 30 seconds
        const pingInterval = setInterval(() => {
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString(),
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(pingMessage)}\n\n`)
          );
        }, 30000);

        // Cleanup function
        const cleanup = () => {
          clearInterval(pollInterval);
          clearInterval(pingInterval);
        };

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          cleanup();
          controller.close();
        });

        // Store cleanup function for potential use
        (controller as any).cleanup = cleanup;
      },
      
      cancel() {
        // Cleanup when stream is cancelled
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}