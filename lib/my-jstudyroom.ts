import { prisma } from './db';

/**
 * My jstudyroom document limits
 */
export const MY_JSTUDYROOM_LIMITS = {
  MAX_TOTAL_DOCUMENTS: 10,
  MAX_FREE_DOCUMENTS: 5,
  MAX_PAID_DOCUMENTS: 5,
} as const;

/**
 * Result type for document addition checks
 */
export interface CanAddDocumentResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user can add a document to My jstudyroom
 * Enforces limits: 10 total, 5 free, 5 paid
 */
export async function canAddDocument(
  userId: string,
  isFree: boolean
): Promise<CanAddDocumentResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      freeDocumentCount: true,
      paidDocumentCount: true,
    },
  });

  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
    };
  }

  const totalCount = user.freeDocumentCount + user.paidDocumentCount;

  // Check total limit
  if (totalCount >= MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 10 documents in My jstudyroom',
    };
  }

  // Check type-specific limit
  if (isFree && user.freeDocumentCount >= MY_JSTUDYROOM_LIMITS.MAX_FREE_DOCUMENTS) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 5 free documents',
    };
  }

  if (!isFree && user.paidDocumentCount >= MY_JSTUDYROOM_LIMITS.MAX_PAID_DOCUMENTS) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 5 paid documents',
    };
  }

  return { allowed: true };
}

/**
 * Add a document to My jstudyroom
 * Uses transaction to ensure atomicity
 */
export async function addDocumentToMyJstudyroom(
  userId: string,
  bookShopItemId: string,
  isFree: boolean
): Promise<{ success: boolean; error?: string; itemId?: string }> {
  try {
    // Check if document can be added
    const canAdd = await canAddDocument(userId, isFree);
    if (!canAdd.allowed) {
      return {
        success: false,
        error: canAdd.reason,
      };
    }

    // Check if document already exists in My jstudyroom
    const existingItem = await prisma.myJstudyroomItem.findUnique({
      where: {
        userId_bookShopItemId: {
          userId,
          bookShopItemId,
        },
      },
    });

    if (existingItem) {
      return {
        success: false,
        error: 'This document is already in your My jstudyroom',
      };
    }

    // Add document and update counter in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create My jstudyroom item
      const item = await tx.myJstudyroomItem.create({
        data: {
          userId,
          bookShopItemId,
          isFree,
        },
      });

      // Update user's document count
      await tx.user.update({
        where: { id: userId },
        data: {
          freeDocumentCount: isFree
            ? { increment: 1 }
            : undefined,
          paidDocumentCount: !isFree
            ? { increment: 1 }
            : undefined,
        },
      });

      return item;
    });

    return {
      success: true,
      itemId: result.id,
    };
  } catch (error) {
    console.error('Error adding document to My jstudyroom:', error);
    return {
      success: false,
      error: 'Failed to add document to My jstudyroom',
    };
  }
}

/**
 * Remove a document from My jstudyroom
 * Uses transaction to ensure atomicity
 */
export async function removeDocumentFromMyJstudyroom(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the item to verify ownership and get type
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: itemId },
      select: {
        userId: true,
        isFree: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: 'Document not found in My jstudyroom',
      };
    }

    // Verify ownership
    if (item.userId !== userId) {
      return {
        success: false,
        error: 'You do not have permission to remove this document',
      };
    }

    // Remove document and update counter in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete My jstudyroom item
      await tx.myJstudyroomItem.delete({
        where: { id: itemId },
      });

      // Update user's document count
      await tx.user.update({
        where: { id: userId },
        data: {
          freeDocumentCount: item.isFree
            ? { decrement: 1 }
            : undefined,
          paidDocumentCount: !item.isFree
            ? { decrement: 1 }
            : undefined,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error removing document from My jstudyroom:', error);
    return {
      success: false,
      error: 'Failed to remove document from My jstudyroom',
    };
  }
}
