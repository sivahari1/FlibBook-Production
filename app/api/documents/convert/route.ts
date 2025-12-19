import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/documents/convert
 * 
 * @deprecated This endpoint is deprecated as part of the unified viewer system.
 * PDF documents now use direct PDF.js rendering instead of conversion to images.
 * This endpoint will be removed in a future version.
 * 
 * Use UnifiedViewer component with SimpleDocumentViewer for PDF rendering instead.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 17.1
 */
export async function POST(request: NextRequest) {
  // Return deprecation notice
  return NextResponse.json(
    {
      success: false,
      message: 'This conversion endpoint has been deprecated. PDF documents now use direct PDF.js rendering through the UnifiedViewer component.',
      deprecated: true,
      migration: {
        recommendation: 'Use UnifiedViewer component with SimpleDocumentViewer for PDF rendering',
        documentation: 'See unified viewer documentation for migration guide'
      }
    },
    { status: 410 } // 410 Gone - indicates the resource is no longer available
  );
  // This endpoint is deprecated - no processing needed
}
