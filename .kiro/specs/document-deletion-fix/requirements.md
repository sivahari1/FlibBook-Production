# Document Deletion Fix - Requirements

## Problem Statement

Users cannot delete documents from the dashboard. When attempting to delete a document, they receive an error message "Failed to delete document. Please try again." This is a critical issue that prevents users from managing their content.

## Root Cause Analysis

The deletion fails due to foreign key constraint violations in the database. Specifically:

1. **Payment Records**: When a document is linked to a BookShopItem that has associated Payment records, the deletion fails because the Payment table doesn't have a cascade delete rule configured
2. **Missing Cascade Rules**: The database schema is missing proper cascade delete configurations for several relationships
3. **Incomplete Cleanup**: The delete API doesn't handle all related records before attempting to delete the document

## Current Database Relationships

```
Document
  ├── BookShopItem (CASCADE ✅)
  │   ├── MyJstudyroomItem (CASCADE ✅)
  │   └── Payment (NO CASCADE ❌) <- PROBLEM
  ├── ShareLink (CASCADE ✅)
  ├── DocumentShare (CASCADE ✅)
  ├── ViewAnalytics (CASCADE ✅)
  ├── DocumentAnnotation (NO CASCADE ❌) <- POTENTIAL PROBLEM
  └── DocumentPage (NO CASCADE ❌) <- POTENTIAL PROBLEM
```

## User Stories

### User Story 1: Delete Document Successfully

**As a** platform user  
**I want to** delete my uploaded documents  
**So that** I can manage my content and free up storage space

**Acceptance Criteria:**

1. WHEN a user clicks the delete button on a document THEN the system SHALL display a confirmation dialog
2. WHEN a user confirms deletion THEN the system SHALL delete the document and all related records
3. WHEN deletion is successful THEN the system SHALL show a success message and remove the document from the list
4. WHEN deletion fails THEN the system SHALL show a clear error message explaining what went wrong
5. WHEN a document is deleted THEN the system SHALL update the user's storage usage accordingly

### User Story 2: Handle Documents with Payments

**As a** platform user  
**I want to** delete documents that are linked to bookshop items with payment records  
**So that** I can remove content even if it has been purchased by members

**Acceptance Criteria:**

1. WHEN a document has associated bookshop items with payments THEN the system SHALL still allow deletion
2. WHEN deleting such a document THEN the system SHALL preserve payment records for audit purposes
3. WHEN a document is deleted THEN the system SHALL mark associated bookshop items as unavailable
4. WHEN members try to access deleted content THEN the system SHALL show an appropriate message

### User Story 3: Clean Up Storage

**As a** platform user  
**I want to** have all associated files deleted from storage when I delete a document  
**So that** I don't have orphaned files consuming storage space

**Acceptance Criteria:**

1. WHEN a document is deleted THEN the system SHALL delete the main file from Supabase storage
2. WHEN a document has converted pages THEN the system SHALL delete all page images from storage
3. WHEN storage deletion fails THEN the system SHALL log the error but continue with database deletion
4. WHEN deletion completes THEN the system SHALL verify all storage cleanup was successful

### User Story 4: Maintain Data Integrity

**As a** system administrator  
**I want to** ensure payment and audit records are preserved  
**So that** we maintain financial and compliance records

**Acceptance Criteria:**

1. WHEN a document is deleted THEN the system SHALL preserve all payment records
2. WHEN a document is deleted THEN the system SHALL preserve analytics records for reporting
3. WHEN a bookshop item is deleted THEN the system SHALL mark it as deleted rather than removing it
4. WHEN members access deleted content THEN the system SHALL show appropriate messaging

## Technical Requirements

### TR-1: Database Schema Updates

- Update Payment foreign key to use `onDelete: SetNull` instead of no action
- Update DocumentAnnotation foreign key to use `onDelete: Cascade`
- Update DocumentPage foreign key to use `onDelete: Cascade`
- Add `deletedAt` timestamp to BookShopItem for soft deletes
- Add `isAvailable` boolean to BookShopItem

### TR-2: API Route Enhancements

- Implement proper transaction handling for deletions
- Add comprehensive error handling with specific error messages
- Implement storage cleanup for document pages
- Add logging for deletion operations
- Return detailed error information for debugging

### TR-3: Soft Delete for BookShop Items

- Implement soft delete for BookShopItem when document is deleted
- Preserve payment records by nullifying the bookShopItemId reference
- Update MyJstudyroom to handle deleted items gracefully
- Show appropriate UI for unavailable content

### TR-4: Storage Cleanup

- Delete main document file from Supabase storage
- Delete all converted page images from document-pages bucket
- Handle storage deletion failures gracefully
- Log all storage operations for debugging

## Success Criteria

1. **Deletion Success Rate**: 99% of document deletions complete successfully
2. **Data Integrity**: 100% of payment records are preserved after deletion
3. **Storage Cleanup**: 100% of associated files are removed from storage
4. **User Experience**: Clear error messages for any failures
5. **Performance**: Deletion completes within 5 seconds

## Out of Scope

- Bulk deletion of multiple documents
- Undo/restore deleted documents
- Archive functionality instead of deletion
- Automatic cleanup of old deleted records

## Dependencies

- Prisma ORM for database migrations
- Supabase storage for file management
- Next.js API routes
- PostgreSQL database

## Risk Assessment

**High Risk:**
- Payment record integrity during deletion
- Storage cleanup failures leaving orphaned files
- Database transaction failures

**Medium Risk:**
- Performance issues with large documents
- Concurrent deletion attempts
- Member access to deleted content

**Low Risk:**
- UI/UX improvements
- Error message clarity
- Logging enhancements

## Definition of Done

- [ ] Database schema updated with proper cascade rules
- [ ] Soft delete implemented for BookShopItem
- [ ] API route handles all deletion scenarios
- [ ] Storage cleanup works for all file types
- [ ] Payment records are preserved
- [ ] Error handling is comprehensive
- [ ] User sees clear success/error messages
- [ ] Storage usage is updated correctly
- [ ] All tests pass
- [ ] Documentation is updated
