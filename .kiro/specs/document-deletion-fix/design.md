# Document Deletion Fix - Design

## Overview

This design implements a robust document deletion system that handles all foreign key relationships, preserves payment records for audit purposes, implements soft deletes for bookshop items, and ensures complete storage cleanup. The solution uses database transactions to maintain data integrity and provides clear error messaging for any failures.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Document Deletion Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User clicks Delete → Confirmation Dialog                 │
│                                                               │
│  2. DELETE /api/documents/[id]                               │
│     ├─ Verify authentication & ownership                     │
│     ├─ Start database transaction                            │
│     ├─ Soft delete BookShopItems                             │
│     ├─ Delete related records (cascading)                    │
│     ├─ Delete document from database                         │
│     ├─ Update user storage usage                             │
│     ├─ Commit transaction                                    │
│     └─ Clean up storage files (async)                        │
│                                                               │
│  3. Return success/error response                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### 1. Update Payment Model

**Current Issue**: Payment has no cascade delete rule for `bookShopItemId`

**Solution**: Change to `onDelete: SetNull`

```prisma
model Payment {
  id                String       @id @default(cuid())
  userId            String
  bookShopItemId    String?      // Changed to optional
  amount            Int
  currency          String       @default("INR")
  status            String
  razorpayOrderId   String?      @unique
  razorpayPaymentId String?      @unique
  razorpaySignature String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  bookShopItem      BookShopItem? @relation(fields: [bookShopItemId], references: [id], onDelete: SetNull)
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([bookShopItemId])
  @@index([status])
  @@index([razorpayOrderId])
  @@map("payments")
}
```

### 2. Add Soft Delete to BookShopItem

```prisma
model BookShopItem {
  id                String             @id @default(cuid())
  documentId        String?            // Changed to optional
  title             String
  description       String?
  category          String
  contentType       String             @default("PDF")
  metadata          Json               @default("{}")
  previewUrl        String?
  linkUrl           String?
  isFree            Boolean            @default(true)
  price             Int?
  isPublished       Boolean            @default(true)
  isAvailable       Boolean            @default(true)  // NEW
  deletedAt         DateTime?          // NEW
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  document          Document?          @relation(fields: [documentId], references: [id], onDelete: SetNull)
  myJstudyroomItems MyJstudyroomItem[]
  payments          Payment[]

  @@index([documentId])
  @@index([category])
  @@index([isPublished])
  @@index([contentType])
  @@index([isAvailable])  // NEW
  @@map("book_shop_items")
}
```

### 3. Update DocumentAnnotation (if needed)

```prisma
model DocumentAnnotation {
  id            String    @id @default(cuid())
  documentId    String
  userId        String
  pageNumber    Int
  selectedText  String?
  mediaType     MediaType
  mediaUrl      String?
  externalUrl   String?
  visibility    String    @default("public")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  document      Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([documentId, pageNumber])
  @@index([userId])
  @@index([documentId])
  @@index([documentId, pageNumber, visibility])
  @@index([documentId, visibility, createdAt])
  @@map("document_annotations")
}
```

### 4. Update DocumentPage (if needed)

```prisma
model DocumentPage {
  id         String   @id @default(cuid())
  documentId String
  pageNumber Int
  pageUrl    String
  fileSize   Int      @default(0)
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, pageNumber])
  @@index([documentId])
  @@index([expiresAt])
  @@map("document_pages")
}
```

## Migration Strategy

### Migration File

