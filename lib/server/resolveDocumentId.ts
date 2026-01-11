import { prisma } from '@/lib/db';

export interface DocumentIdResolution {
  documentId: string;
  source: 'document' | 'bookShopItem' | 'myJstudyroomItem';
}

/**
 * Server-only utility to resolve any ID to a documentId.
 * 
 * Resolution order:
 * 1. If id matches a Document, return it as documentId
 * 2. If id matches a BookShopItem, return its documentId
 * 3. If id matches a MyJstudyroomItem, return its bookShopItem.documentId
 * 4. Otherwise throw 404 error
 */
export async function resolveDocumentId(id: string): Promise<DocumentIdResolution> {
  if (!id || typeof id !== 'string') {
    throw new Error('Document not found');
  }

  // First, check if it's a direct document ID
  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true }
  });

  if (document) {
    return {
      documentId: document.id,
      source: 'document'
    };
  }

  // Second, check if it's a BookShopItem ID
  const bookShopItem = await prisma.bookShopItem.findUnique({
    where: { id },
    select: { documentId: true }
  });

  if (bookShopItem) {
    return {
      documentId: bookShopItem.documentId,
      source: 'bookShopItem'
    };
  }

  // Third, check if it's a MyJstudyroomItem ID
  const myJstudyroomItem = await prisma.myJstudyroomItem.findUnique({
    where: { id },
    include: {
      bookShopItem: {
        select: { documentId: true }
      }
    }
  });

  if (myJstudyroomItem) {
    return {
      documentId: myJstudyroomItem.bookShopItem.documentId,
      source: 'myJstudyroomItem'
    };
  }

  // Not found in any table
  throw new Error('Document not found');
}