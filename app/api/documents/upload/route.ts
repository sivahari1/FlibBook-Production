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
import { getAllCategories } from '@/lib/bookshop-categories';
import { uploadToStorage } from '@/lib/supabase/server';
import type { DocumentMetadata } from '@/lib/types/api';

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

    // Generate single documentId for consistency across storage path, database, and bookshop
    const documentId = crypto.randomUUID();

    // Parse form data
    const formData = await request.formData();
    const contentTypeRaw = formData.get('contentType') as string;
    const titleRaw = formData.get('title') as string;
    const descriptionRaw = formData.get('description') as string | null;
    const linkUrl = formData.get('linkUrl') as string | null;
    const file = formData.get('file') as File | null;
    
    // Parse bookshop integration fields
    const addToBookshop = formData.get('addToBookshop') === 'true';
    const bookshopCategory = formData.get('bookshopCategory') as string | null;
    const bookshopPrice = formData.get('bookshopPrice') ? parseFloat(formData.get('bookshopPrice') as string) : null;
    const bookshopDescription = formData.get('bookshopDescription') as string | null;

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

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate bookshop integration fields
    if (addToBookshop) {
      if (!bookshopCategory) {
        return NextResponse.json(
          { error: 'Category is required when adding to bookshop' },
          { status: 400 }
        );
      }

      // Validate category is from allowed list
      const allowedCategories = getAllCategories();
      if (!allowedCategories.includes(bookshopCategory)) {
        return NextResponse.json(
          { error: 'Invalid category selected' },
          { status: 400 }
        );
      }

      if (bookshopPrice === null || bookshopPrice === undefined || bookshopPrice < 0) {
        return NextResponse.json(
          { error: 'Price must be 0 or greater when adding to bookshop' },
          { status: 400 }
        );
      }

      if (bookshopPrice > 10000) {
        return NextResponse.json(
          { error: 'Price cannot exceed ₹10,000' },
          { status: 400 }
        );
      }
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

      // PDF-only validation - reject non-PDF uploads
      if (contentType === ContentType.PDF) {
        if (!file.type.includes('pdf')) {
          return NextResponse.json(
            { error: 'Only PDF files are accepted for PDF content type' },
            { status: 400 }
          );
        }
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
    let thumbnailUrl: string | undefined;
    let metadata: DocumentMetadata = {};
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
    } else if (file && contentType === ContentType.PDF) {
      // PDF-only storage: Upload original PDF to Supabase Storage
      const filename = sanitizeFilename(file.name);
      const storageBucket = 'documents';
      const storagePathInBucket = `pdfs/${session.user.id}/${documentId}/${filename}`;

      // Upload PDF to Supabase Storage
      const uploadResult = await uploadToStorage(
        storageBucket,
        storagePathInBucket,
        file,
        { contentType: 'application/pdf' }
      );

      if (!uploadResult.ok) {
        return NextResponse.json(
          { error: `Failed to upload PDF: ${uploadResult.error}` },
          { status: 500 }
        );
      }

      storagePath = uploadResult.path;
      mimeType = 'application/pdf';
      fileSize = file.size;
      
      // Basic PDF metadata
      metadata = {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        mimeType: 'application/pdf'
      };

      logger.info('PDF uploaded to storage successfully', {
        userId: session.user.id,
        documentId,
        storagePath,
        fileSize
      });

    } else if (file) {
      // Process other file types (Image, Video, Audio) using existing processor
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

      thumbnailUrl = processingResult.thumbnailUrl;
      metadata = processingResult.metadata as DocumentMetadata;
      storagePath = processingResult.fileUrl;
      mimeType = file.type;
      fileSize = file.size;
    }

    // Create document record in database
    // CRITICAL: Use the SAME documentId for storage path, prisma.document.create, and bookshop item
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
        metadata: metadata as any || {},
        userId: session.user.id
      }
    });

    logger.info('Document uploaded successfully', {
      userId: session.user.id,
      documentId,
      contentType,
      fileSize,
      storagePath
    });

    // DO NOT create DocumentPage rows or trigger conversion for PDF-only storage
    // The PDF will be viewed directly using PDF.js

    // Create bookshop item if requested with guaranteed proper defaults
    let bookshopItem = null;
    let warningMessage = null;
    
    if (addToBookshop && bookshopCategory !== null && bookshopPrice !== null) {
      try {
        bookshopItem = await prisma.bookShopItem.create({
          data: {
            title,
            description: bookshopDescription || descriptionRaw || `${contentType} content`,
            category: bookshopCategory || 'General',
            price: Math.round(bookshopPrice), // Convert to integer (paise)
            contentType,
            metadata: metadata as any || {},
            documentId: documentId,
            isFree: bookshopPrice === 0,
            isPublished: true // ALWAYS published for visibility
          }
        });

        logger.info('Bookshop item created successfully with guaranteed visibility', {
          userId: session.user.id,
          documentId,
          bookshopItemId: bookshopItem.id,
          category: bookshopCategory,
          price: bookshopPrice,
          isPublished: true
        });
      } catch (error) {
        // Log error but don't fail the upload
        logger.error('Failed to create bookshop item', {
          userId: session.user.id,
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        warningMessage = 'Document uploaded successfully, but could not be added to bookshop. You can add it to bookshop later from the document details page.';
      }
    }

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

    // Prepare success message
    let successMessage = 'Document uploaded successfully';
    if (bookshopItem) {
      successMessage = `Document uploaded successfully and added to ${bookshopCategory} category in bookshop`;
    }

    const response: UploadResponse = {
      success: true,
      document: documentResponse as any,
      bookShopItem: bookshopItem ? {
        ...bookshopItem,
        metadata: {}
      } as any : undefined,
      quotaRemaining,
      message: successMessage,
      warning: warningMessage || undefined
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    logger.error('Error uploading document', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