```sql
-- Migration: Add soft delete to BookShopItem and update Payment foreign key
-- Date: 2024-12-08

BEGIN;

-- Step 1: Add new columns to BookShopItem
ALTER TABLE "book_shop_items" 
  ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 2: Create index for isAvailable
CREATE INDEX "book_shop_items_isAvailable_idx" ON "book_shop_items"("isAvailable");

-- Step 3: Make documentId nullable in BookShopItem
ALTER TABLE "book_shop_items" 
  ALTER COLUMN "documentId" DROP NOT NULL;

-- Step 4: Make bookShopItemId nullable in Payment
ALTER TABLE "payments" 
  ALTER COLUMN "bookShopItemId" DROP NOT NULL;

-- Step 5: Drop existing foreign key constraint on Payment.bookShopItemId
ALTER TABLE "payments" 
  DROP CONSTRAINT IF EXISTS "payments_bookShopItemId_fkey";

-- Step 6: Add new foreign key with SET NULL on delete
ALTER TABLE "payments" 
  ADD CONSTRAINT "payments_bookShopItemId_fkey" 
  FOREIGN KEY ("bookShopItemId") 
  REFERENCES "book_shop_items"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Step 7: Drop existing foreign key constraint on BookShopItem.documentId
ALTER TABLE "book_shop_items" 
  DROP CONSTRAINT IF EXISTS "book_shop_items_documentId_fkey";

-- Step 8: Add new foreign key with SET NULL on delete
ALTER TABLE "book_shop_items" 
  ADD CONSTRAINT "book_shop_items_documentId_fkey" 
  FOREIGN KEY ("documentId") 
  REFERENCES "documents"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

COMMIT;
```

## API Route Implementation

### Enhanced DELETE Route

```typescript
/**
 * DELETE /api/documents/[id]
 * Delete a document with comprehensive cleanup and soft delete support
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication and role
    const roleCheck = await requirePlatformUser()
    if (roleCheck) return roleCheck

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // 2. Fetch document with all related data
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        bookShopItems: {
          include: {
            payments: true,
            myJstudyroomItems: true
          }
        },
        pages: true
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // 3. Verify ownership
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      )
    }

    // 4. Perform deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // 4a. Soft delete BookShopItems
      if (document.bookShopItems.length > 0) {
        await tx.bookShopItem.updateMany({
          where: {
            documentId: documentId
          },
          data: {
            isAvailable: false,
            deletedAt: new Date(),
            documentId: null // Unlink from document
          }
        })
      }

      // 4b. Delete document (cascades to related records)
      await tx.document.delete({
        where: { id: documentId }
      })

      // 4c. Update user's storage usage
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          storageUsed: {
            decrement: document.fileSize
          }
        }
      })
    })

    // 5. Clean up storage files (async, don't block response)
    cleanupStorageFiles(document).catch(error => {
      logger.error('Storage cleanup failed', {
        documentId,
        error: error.message
      })
    })

    logger.info('Document deleted successfully', {
      userId: session.user.id,
      documentId,
      hadBookShopItems: document.bookShopItems.length > 0
    })

    return NextResponse.json({
      message: 'Document deleted successfully'
    })

  } catch (error) {
    logger.error('Error deleting document', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Provide specific error messages
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete document due to foreign key constraint' },
          { status: 409 }
        )
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete document. Please try again.' },
      { status: 500 }
    )
  }
}
```

### Storage Cleanup Function

```typescript
/**
 * Clean up storage files for a deleted document
 * This runs asynchronously and doesn't block the API response
 */
async function cleanupStorageFiles(document: Document & { pages: DocumentPage[] }) {
  const errors: string[] = []

  try {
    // Delete main document file
    const mainFileResult = await deleteFile(document.storagePath)
    if (!mainFileResult.success) {
      errors.push(`Main file: ${mainFileResult.error}`)
    }

    // Delete all page images
    if (document.pages && document.pages.length > 0) {
      for (const page of document.pages) {
        try {
          // Extract path from pageUrl
          const url = new URL(page.pageUrl)
          const path = url.pathname.split('/').slice(-2).join('/')
          
          const pageResult = await deleteFile(path, 'document-pages')
          if (!pageResult.success) {
            errors.push(`Page ${page.pageNumber}: ${pageResult.error}`)
          }
        } catch (error) {
          errors.push(`Page ${page.pageNumber}: ${error.message}`)
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Partial storage cleanup failure', {
        documentId: document.id,
        errors
      })
    } else {
      logger.info('Storage cleanup completed', {
        documentId: document.id,
        filesDeleted: 1 + (document.pages?.length || 0)
      })
    }
  } catch (error) {
    logger.error('Storage cleanup failed', {
      documentId: document.id,
      error: error.message
    })
  }
}
```

## Storage Service Updates

### Enhanced deleteFile Function

