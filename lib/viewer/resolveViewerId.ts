import { prisma } from '@/lib/db';

export interface ViewerIdResolution {
  success: boolean;
  documentId?: string;
  originalId: string;
  resolvedFrom: 'document' | 'myJstudyroomItem' | 'none';
  error?: string;
}

/**
 * Resolve a viewer ID to a document ID
 * 
 * The frontend may pass either:
 * - A direct documentId 
 * - A MyJstudyroomItem ID that maps to a documentId
 * 
 * This function tries both and returns the resolved documentId
 * 
 * @param inputId - The ID from the frontend (could be documentId or itemId)
 * @returns Resolution result with documentId if found
 */
export async function resolveViewerId(inputId: string): Promise<ViewerIdResolution> {
  try {
    // Normalize ID (remove "doc_" prefix if present)
    const normalizedId = inputId.startsWith("doc_") ? inputId.replace("doc_", "") : inputId;
    
    // Strategy 1: Try as direct document ID
    const document = await prisma.document.findUnique({
      where: { id: normalizedId },
      select: { id: true }
    });
    
    if (document) {
      return {
        success: true,
        documentId: document.id,
        originalId: inputId,
        resolvedFrom: 'document'
      };
    }
    
    // Strategy 2: Try as MyJstudyroomItem ID that maps to a document
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: normalizedId },
      include: {
        bookShopItem: {
          select: {
            documentId: true
          }
        }
      }
    });
    
    if (item?.bookShopItem?.documentId) {
      return {
        success: true,
        documentId: item.bookShopItem.documentId,
        originalId: inputId,
        resolvedFrom: 'myJstudyroomItem'
      };
    }
    
    // Not found in either table
    return {
      success: false,
      originalId: inputId,
      resolvedFrom: 'none',
      error: 'ID not found as document or MyJstudyroom item'
    };
    
  } catch (error) {
    console.error('[resolveViewerId] Database error:', error);
    
    return {
      success: false,
      originalId: inputId,
      resolvedFrom: 'none',
      error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Resolve viewer ID with additional validation
 * 
 * @param inputId - The ID from the frontend
 * @param userId - Current user ID for ownership validation
 * @param userRole - Current user role for permission validation
 * @returns Resolution result with additional validation
 */
export async function resolveViewerIdWithValidation(
  inputId: string, 
  userId: string, 
  userRole: string
): Promise<ViewerIdResolution & { canAccess?: boolean; accessReason?: string }> {
  const resolution = await resolveViewerId(inputId);
  
  if (!resolution.success) {
    return resolution;
  }
  
  try {
    // Additional validation based on how the ID was resolved
    if (resolution.resolvedFrom === 'myJstudyroomItem') {
      // If resolved from MyJstudyroom item, verify user owns the item
      const item = await prisma.myJstudyroomItem.findUnique({
        where: { id: inputId.startsWith("doc_") ? inputId.replace("doc_", "") : inputId },
        select: { userId: true }
      });
      
      if (item?.userId !== userId && userRole !== 'ADMIN') {
        return {
          ...resolution,
          canAccess: false,
          accessReason: 'MyJstudyroom item belongs to different user'
        };
      }
    }
    
    // Check document access permissions
    const document = await prisma.document.findUnique({
      where: { id: resolution.documentId },
      select: { 
        userId: true,
        visibility: true
      }
    });
    
    if (!document) {
      return {
        ...resolution,
        success: false,
        canAccess: false,
        accessReason: 'Document not found'
      };
    }
    
    // Admin can access everything
    if (userRole === 'ADMIN') {
      return {
        ...resolution,
        canAccess: true,
        accessReason: 'Admin access'
      };
    }
    
    // Owner can access their own documents
    if (document.userId === userId) {
      return {
        ...resolution,
        canAccess: true,
        accessReason: 'Document owner'
      };
    }
    
    // Public documents can be accessed by anyone
    if (document.visibility === 'PUBLIC') {
      return {
        ...resolution,
        canAccess: true,
        accessReason: 'Public document'
      };
    }
    
    // For MyJstudyroom items, access is already validated above
    if (resolution.resolvedFrom === 'myJstudyroomItem') {
      return {
        ...resolution,
        canAccess: true,
        accessReason: 'MyJstudyroom item access'
      };
    }
    
    return {
      ...resolution,
      canAccess: false,
      accessReason: 'No access permission'
    };
    
  } catch (error) {
    console.error('[resolveViewerIdWithValidation] Validation error:', error);
    
    return {
      ...resolution,
      canAccess: false,
      accessReason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}