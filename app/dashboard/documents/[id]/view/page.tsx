import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSignedUrl, getBucketForContentType } from '@/lib/storage';
import { ContentType } from '@/lib/types/content';
import PreviewViewerClient from './PreviewViewerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Preview Viewer Page
 * 
 * Server component that:
 * - Parses watermark settings from URL search parameters
 * - Fetches document and generates signed URLs
 * - Passes settings to viewer client component
 * - Handles missing or invalid parameters gracefully
 * - Uses PDF.js rendering for reliable cross-browser PDF display (Requirements: 2.1)
 * 
 * Requirements: 1.4, 2.1, 3.1, 3.2
 */
export default async function PreviewViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id: documentId } = await params;
  const settings = await searchParams;
  
  // Parse watermark settings from URL parameters
  // Default to disabled if not specified
  const enableWatermark = settings.watermark === 'true';
  const watermarkText = (settings.watermarkText as string) || session.user.email || '';
  const watermarkOpacity = settings.watermarkOpacity 
    ? parseFloat(settings.watermarkOpacity as string) 
    : 0.3;
  const watermarkSize = settings.watermarkSize 
    ? parseInt(settings.watermarkSize as string, 10) 
    : 16;
  const watermarkImage = (settings.watermarkImage as string) || '';

  // Debug logging for watermark settings
  console.log('[Preview URL Parameters]', {
    rawWatermarkParam: settings.watermark,
    enableWatermark,
    watermarkText: watermarkText ? '***' : '(empty)',
    watermarkOpacity,
    watermarkSize,
    hasWatermarkImage: !!watermarkImage,
    allParams: Object.keys(settings),
  });

  // Fetch document with ownership verification
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      filename: true,
      storagePath: true,
      userId: true,
      contentType: true,
      linkUrl: true,
      metadata: true,
      mimeType: true,
    },
  });

  // Verify ownership
  if (!document || document.userId !== session.user.id) {
    redirect('/dashboard');
  }

  // Parse content type (default to PDF for backward compatibility)
  const contentType = (document.contentType as ContentType) || ContentType.PDF;

  // Prepare content URLs based on content type
  let pdfUrl: string | undefined;
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;
  let linkUrl: string | undefined;

  // For file-based content types, generate signed URLs
  if (contentType === ContentType.PDF || contentType === ContentType.IMAGE || contentType === ContentType.VIDEO) {
    if (!document.storagePath) {
      redirect('/dashboard');
    }

    const bucket = getBucketForContentType(contentType);
    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath,
      3600, // 1 hour
      bucket
    );

    if (error || !signedUrl) {
      console.error('Failed to generate signed URL:', error);
      redirect('/dashboard');
    }

    // Assign to appropriate variable based on content type
    switch (contentType) {
      case ContentType.PDF:
        pdfUrl = signedUrl;
        break;
      case ContentType.IMAGE:
        imageUrl = signedUrl;
        break;
      case ContentType.VIDEO:
        videoUrl = signedUrl;
        break;
    }
  } else if (contentType === ContentType.LINK) {
    // For links, use the stored link URL
    linkUrl = document.linkUrl || undefined;
    if (!linkUrl) {
      redirect('/dashboard');
    }
  }

  // Parse metadata (stored as JSON in database)
  let metadata: any = {};
  try {
    if (document.metadata) {
      metadata = typeof document.metadata === 'string' 
        ? JSON.parse(document.metadata) 
        : document.metadata;
    }
  } catch (error) {
    console.error('Failed to parse document metadata:', error);
    // Continue with empty metadata
  }

  // No need to fetch pages - we'll use the PDF directly

  return (
    <PreviewViewerClient
      documentId={documentId}
      documentTitle={document.title}
      contentType={contentType}
      userEmail={session.user.email || ''}
      enableWatermark={enableWatermark}
      watermarkText={watermarkText}
      watermarkOpacity={watermarkOpacity}
      watermarkSize={watermarkSize}
      watermarkImage={watermarkImage}
      pdfUrl={pdfUrl}
      imageUrl={imageUrl}
      videoUrl={videoUrl}
      linkUrl={linkUrl}
      metadata={metadata}
    />
  );
}
