import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { prisma } from '@/lib/db';
import { downloadFile } from '@/lib/storage';

export const runtime = "nodejs";

/**
 * POST /api/viewer/documents/[id]/repair
 * 
 * Admin-only endpoint for repairing document viewing issues
 * 
 * Checks:
 * - Document pages exist in database
 * - Storage files exist for each page
 * - Attempts to regenerate missing pages if possible
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing document ID
 * @returns JSON repair report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    // Get session for authorization
    const session = await getServerSession(authOptions);
    
    // Await params Promise (Next.js 15 requirement)
    const { id: documentId } = await params;
    
    // Admin-only endpoint
    if (!session?.user || session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          message: 'This endpoint is only available to administrators'
        },
        { status: 403 }
      );
    }
    
    console.log(`[Repair] Starting repair for document ${documentId} by admin ${session.user.id}`);
    
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        storagePath: true,
        pageCount: true,
        userId: true
      }
    });
    
    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
          message: 'The specified document does not exist'
        },
        { status: 404 }
      );
    }
    
    const repairReport = {
      documentId,
      documentTitle: document.title,
      timestamp: new Date().toISOString(),
      processingTime: 0,
      checks: {
        documentExists: true,
        isPdf: document.mimeType === 'application/pdf',
        hasSourceFile: false,
        pagesInDatabase: 0,
        pagesInStorage: 0
      },
      pages: [] as any[],
      issues: [] as string[],
      repairs: [] as string[],
      recommendations: [] as string[]
    };
    
    // Check if source PDF exists in storage
    if (document.storagePath) {
      try {
        const sourceCheck = await downloadFile(document.storagePath, 'documents');
        repairReport.checks.hasSourceFile = !!sourceCheck.data;
        if (!sourceCheck.data) {
          repairReport.issues.push(`Source PDF file not found at: ${document.storagePath}`);
        }
      } catch (error) {
        repairReport.issues.push(`Error checking source PDF: ${error}`);
      }
    } else {
      repairReport.issues.push('Document has no storage path');
    }
    
    // Get all pages from database
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
    
    repairReport.checks.pagesInDatabase = documentPages.length;
    
    if (documentPages.length === 0) {
      repairReport.issues.push('No pages found in database - document needs conversion');
      repairReport.recommendations.push('Run document conversion to generate pages');
    }
    
    // Check each page in storage
    let pagesInStorage = 0;
    
    for (const page of documentPages) {
      const pageInfo = {
        pageNumber: page.pageNumber,
        pageUrl: page.pageUrl,
        fileSize: page.fileSize,
        format: page.format,
        storageExists: false,
        storageError: null as string | null,
        storagePath: null as string | null,
        repaired: false
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
          pagesInStorage++;
        } else {
          pageInfo.storageError = downloadResult.error || 'File not found';
          repairReport.issues.push(`Page ${page.pageNumber} missing from storage: ${storagePath}`);
        }
      } catch (storageError) {
        pageInfo.storageError = `Storage check failed: ${storageError}`;
        repairReport.issues.push(`Page ${page.pageNumber} storage error: ${storageError}`);
      }
      
      repairReport.pages.push(pageInfo);
    }
    
    repairReport.checks.pagesInStorage = pagesInStorage;
    
    // Generate recommendations
    if (repairReport.checks.pagesInDatabase === 0) {
      repairReport.recommendations.push('Document needs initial conversion - no pages in database');
    } else if (repairReport.checks.pagesInStorage < repairReport.checks.pagesInDatabase) {
      repairReport.recommendations.push(`${repairReport.checks.pagesInDatabase - repairReport.checks.pagesInStorage} pages missing from storage - reconversion recommended`);
    }
    
    if (!repairReport.checks.hasSourceFile) {
      repairReport.recommendations.push('Source PDF file is missing - document may need to be re-uploaded');
    }
    
    if (repairReport.checks.isPdf && repairReport.checks.hasSourceFile && repairReport.issues.length > 0) {
      repairReport.recommendations.push('Consider triggering document reconversion to fix missing pages');
    }
    
    // TODO: Implement actual repair actions here
    // For now, this is a diagnostic-only endpoint
    // Future enhancements could include:
    // - Automatic page regeneration from source PDF
    // - Database record cleanup and repair
    // - Storage path corrections
    
    repairReport.processingTime = Date.now() - startTime;
    
    console.log(`[Repair] Completed repair analysis for document ${documentId} in ${repairReport.processingTime}ms`);
    console.log(`[Repair] Found ${repairReport.issues.length} issues and ${repairReport.recommendations.length} recommendations`);
    
    const status = repairReport.issues.length === 0 ? 200 : 207; // 207 = Multi-Status (partial success)
    
    return NextResponse.json(repairReport, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': `${repairReport.processingTime}ms`
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Repair] Error in repair endpoint:', error);
    
    return NextResponse.json(
      {
        documentId: (await params).id,
        timestamp: new Date().toISOString(),
        processingTime,
        success: false,
        error: 'Repair analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
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