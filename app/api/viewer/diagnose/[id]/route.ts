import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { downloadStorageObject, fileExists, getFileMetadata } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/viewer/diagnose/[id]
 * 
 * Diagnostic endpoint for troubleshooting document viewing issues
 * Provides comprehensive status report without exposing sensitive data
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
    
    console.log(`[Viewer Diagnostics] Running diagnostics for document ${documentId}`);
    
    const diagnostics: any = {
      documentId,
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        canView: false,
        hasPages: false,
        storageAccessible: false,
        issues: [] as string[]
      }
    };
    
    // 1. Session Check
    diagnostics.checks.session = {
      authenticated: !!session?.user?.id,
      userId: session?.user?.id ? '***' : null, // Mask for privacy
      userRole: session?.user?.userRole || null,
      email: session?.user?.email ? '***@***' : null // Mask for privacy
    };
    
    if (!session?.user?.id) {
      diagnostics.summary.issues.push('User not authenticated');
    }
    
    // 2. Authorization Check
    const authResult = await canViewDocument(session, documentId);
    diagnostics.checks.authorization = {
      allowed: authResult.allowed,
      reason: authResult.reason,
      documentExists: !!authResult.document
    };
    
    if (!authResult.allowed) {
      diagnostics.summary.issues.push(`Authorization failed: ${authResult.reason}`);
    } else {
      diagnostics.summary.canView = true;
    }
    
    // 3. Document Check
    if (authResult.document) {
      diagnostics.checks.document = {
        id: authResult.document.id,
        title: authResult.document.title,
        filename: authResult.document.filename,
        mimeType: authResult.document.mimeType,
        isPdf: authResult.document.mimeType === 'application/pdf'
      };
      
      if (authResult.document.mimeType !== 'application/pdf') {
        diagnostics.summary.issues.push('Document is not a PDF');
      }
    } else {
      diagnostics.checks.document = {
        found: false
      };
      diagnostics.summary.issues.push('Document not found');
    }
    
    // 4. Database Pages Check
    let documentPages: any[] = [];
    try {
      documentPages = await prisma.documentPage.findMany({
        where: {
          documentId: documentId
        },
        select: {
          pageNumber: true,
          pageUrl: true,
          fileSize: true,
          format: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: {
          pageNumber: 'asc'
        }
      });
      
      diagnostics.checks.databasePages = {
        count: documentPages.length,
        pages: documentPages.map(page => ({
          pageNumber: page.pageNumber,
          hasUrl: !!page.pageUrl,
          fileSize: page.fileSize,
          format: page.format,
          created: page.createdAt,
          expires: page.expiresAt
        }))
      };
      
      if (documentPages.length > 0) {
        diagnostics.summary.hasPages = true;
      } else {
        diagnostics.summary.issues.push('No pages found in database');
      }
      
    } catch (dbError) {
      diagnostics.checks.databasePages = {
        error: 'Database query failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      };
      diagnostics.summary.issues.push('Database pages query failed');
    }
    
    // 5. Storage Accessibility Check (test first page only)
    if (documentPages.length > 0) {
      const firstPage = documentPages[0];
      let storagePath = firstPage.pageUrl;
      
      // Extract storage path from URL if needed
      if (storagePath && storagePath.startsWith('http')) {
        try {
          const url = new URL(storagePath);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.indexOf('public') + 1;
          if (bucketIndex > 0 && bucketIndex < pathParts.length) {
            storagePath = pathParts.slice(bucketIndex + 1).join('/');
          }
        } catch (urlError) {
          // Keep original path if URL parsing fails
        }
      }
      
      const bucketName = 'document-pages';
      
      try {
        // Check if file exists
        const exists = await fileExists(bucketName, storagePath);
        
        // Get file metadata
        const metadata = await getFileMetadata(bucketName, storagePath);
        
        // Try to download a small portion (just check if accessible)
        const downloadResult = await downloadStorageObject(bucketName, storagePath);
        
        diagnostics.checks.storage = {
          bucketName,
          storagePath: storagePath ? '***' : null, // Mask path for security
          exists,
          metadata: metadata ? {
            size: metadata.size,
            contentType: metadata.contentType,
            lastModified: metadata.lastModified
          } : null,
          downloadable: !downloadResult.error,
          downloadError: downloadResult.error || null,
          downloadSize: downloadResult.data ? downloadResult.data.byteLength : null
        };
        
        if (!downloadResult.error) {
          diagnostics.summary.storageAccessible = true;
        } else {
          diagnostics.summary.issues.push(`Storage access failed: ${downloadResult.error}`);
        }
        
      } catch (storageError) {
        diagnostics.checks.storage = {
          error: 'Storage check failed',
          details: storageError instanceof Error ? storageError.message : 'Unknown error'
        };
        diagnostics.summary.issues.push('Storage accessibility check failed');
      }
    } else {
      diagnostics.checks.storage = {
        skipped: 'No pages to check'
      };
    }
    
    // 6. Overall Health Assessment
    const processingTime = Date.now() - startTime;
    
    diagnostics.summary.healthy = diagnostics.summary.canView && 
                                  diagnostics.summary.hasPages && 
                                  diagnostics.summary.storageAccessible;
    
    diagnostics.summary.processingTime = processingTime;
    
    // 7. Recommendations
    const recommendations: string[] = [];
    
    if (!diagnostics.summary.canView) {
      if (!session?.user?.id) {
        recommendations.push('User needs to log in');
      } else {
        recommendations.push('Check user permissions for this document');
      }
    }
    
    if (!diagnostics.summary.hasPages) {
      recommendations.push('Document needs to be converted to generate page images');
    }
    
    if (!diagnostics.summary.storageAccessible && diagnostics.summary.hasPages) {
      recommendations.push('Check Supabase storage configuration and bucket permissions');
    }
    
    if (diagnostics.summary.healthy) {
      recommendations.push('Document should be viewable - check viewer component implementation');
    }
    
    diagnostics.recommendations = recommendations;
    
    console.log(`[Viewer Diagnostics] Completed for document ${documentId}: ${diagnostics.summary.healthy ? 'HEALTHY' : 'ISSUES FOUND'} (${processingTime}ms)`);
    
    return NextResponse.json(diagnostics, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': `${processingTime}ms`
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Viewer Diagnostics] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Diagnostics failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTime
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