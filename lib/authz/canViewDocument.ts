import { Session } from 'next-auth';
import { prisma } from '@/lib/db';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  document?: {
    id: string;
    title: string;
    userId: string;
    filename: string;
    mimeType: string;
  };
}

/**
 * Check if a user can view a specific document
 * Implements role-based authorization logic:
 * - Admin: can view any document
 * - Platform User: can view documents they own or have access to
 * - Member: can view only permitted documents (MyJstudyroom or approved shares)
 * 
 * @param session - NextAuth session
 * @param documentId - Document ID to check access for
 * @returns Authorization result with allowed status and document info
 */
export async function canViewDocument(
  session: Session | null,
  documentId: string
): Promise<AuthorizationResult> {
  // Check if user is authenticated
  if (!session?.user?.id) {
    return {
      allowed: false,
      reason: 'User not authenticated'
    };
  }

  const userId = session.user.id;
  const userRole = session.user.userRole || 'MEMBER';

  try {
    // Fetch document with related access information
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        userId: true,
        filename: true,
        mimeType: true,
        // Include bookshop items for MyJstudyroom access
        bookShopItems: {
          select: {
            id: true,
            myJstudyroomItems: {
              where: {
                userId: userId
              },
              select: {
                id: true,
                isFree: true
              }
            }
          }
        },
        // Include email shares
        emailShares: {
          where: {
            OR: [
              { sharedWithUserId: userId },
              { sharedWithEmail: session.user.email }
            ],
            // Only active shares (not expired)
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          select: {
            id: true,
            canDownload: true
          }
        }
      }
    });

    if (!document) {
      return {
        allowed: false,
        reason: 'Document not found'
      };
    }

    // Admin can view any document
    if (userRole === 'ADMIN') {
      return {
        allowed: true,
        document: {
          id: document.id,
          title: document.title,
          userId: document.userId,
          filename: document.filename,
          mimeType: document.mimeType
        }
      };
    }

    // Document owner can always view their own documents
    if (document.userId === userId) {
      return {
        allowed: true,
        document: {
          id: document.id,
          title: document.title,
          userId: document.userId,
          filename: document.filename,
          mimeType: document.mimeType
        }
      };
    }

    // Check MyJstudyroom access (for Members and Platform Users)
    const hasMyJstudyroomAccess = document.bookShopItems.some(item => 
      item.myJstudyroomItems.length > 0
    );

    if (hasMyJstudyroomAccess) {
      return {
        allowed: true,
        document: {
          id: document.id,
          title: document.title,
          userId: document.userId,
          filename: document.filename,
          mimeType: document.mimeType
        }
      };
    }

    // Check email share access
    if (document.emailShares.length > 0) {
      return {
        allowed: true,
        document: {
          id: document.id,
          title: document.title,
          userId: document.userId,
          filename: document.filename,
          mimeType: document.mimeType
        }
      };
    }

    // Check share link access (if accessed via share key)
    // Note: This would typically be handled in the share link route
    // For direct document access, we don't check share links

    // No access found
    return {
      allowed: false,
      reason: 'Access denied - no permission to view this document'
    };

  } catch (error) {
    console.error('[Authorization] Error checking document access:', error);
    return {
      allowed: false,
      reason: 'Authorization check failed'
    };
  }
}

/**
 * Check if a user can view a document via share link
 * This is a separate check for share link access
 * 
 * @param session - NextAuth session (can be null for public shares)
 * @param shareKey - Share key from URL
 * @returns Authorization result
 */
export async function canViewDocumentViaShare(
  session: Session | null,
  shareKey: string
): Promise<AuthorizationResult & { shareLink?: any }> {
  try {
    // Find the share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { shareKey },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            userId: true,
            filename: true,
            mimeType: true
          }
        }
      }
    });

    if (!shareLink) {
      return {
        allowed: false,
        reason: 'Share link not found'
      };
    }

    // Check if share link is active
    if (!shareLink.isActive) {
      return {
        allowed: false,
        reason: 'Share link is inactive'
      };
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'Share link has expired'
      };
    }

    // Check view count limit
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return {
        allowed: false,
        reason: 'Share link view limit exceeded'
      };
    }

    // Check email restriction
    if (shareLink.restrictToEmail) {
      if (!session?.user?.email) {
        return {
          allowed: false,
          reason: 'Authentication required for this share link'
        };
      }
      
      if (session.user.email !== shareLink.restrictToEmail) {
        return {
          allowed: false,
          reason: 'This share link is restricted to a specific email address'
        };
      }
    }

    return {
      allowed: true,
      document: shareLink.document,
      shareLink
    };

  } catch (error) {
    console.error('[Authorization] Error checking share link access:', error);
    return {
      allowed: false,
      reason: 'Share link authorization check failed'
    };
  }
}