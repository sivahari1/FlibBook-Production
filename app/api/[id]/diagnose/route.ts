import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { prisma } from '@/lib/db';
import { downloadFile } from '@/lib/storage';

export const runtime = "nodejs";

/**
 * GET /api/viewer/documents/[id]/diagnose
 * 
 * Diagnostic endpoint for troubleshooting document viewing issues
 * Returns detailed information about document state, pages, and storage
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing document ID
 * @returns JSON diagnostic report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    // Get session for authorization
    const session = await getServerSession(authOptions);
    
    // Await params Promise (Next.js 15 requirement)
    const { id: documentId } = await params;
    
    console.log(`[Diagnostic] Running diagnostic for document ${documentId}`);
    
    // Check authorization
    const authResult = await canViewDocument(session, documentId);
    
    const diagnostic = {
      documentId,
      timestamp: new Date().toISOString(),
      processingTime: 0,
      auth: {
        authenticated: !!session?.user,
        userId: session?.user?.id || null,
        userRole: session?.user?.userRole || null,
        allowed: authResult.allowed,
        reason: authResult.reason
      },
      document: null as any,
      pages: {
        count: 0,
        pages: [] as any[],
        storageChecks: [] as any[]
      },
      errors: [] as string[]
    };
    
    // Document information
    if (authResult.document) {
      diagnostic.document = {
        id: authResult.document.id,
        title: authResult.document.title,
        filename: authResult.document.filename,
        mimeType: authResult.document.mimeType,
        fileSize: authResult.document.fileSize?.toString() || null,
        pageCount: authResult.document.pageCount,
        createdAt: authResult.document.createdAt,
        userId: authResult.document.userId
      };
    } else {
      diagnostic.errors.push('Document not found or access denied');
    }
    
    // Page information and storage checks
    if (authResult.allowed && authResult.document) {
      try {
        const documentPages = await prisma.documentPage.findMany({
          where: { documentId },
          select: {
            pageNumber: true,
            pageUrl: true,
            fileSize: true,
            format: true
          },
          orderBy: { pageNumber: 'asc' }
        });
        
        diagnostic.pages.count = documentPages.length;
        
        // Check first 5 pages for storage accessibility
        const pagesToCheck = documentPages.slice(0, 5);
        
        for (const page of pagesToCheck) {
          const pageInfo = {
            pageNumber: page.pageNumber,
            pageUrl: page.pageUrl,
            fileSize: page.fileSize,
            format: page.format,
            storageExists: false,
            storageError: null as string | null,
            storagePath: null as string | null
          };
          
          // Extract storage path from pageUrl
          let storagePath = page.pageUrl;
          if (storagePath.startsWith('http')) {
            try {
              const url = new URL(storagePath);
              const pathParts = url.pathname.split('/');
              const bucketIndex = pathParts.indexOf('public') + 1;
              if (bucketIndex > 0 && bucketIndex < pathParts.length) {
                storagePath = pathParts.slice(bucketIndex + 1).join('/');
              }
            } catch (urlError) {
              pageInfo.storageError = `Invalid URL format: ${storagePath}`;
            }
          }
          
          pageInfo.storagePath = storagePath;
          
          // Check if file exists in storage
          try {
            const downloadResult = await downloadFile(storagePath, 'document-pages');
            if (downloadResult.data) {
              pageInfo.storageExists = true;
            } else {
              pageInfo.storageError = downloadResult.error || 'File not found';
            }
          } catch (storageError) {
            pageInfo.storageError = `Storage check failed: ${storageError}`;
          }
          
          diagnostic.pages.storageChecks.push(pageInfo);
        }
        
        diagnostic.pages.pages = documentPages.map(p => ({
          pageNumber: p.pageNumber,
          format: p.format,
          fileSize: p.fileSize
        }));
        
      } catch (dbError) {
        diagnostic.errors.push(`Database error: ${dbError}`);
      }
    }
    
    diagnostic.processingTime = Date.now() - startTime;
    
    console.log(`[Diagnostic] Completed diagnostic for document ${documentId} in ${diagnostic.processingTime}ms`);
    
    return NextResponse.json(diagnostic, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': `${diagnostic.processingTime}ms`
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Diagnostic] Error in diagnostic endpoint:', error);
    
    return NextResponse.json(
      {
        documentId: (await params).id,
        timestamp: new Date().toISOString(),
        processingTime,
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        auth: { authenticated: false, allowed: false }
      },
      { 
        status: 500,
        headers: {
          'X-Processing-Time': `${processingTime}ms`
        }
      }
    );
  }
}