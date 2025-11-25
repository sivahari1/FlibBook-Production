# Multi-Content Type Migration

## Overview

This migration adds support for multiple content types (PDF, IMAGE, VIDEO, LINK) to the jStudyRoom platform, enabling admins to upload and manage diverse media types.

## Migration Date

November 24, 2025

## Changes Applied

### Document Table

Added the following columns:
- `contentType` (TEXT, NOT NULL, DEFAULT 'PDF'): Type of content (PDF, IMAGE, VIDEO, LINK)
- `metadata` (JSONB, DEFAULT '{}'): Flexible metadata storage for content-specific information
- `thumbnailUrl` (TEXT, NULLABLE): URL to thumbnail/preview image
- `linkUrl` (TEXT, NULLABLE): URL for LINK content type

Added constraints:
- `documents_contentType_check`: Ensures contentType is one of: PDF, IMAGE, VIDEO, LINK

Added indexes:
- `documents_contentType_idx`: B-tree index on contentType for efficient filtering
- `documents_metadata_idx`: GIN index on metadata for efficient JSONB queries

### BookShopItem Table

Added the following columns:
- `contentType` (TEXT, NOT NULL, DEFAULT 'PDF'): Type of content (PDF, IMAGE, VIDEO, LINK)
- `metadata` (JSONB, DEFAULT '{}'): Flexible metadata storage for content-specific information
- `previewUrl` (TEXT, NULLABLE): URL to preview image
- `linkUrl` (TEXT, NULLABLE): URL for LINK content type

Added constraints:
- `book_shop_items_contentType_check`: Ensures contentType is one of: PDF, IMAGE, VIDEO, LINK

Added indexes:
- `book_shop_items_contentType_idx`: B-tree index on contentType for efficient filtering
- `book_shop_items_metadata_idx`: GIN index on metadata for efficient JSONB queries

## Metadata Structure

The `metadata` JSONB field can store content-type-specific information:

### PDF Metadata
```json
{
  "pageCount": 150,
  "fileSize": 5242880,
  "mimeType": "application/pdf"
}
```

### Image Metadata
```json
{
  "width": 1920,
  "height": 1080,
  "fileSize": 2097152,
  "mimeType": "image/jpeg"
}
```

### Video Metadata
```json
{
  "duration": 300,
  "width": 1920,
  "height": 1080,
  "fileSize": 52428800,
  "mimeType": "video/mp4",
  "bitrate": 5000000,
  "codec": "h264"
}
```

### Link Metadata
```json
{
  "domain": "example.com",
  "title": "Example Page",
  "description": "An example webpage",
  "previewImage": "https://example.com/preview.jpg",
  "fetchedAt": "2025-11-24T00:00:00Z"
}
```

## Backward Compatibility

- All existing documents default to `contentType = 'PDF'`
- All existing BookShop items default to `contentType = 'PDF'`
- Existing functionality remains unchanged
- New columns are nullable or have defaults, ensuring no breaking changes

## Verification

Run the verification script to confirm the migration:

```bash
npx tsx scripts/verify-multi-content-migration.ts
```

Expected output:
- ✅ All columns added to both tables
- ✅ All indexes created
- ✅ All constraints applied
- ✅ Queries with new columns work correctly

## Requirements Validated

This migration satisfies the following requirements:
- **3.3**: Store images securely in Supabase Storage
- **4.3**: Store videos securely in Supabase Storage
- **5.2**: Store URLs with title and description
- **11.3**: Accept all content types in BookShop

## Next Steps

1. ✅ Database schema updated
2. ⏳ Create content type definitions and interfaces (Task 2)
3. ⏳ Implement role-based access control (Task 3)
4. ⏳ Build content processing pipeline (Task 4)
5. ⏳ Create file validation utilities (Task 5)

## Rollback

If needed, the migration can be rolled back by:

1. Removing the columns:
```sql
ALTER TABLE "documents" DROP COLUMN IF EXISTS "contentType";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "thumbnailUrl";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "linkUrl";

ALTER TABLE "book_shop_items" DROP COLUMN IF EXISTS "contentType";
ALTER TABLE "book_shop_items" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "book_shop_items" DROP COLUMN IF EXISTS "previewUrl";
ALTER TABLE "book_shop_items" DROP COLUMN IF EXISTS "linkUrl";
```

2. Regenerating the Prisma client:
```bash
npx prisma generate
```

## Notes

- The migration uses `IF NOT EXISTS` and `IF EXISTS` clauses for idempotency
- GIN indexes on JSONB columns enable efficient querying of metadata
- Check constraints ensure data integrity at the database level
- Default values ensure backward compatibility with existing data