```typescript
/**
 * Delete a file from Supabase storage
 * @param path - File path in storage
 * @param bucket - Storage bucket name (default: 'documents')
 */
export async function deleteFile(
  path: string,
  bucket: string = 'documents'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

## UI Updates

### Confirmation Dialog

```typescript
// components/dashboard/DeleteConfirmDialog.tsx
interface DeleteConfirmDialogProps {
  documentTitle: string
  hasBookShopItems: boolean
  hasPurchases: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  documentTitle,
  hasBookShopItems,
  hasPurchases,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  return (
    <Modal open onClose={onCancel}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Delete Document
        </h2>
        
        <p className="mb-4">
          Are you sure you want to delete "{documentTitle}"?
        </p>

        {hasBookShopItems && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This document is linked to bookshop items.
              {hasPurchases && (
                <> Payment records will be preserved, but the content will no longer be available to members.</>
              )}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-6">
          This action cannot be undone. All associated files and data will be permanently deleted.
        </p>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Document
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

### Document Card Updates

```typescript
// components/dashboard/DocumentCard.tsx
const handleDelete = async () => {
  setShowDeleteDialog(true)
}

const confirmDelete = async () => {
  setIsDeleting(true)
  try {
    const response = await fetch(`/api/documents/${document.id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete document')
    }

    toast.success('Document deleted successfully')
    onDelete?.(document.id)
  } catch (error) {
    toast.error(error.message)
  } finally {
    setIsDeleting(false)
    setShowDeleteDialog(false)
  }
}
```

## Member Experience Updates

### MyJstudyroom Component

```typescript
// components/member/MyJstudyroom.tsx
// Handle unavailable content gracefully

const UnavailableContentCard = ({ item }: { item: MyJstudyroomItem }) => {
  return (
    <Card className="opacity-60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <FileX className="h-8 w-8 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-700">
              {item.bookShopItem.title}
            </h3>
            <p className="text-sm text-gray-500">
              This content is no longer available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// In the main component
{items.map(item => (
  item.bookShopItem.isAvailable ? (
    <BookShopItemCard key={item.id} item={item} />
  ) : (
    <UnavailableContentCard key={item.id} item={item} />
  )
))}
```

## Error Handling

### Error Types

```typescript
// lib/errors/deletion-errors.ts

export class DocumentDeletionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'DocumentDeletionError'
  }
}

export const DeletionErrors = {
  NOT_FOUND: new DocumentDeletionError(
    'Document not found',
    'DOCUMENT_NOT_FOUND',
    404
  ),
  UNAUTHORIZED: new DocumentDeletionError(
    'You do not have permission to delete this document',
    'UNAUTHORIZED',
    403
  ),
  FOREIGN_KEY_CONSTRAINT: new DocumentDeletionError(
    'Cannot delete document due to existing references',
    'FOREIGN_KEY_CONSTRAINT',
    409
  ),
  STORAGE_CLEANUP_FAILED: new DocumentDeletionError(
    'Document deleted but storage cleanup failed',
    'STORAGE_CLEANUP_FAILED',
    207 // Multi-status
  ),
  TRANSACTION_FAILED: new DocumentDeletionError(
    'Failed to delete document. Please try again.',
    'TRANSACTION_FAILED',
    500
  )
}
```

## Testing Strategy

### Unit Tests

```typescript
// app/api/documents/[id]/__tests__/delete.test.ts

describe('DELETE /api/documents/[id]', () => {
  it('should delete document successfully', async () => {
    // Test basic deletion
  })

  it('should soft delete bookshop items', async () => {
    // Test soft delete behavior
  })

  it('should preserve payment records', async () => {
    // Test payment preservation
  })

  it('should update user storage usage', async () => {
    // Test storage calculation
  })

  it('should handle storage cleanup failures gracefully', async () => {
    // Test partial failure handling
  })

  it('should return 404 for non-existent document', async () => {
    // Test error handling
  })

  it('should return 403 for unauthorized user', async () => {
    // Test ownership verification
  })
})
```

### Integration Tests

```typescript
// lib/__tests__/document-deletion.integration.test.ts

describe('Document Deletion Integration', () => {
  it('should handle complete deletion workflow', async () => {
    // Create document with bookshop item and payment
    // Delete document
    // Verify all expected changes
  })

  it('should handle concurrent deletion attempts', async () => {
    // Test race conditions
  })
})
```

## Monitoring and Logging

### Logging Strategy

```typescript
// Log levels and events

// INFO: Successful operations
logger.info('Document deleted successfully', {
  userId,
  documentId,
  hadBookShopItems,
  storageFreed: fileSize
})

// WARN: Partial failures
logger.warn('Storage cleanup incomplete', {
  documentId,
  failedFiles: errors
})

// ERROR: Complete failures
logger.error('Document deletion failed', {
  userId,
  documentId,
  error: error.message,
  stack: error.stack
})
```

### Metrics to Track

1. **Deletion Success Rate**: Percentage of successful deletions
2. **Storage Cleanup Success Rate**: Percentage of complete storage cleanups
3. **Average Deletion Time**: Time taken for deletion operations
4. **Soft Delete Count**: Number of bookshop items soft deleted
5. **Payment Preservation Count**: Number of payments preserved

## Rollback Strategy

### If Migration Fails

```sql
-- Rollback migration
BEGIN;

-- Remove new columns
ALTER TABLE "book_shop_items" 
  DROP COLUMN IF EXISTS "isAvailable",
  DROP COLUMN IF EXISTS "deletedAt";

-- Restore NOT NULL constraints
ALTER TABLE "book_shop_items" 
  ALTER COLUMN "documentId" SET NOT NULL;

ALTER TABLE "payments" 
  ALTER COLUMN "bookShopItemId" SET NOT NULL;

-- Restore original foreign keys
ALTER TABLE "payments" 
  DROP CONSTRAINT IF EXISTS "payments_bookShopItemId_fkey";

ALTER TABLE "payments" 
  ADD CONSTRAINT "payments_bookShopItemId_fkey" 
  FOREIGN KEY ("bookShopItemId") 
  REFERENCES "book_shop_items"("id") 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

ALTER TABLE "book_shop_items" 
  DROP CONSTRAINT IF EXISTS "book_shop_items_documentId_fkey";

ALTER TABLE "book_shop_items" 
  ADD CONSTRAINT "book_shop_items_documentId_fkey" 
  FOREIGN KEY ("documentId") 
  REFERENCES "documents"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

COMMIT;
```

## Performance Considerations

1. **Transaction Size**: Keep transactions focused and quick
2. **Storage Cleanup**: Run asynchronously to avoid blocking
3. **Batch Operations**: Use `updateMany` for bulk soft deletes
4. **Index Usage**: Ensure indexes on `isAvailable` and `deletedAt`
5. **Connection Pooling**: Use Prisma's connection pooling effectively

## Security Considerations

1. **Authentication**: Verify user session before any operation
2. **Authorization**: Verify document ownership
3. **Role Check**: Ensure user has PLATFORM_USER or ADMIN role
4. **Audit Trail**: Log all deletion attempts and outcomes
5. **Data Preservation**: Never delete payment records
6. **Rate Limiting**: Consider rate limiting deletion operations

## Deployment Plan

### Phase 1: Database Migration (5 minutes)
1. Run migration script
2. Verify schema changes
3. Test rollback procedure

### Phase 2: API Deployment (10 minutes)
1. Deploy updated API routes
2. Deploy storage cleanup functions
3. Verify error handling

### Phase 3: UI Deployment (5 minutes)
1. Deploy confirmation dialog
2. Deploy member UI updates
3. Test end-to-end flow

### Phase 4: Monitoring (Ongoing)
1. Monitor deletion success rates
2. Track storage cleanup failures
3. Monitor user feedback

## Success Criteria

- ✅ Documents can be deleted successfully
- ✅ Payment records are preserved
- ✅ BookShop items are soft deleted
- ✅ Storage files are cleaned up
- ✅ User storage usage is updated correctly
- ✅ Clear error messages for failures
- ✅ Members see appropriate messaging for unavailable content
- ✅ No orphaned database records
- ✅ No orphaned storage files
- ✅ Transaction integrity maintained
