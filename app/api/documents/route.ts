import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { validateFile, validateStorageQuota } from '@/lib/validation'
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/razorpay'
import { sanitizeString, sanitizeFilename } from '@/lib/sanitization'
import { logger } from '@/lib/logger'

/**
 * GET /api/documents
 * List all documents for the authenticated user
 */
export async function GET() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user's documents
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Get user's storage usage
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        storageUsed: true,
        subscription: true
      }
    })

    return NextResponse.json({
      documents,
      storageUsed: user?.storageUsed || 0,
      subscription: user?.subscription || 'free'
    })
  } catch (error) {
    logger.error('Error fetching documents', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * Upload a new document
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const titleRaw = formData.get('title') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const title = sanitizeString(titleRaw)
    const filename = sanitizeFilename(file.name)

    // Validate file
    const fileValidation = validateFile({
      name: filename,
      type: file.type,
      size: file.size
    })

    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      )
    }

    // Get user with current storage and document count
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        storageUsed: true,
        subscription: true,
        _count: {
          select: { documents: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get subscription limits
    const subscription = (user.subscription as SubscriptionTier) || 'free'
    const limits = SUBSCRIPTION_PLANS[subscription]

    // Check document count limit
    if (limits.maxDocuments !== Infinity && user._count.documents >= limits.maxDocuments) {
      const planName = limits.name
      return NextResponse.json(
        {
          error: `Document limit reached. Your ${planName} plan allows ${limits.maxDocuments} documents. Please upgrade to upload more documents.`,
          code: 'DOCUMENT_LIMIT_EXCEEDED',
          currentCount: user._count.documents,
          maxDocuments: limits.maxDocuments
        },
        { status: 403 }
      )
    }

    // Check storage quota
    const currentStorageUsed = Number(user.storageUsed)
    
    if (limits.storage !== Infinity) {
      const storageValidation = validateStorageQuota(
        currentStorageUsed,
        file.size,
        limits.storage
      )

      if (!storageValidation.valid) {
        const planName = limits.name
        const storageLimit = limits.storage / (1024 * 1024) // Convert to MB
        const storageUsed = currentStorageUsed / (1024 * 1024)
        
        return NextResponse.json(
          {
            error: `Storage limit exceeded. Your ${planName} plan allows ${storageLimit >= 1024 ? (storageLimit / 1024).toFixed(0) + ' GB' : storageLimit.toFixed(0) + ' MB'} of storage. You have used ${storageUsed.toFixed(2)} MB. Please upgrade to get more storage.`,
            code: 'STORAGE_QUOTA_EXCEEDED',
            currentStorage: currentStorageUsed,
            maxStorage: limits.storage
          },
          { status: 403 }
        )
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate document ID for storage path
    const documentId = crypto.randomUUID()
    const storagePath = `${session.user.id}/${documentId}.pdf`

    // Upload to Supabase Storage
    const uploadResult = await uploadFile(buffer, storagePath, file.type)

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        id: documentId,
        title: title || filename.replace('.pdf', ''),
        filename: filename,
        fileSize: BigInt(file.size),
        storagePath: uploadResult.path,
        mimeType: file.type,
        userId: session.user.id
      }
    })

    logger.info('Document uploaded successfully', {
      userId: session.user.id,
      documentId,
      fileSize: file.size
    })

    // Update user's storage usage
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        storageUsed: {
          increment: BigInt(file.size)
        }
      }
    })

    // Convert BigInt to string for JSON serialization
    const documentResponse = {
      ...document,
      fileSize: document.fileSize.toString()
    }

    return NextResponse.json(
      {
        message: 'Document uploaded successfully',
        document: documentResponse
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error uploading document', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
