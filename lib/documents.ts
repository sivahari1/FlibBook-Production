/**
 * Shared data access layer for documents
 * This provides a single source of truth for document queries
 * Used by both API routes and server components
 */

import { prisma } from './db'
import { Document, ShareLink } from '@prisma/client'

/**
 * Get all documents for a user
 */
export async function getDocumentsByUserId(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      filename: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Get a single document by ID with ownership verification
 */
export async function getDocumentById(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      shareLinks: {
        select: {
          id: true,
          shareKey: true,
          expiresAt: true,
          isActive: true,
          password: true,
          maxViews: true,
          viewCount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          analytics: true,
        },
      },
    },
  })

  // Verify ownership
  if (!document || document.userId !== userId) {
    return null
  }

  return document
}

/**
 * Get user with documents for dashboard
 */
export async function getUserWithDocuments(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          filename: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  })
}

/**
 * Get user's storage usage
 */
export async function getUserStorageInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      storageUsed: true,
      subscription: true,
    },
  })
}

/**
 * Get document for preview (with ownership check)
 */
export async function getDocumentForPreview(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      filename: true,
      storagePath: true,
      userId: true,
    },
  })

  if (!document || document.userId !== userId) {
    return null
  }

  return document
}

/**
 * Get user subscription info
 */
export async function getUserSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      subscription: true,
      subscriptions: {
        where: {
          status: 'active',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  })
}

/**
 * Get share link by key
 */
export async function getShareLinkByKey(shareKey: string) {
  const result = await prisma.shareLink.findUnique({
    where: { shareKey },
    select: {
      id: true,
      shareKey: true,
      documentId: true,
      userId: true,
      expiresAt: true,
      isActive: true,
      password: true,
      maxViews: true,
      viewCount: true,
      restrictToEmail: true,
      canDownload: true,
      createdAt: true,
      document: {
        select: {
          id: true,
          title: true,
          filename: true,
          fileSize: true,
          storagePath: true,
          mimeType: true,
          createdAt: true,
          userId: true,
        },
      },
    },
  })
  
  return result as typeof result & { document: NonNullable<typeof result>['document'] }
}

/**
 * Get analytics for a document (with ownership check)
 */
export async function getDocumentAnalytics(documentId: string, userId: string) {
  // First verify ownership
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true },
  })

  if (!document || document.userId !== userId) {
    return null
  }

  // Fetch analytics
  const analytics = await prisma.viewAnalytics.findMany({
    where: { documentId },
    orderBy: { viewedAt: 'desc' },
    select: {
      id: true,
      viewerEmail: true,
      ipAddress: true,
      userAgent: true,
      country: true,
      city: true,
      viewedAt: true,
      shareKey: true,
    },
  })

  return analytics
}

/**
 * Get email shares for a user (both by user ID and email)
 */
export async function getEmailSharesForUser(userId: string, email: string) {
  return prisma.documentShare.findMany({
    where: {
      OR: [
        { sharedWithUserId: userId },
        { sharedWithEmail: email },
      ],
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          filename: true,
        },
      },
      sharedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all shares for a document (both link and email shares)
 */
export async function getSharesForDocument(documentId: string) {
  const [linkShares, emailShares] = await Promise.all([
    prisma.shareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.documentShare.findMany({
      where: { documentId },
      include: {
        sharedWithUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { linkShares, emailShares }
}

/**
 * Increment share view count atomically
 */
export async function incrementShareViewCount(shareId: string) {
  return prisma.shareLink.update({
    where: { id: shareId },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  })
}

/**
 * Create a new link share
 */
export async function createLinkShare(data: {
  shareKey: string
  documentId: string
  userId: string
  expiresAt?: Date
  password?: string
  maxViews?: number
  restrictToEmail?: string
  canDownload?: boolean
}) {
  return prisma.shareLink.create({
    data,
  })
}

/**
 * Create a new email share
 */
export async function createEmailShare(data: {
  documentId: string
  sharedByUserId: string
  sharedWithUserId?: string
  sharedWithEmail?: string
  expiresAt?: Date
  canDownload?: boolean
  note?: string
}) {
  return prisma.documentShare.create({
    data,
  })
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })
}

/**
 * Revoke a link share (set inactive)
 */
export async function revokeLinkShare(shareId: string, userId: string) {
  // First verify ownership
  const share = await prisma.shareLink.findUnique({
    where: { id: shareId },
    select: { userId: true },
  })

  if (!share || share.userId !== userId) {
    return null
  }

  return prisma.shareLink.update({
    where: { id: shareId },
    data: { isActive: false },
  })
}

/**
 * Revoke an email share (delete)
 */
export async function revokeEmailShare(shareId: string, userId: string) {
  // First verify ownership
  const share = await prisma.documentShare.findUnique({
    where: { id: shareId },
    select: { sharedByUserId: true },
  })

  if (!share || share.sharedByUserId !== userId) {
    return null
  }

  return prisma.documentShare.delete({
    where: { id: shareId },
  })
}

/**
 * Get document share by ID
 */
export async function getDocumentShareById(shareId: string) {
  return prisma.documentShare.findUnique({
    where: { id: shareId },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          filename: true,
          storagePath: true,
        },
      },
    },
  })
}
