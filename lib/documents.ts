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
  return prisma.shareLink.findUnique({
    where: { shareKey },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          filename: true,
          fileSize: true,
          storagePath: true,
          mimeType: true,
          createdAt: true,
        },
      },
    },
  })
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
