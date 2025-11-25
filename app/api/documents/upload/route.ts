import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ContentType, UploadResponse } from '@/lib/types/content';
import { ContentProcessor } from '@/lib/content-processor';
import { LinkProcessor } from '@/lib/link-processor';
import { validateFile, sanitizeFilename } from '@/lib/file-validation';
import {
  checkUploadPermission,
  getUploadQuotaRemaining,
  hasUnlimitedUploads,
  UserRole
} from '@/lib/rbac/admin-privileges';
import { sanitizeString } from '@/lib/sanitization';
import { logger } from '@/lib/logger';
import { requirePlatformUser } from '@/lib/role-check';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * POST /api/documents/upload
 * Enhanced upload endpoint with multi-content type support
 * Requirements: 1.1, 1.4, 3.1, 4.1, 5.1, 9.3
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role (PLATFORM_USER or ADMIN only)
    // Requirements: 1.1
    const roleCheck = await requirePlatformUser();
    if (roleCheck) return roleCheck;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const contentTypeRaw = formData.get('contentType') as string;
    const titleRaw = formData.get('title') as string;
    const descriptionRaw = formData.get('description') as string | null;
    const linkUrl = formData.get('linkUrl') as string | null;
    const file = formData.get('file') as File | null;

    // Validate content type
    // Requirement 9.3: Content type validation
    if (!contentTypeRaw || !Object.values(ContentType).includes(contentTypeRaw as ContentType)) {
      return NextResponse.json(
        { error: 'Invalid or missing content type' },
        { status: 400 }
      );
    }

    const contentType = contentTypeRaw as ContentType;

    // Sanitize inputs
    const title = sanitizeString(titleRaw);
    const description = descriptionRaw ? sanitizeString(descriptionRaw) : undefined;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate content type specific requirements
    if (contentType === ContentType.LINK) {
      if (!linkUrl) {
        return NextResponse.json(
          { error: 'Link URL is required for LINK content type' },
          { status: 400 }
        );
      }
    } else {
      if (!file) {
        return NextResponse.json(
          { error: `File is required for ${contentType} content type` },
          { status: 400 }
        );
      }
    }

    // Get user with current document count and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        storageUsed: true,
        _count: {
          select: { documents: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = (user.role as UserRole) || 'PLATFORM_USER';
    const currentDocCount = user._count.documents;

    // Check upload permission using RBAC
    // Requirements: 1.1, 1.4 - Admin uploads bypass quota checks
    const permission = checkUploadPermission(
      userRole,
      currentDocCount,
      contentType,
      file?.size
    );

    if (!permission.allowed) {
      return NextResponse.json(
        {
          error: permission.reason,
          code: 'UPLOAD_PERMISSION_DENIED'
        },
        { status: 403 }
      );
    }

    // Validate file if not a link
    // Requirements: 3.1, 4.1
    if (file && contentType !== ContentType.LINK) {
      const filename = sanitizeFilename(file.name);
      const fileValidation = validateFile(
        {
          name: filename,
          type: file.type,
          size: file.size
        },
        contentType
      );

      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error },
          { status: 400 }
        );
      }
    }

    // Process content based on type
    let fileUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let metadata: any = {};
    let storagePath: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number = 0;

    if (contentType === ContentType.LINK && linkUrl) {
      // Process link
      // Requirement 5.1: Link URL validation and processing
      const linkProcessor = new LinkProcessor();
      metadata = await linkProcessor.processLink(linkUrl, session.user.id);
      
      if (!linkProcessor.isValidUrl(linkUrl)) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    } else if (file) {
      // Process file (PDF, Image, or Video)
      // Requirements: 3.1, 4.1 - File processing
      const contentProcessor = new ContentProcessor();
      const processingResult = await contentProcessor.processUpload(
        file,
        contentType,
        session.user.id
      );

      if (processingResult.error) {
        return NextResponse.json(
          { error: `Processing failed: ${processingResult.error}` },
          { status: 500 }
        );
      }

      fileUrl = processingResult.fileUrl;
      thumbnailUrl = processingResult.thumbnailUrl;
      metadata = processingResult.metadata;
      storagePath = processingResult.fileUrl;
      mimeType = file.type;
      fileSize = file.size;
    }

    // Create document record in database
    const documentId = crypto.randomUUID();
    const document = await prisma.document.create({
      data: {
        id: documentId,
        title,
        filename: file ? sanitizeFilename(file.name) : 'link',
        contentType,
        fileSize: BigInt(fileSize),
        storagePath: storagePath || 'link',
        mimeType: mimeType || 'text/html',
        linkUrl: contentType === ContentType.LINK ? linkUrl || undefined : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        metadata: metadata || {},
        userId: session.user.id
      }
    });

    logger.info('Document uploaded successfully', {
      userId: session.user.id,
      documentId,
      contentType,
      fileSize
    });

    // Update user's storage usage only if not admin
    // Requirement 1.3: Admin quota counter invariance
    if (!hasUnlimitedUploads(userRole) && fileSize > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          storageUsed: {
            increment: BigInt(fileSize)
          }
        }
      });
    }

    // Get quota remaining
    // Requirements: 1.1, 1.4 - Return quota information
    const quotaRemaining = getUploadQuotaRemaining(userRole, currentDocCount + 1);

    // Convert BigInt to string for JSON serialization
    const documentResponse = {
      ...document,
      fileSize: document.fileSize.toString(),
      metadata: document.metadata as any
    };

    const response: UploadResponse = {
      success: true,
      document: documentResponse as any,
      quotaRemaining
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error('Error uploading document', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
