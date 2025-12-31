import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canViewDocument } from '@/lib/authz/canViewDocument'
import { prisma } from '@/lib/db'
import { generateSignedUrl } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * GET /api/viewer/diagnose/[id]
 * Diagnose document access and PDF availability
 * Updated for PDF-only storage system
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Check Document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        contentType: true,
        mimeType: true,
        storagePath: true,
        userId: true,
        createdAt: true
      }
    });

    if (!document) {
      return NextResponse.json({
        documentExists: false,
        error: 'Document not found'
      });
    }

    // Check authorization
    const canView = await canViewDocument(session, documentId);
    
    if (!canView.allowed) {
      return NextResponse.json({
        documentExists: true,
        authorized: false,
        reason: canView.reason
      });
    }

    // Check if it's a PDF
    const isPdf = document.contentType === 'PDF' && document.mimeType === 'application/pdf';

    if (!isPdf) {
      return NextResponse.json({
        documentExists: true,
        authorized: true,
        isPdf: false,
        contentType: document.contentType,
        message: 'Document is not a PDF - PDF viewer not applicable'
      });
    }

    // Try to generate signed URL
    let signedUrlAvailable = false;
    let signedUrlError = null;

    try {
      const signedUrlResult = await generateSignedUrl(
        'documents',
        document.storagePath,
        60 // 1 minute for diagnostic
      );

      if (signedUrlResult.ok) {
        signedUrlAvailable = true;
      } else {
        signedUrlError = signedUrlResult.error;
      }
    } catch (error) {
      signedUrlError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      documentExists: true,
      authorized: true,
      isPdf: true,
      document: {
        id: document.id,
        title: document.title,
        contentType: document.contentType,
        mimeType: document.mimeType,
        storagePath: document.storagePath,
        createdAt: document.createdAt
      },
      signedUrlAvailable,
      signedUrlError,
      diagnosis: signedUrlAvailable 
        ? 'PDF is accessible and ready for viewing'
        : `PDF access issue: ${signedUrlError}`,
      recommendations: signedUrlAvailable 
        ? ['Document should load successfully in PDF viewer']
        : [
            'Check Supabase Storage configuration',
            'Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables',
            'Ensure document file exists in storage bucket'
          ]
    });

  } catch (error: unknown) {
    logger.error('Error in diagnose route', error);
    return NextResponse.json({
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
