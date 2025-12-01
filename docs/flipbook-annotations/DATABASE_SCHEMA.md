# Database Schema Documentation

## Overview

This document describes the database schema for the Flipbook & Media Annotations system.

---

## Tables

### DocumentAnnotation

Stores media annotations for documents.

**Table Name**: `DocumentAnnotation`

**Columns**:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | String (cuid) | No | auto | Primary key |
| documentId | String | No | - | Foreign key to Document |
| userId | String | No | - | Foreign key to User |
| pageNumber | Int | No | - | Page number (1-indexed) |
| selectedText | String | No | - | Text that was annotated |
| mediaType | Enum | No | - | AUDIO or VIDEO |
| mediaUrl | String | No | - | URL to media file |
| mediaSource | String | No | - | 'upload' or 'external' |
| description | String | Yes | null | Optional description |
| visibility | String | No | 'public' | 'public' or 'private' |
| position | Json | No | - | {x: number, y: number} |
| createdAt | DateTime | No | now() | Creation timestamp |
| updatedAt | DateTime | No | now() | Last update timestamp |

**Indexes**:
```sql
-- Composite index for efficient page queries
CREATE INDEX idx_annotation_document_page ON DocumentAnnotation(documentId, pageNumber);

-- Index for user queries
CREATE INDEX idx_annotation_user ON DocumentAnnotation(userId);

-- Index for visibility filtering
CREATE INDEX idx_annotation_visibility ON DocumentAnnotation(visibility);

-- Index for media type filtering
CREATE INDEX idx_annotation_media_type ON DocumentAnnotation(mediaType);
```

**Relations**:
```prisma
model DocumentAnnotation {
  id           String   @id @default(cuid())
  documentId   String
  userId       String
  pageNumber   Int
  selectedText String   @db.Text
  mediaType    MediaType
  mediaUrl     String
  mediaSource  String
  description  String?  @db.Text
  visibility   String   @default("public")
  position     Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([documentId, pageNumber])
  @@index([userId])
  @@index([visibility])
  @@index([mediaType])
}
```

---

### MediaType Enum

Defines the types of media that can be annotated.

**Values**:
- `AUDIO`: Audio files (MP3, WAV) or audio URLs
- `VIDEO`: Video files (MP4, WEBM) or video URLs

```prisma
enum MediaType {
  AUDIO
  VIDEO
}
```

---

## Relationships

### DocumentAnnotation → Document

- **Type**: Many-to-One
- **Foreign Key**: `documentId`
- **On Delete**: CASCADE (deleting a document deletes all its annotations)
- **Description**: Each annotation belongs to one document

### DocumentAnnotation → User

- **Type**: Many-to-One
- **Foreign Key**: `userId`
- **On Delete**: CASCADE (deleting a user deletes all their annotations)
- **Description**: Each annotation is created by one user

---

## Queries

### Common Query Patterns

#### Get annotations for a specific page

```sql
SELECT * FROM DocumentAnnotation
WHERE documentId = ? AND pageNumber = ?
ORDER BY createdAt DESC;
```

**Prisma**:
```typescript
await prisma.documentAnnotation.findMany({
  where: {
    documentId: 'doc-123',
    pageNumber: 5
  },
  orderBy: {
    createdAt: 'desc'
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});
```

#### Get all annotations for a document

```sql
SELECT * FROM DocumentAnnotation
WHERE documentId = ?
ORDER BY pageNumber ASC, createdAt DESC;
```

**Prisma**:
```typescript
await prisma.documentAnnotation.findMany({
  where: {
    documentId: 'doc-123'
  },
  orderBy: [
    { pageNumber: 'asc' },
    { createdAt: 'desc' }
  ]
});
```

#### Get user's annotations

```sql
SELECT * FROM DocumentAnnotation
WHERE userId = ?
ORDER BY createdAt DESC;
```

**Prisma**:
```typescript
await prisma.documentAnnotation.findMany({
  where: {
    userId: 'user-123'
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

#### Filter by media type

```sql
SELECT * FROM DocumentAnnotation
WHERE documentId = ? AND mediaType = ?
ORDER BY pageNumber ASC;
```

**Prisma**:
```typescript
await prisma.documentAnnotation.findMany({
  where: {
    documentId: 'doc-123',
    mediaType: 'AUDIO'
  },
  orderBy: {
    pageNumber: 'asc'
  }
});
```

#### Filter by visibility

```sql
SELECT * FROM DocumentAnnotation
WHERE documentId = ? AND visibility = 'public'
ORDER BY pageNumber ASC;
```

**Prisma**:
```typescript
await prisma.documentAnnotation.findMany({
  where: {
    documentId: 'doc-123',
    visibility: 'public'
  },
  orderBy: {
    pageNumber: 'asc'
  }
});
```

---

## Migrations

### Initial Migration

**File**: `prisma/migrations/20241129000000_add_document_annotations/migration.sql`

```sql
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "DocumentAnnotation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "selectedText" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaSource" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "position" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentAnnotation_documentId_pageNumber_idx" ON "DocumentAnnotation"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "DocumentAnnotation_userId_idx" ON "DocumentAnnotation"("userId");

-- CreateIndex
CREATE INDEX "DocumentAnnotation_visibility_idx" ON "DocumentAnnotation"("visibility");

-- CreateIndex
CREATE INDEX "DocumentAnnotation_mediaType_idx" ON "DocumentAnnotation"("mediaType");

-- AddForeignKey
ALTER TABLE "DocumentAnnotation" ADD CONSTRAINT "DocumentAnnotation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAnnotation" ADD CONSTRAINT "DocumentAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Running Migrations

```bash
# Generate migration
npx prisma migrate dev --name add_document_annotations

# Apply migration to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

---

## Data Validation

### Application-Level Validation

```typescript
import { z } from 'zod';

const annotationSchema = z.object({
  documentId: z.string().cuid(),
  pageNumber: z.number().int().positive(),
  selectedText: z.string().min(1).max(5000),
  mediaType: z.enum(['AUDIO', 'VIDEO']),
  mediaUrl: z.string().url(),
  mediaSource: z.enum(['upload', 'external']),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  position: z.object({
    x: z.number(),
    y: z.number()
  })
});
```

---

## Performance Optimization

### Index Usage

The composite index on `(documentId, pageNumber)` optimizes the most common query pattern:

```sql
EXPLAIN ANALYZE
SELECT * FROM DocumentAnnotation
WHERE documentId = 'doc-123' AND pageNumber = 5;

-- Uses: DocumentAnnotation_documentId_pageNumber_idx
-- Execution time: ~1ms
```

### Query Optimization Tips

1. **Always filter by documentId first**: Uses the composite index
2. **Limit results**: Use pagination for large result sets
3. **Select only needed fields**: Reduce data transfer
4. **Use connection pooling**: Reuse database connections
5. **Cache frequently accessed data**: Use Redis for hot data

---

## Backup and Recovery

### Backup Strategy

```bash
# Daily automated backups
pg_dump -h localhost -U postgres -d jstudyroom > backup_$(date +%Y%m%d).sql

# Backup specific table
pg_dump -h localhost -U postgres -d jstudyroom -t DocumentAnnotation > annotations_backup.sql
```

### Recovery

```bash
# Restore from backup
psql -h localhost -U postgres -d jstudyroom < backup_20241201.sql

# Restore specific table
psql -h localhost -U postgres -d jstudyroom < annotations_backup.sql
```

---

## Data Retention

### Retention Policy

- **Active annotations**: Retained indefinitely
- **Deleted annotations**: Soft delete with 30-day retention
- **Orphaned media files**: Cleaned up after 7 days

### Cleanup Queries

```sql
-- Find orphaned annotations (document deleted)
SELECT a.* FROM DocumentAnnotation a
LEFT JOIN Document d ON a.documentId = d.id
WHERE d.id IS NULL;

-- Find old deleted annotations (if soft delete implemented)
SELECT * FROM DocumentAnnotation
WHERE deletedAt < NOW() - INTERVAL '30 days';
```

---

## Security

### Row-Level Security (RLS)

For Supabase deployments, RLS policies ensure data security:

```sql
-- Users can view public annotations or their own private annotations
CREATE POLICY "Users can view annotations"
ON DocumentAnnotation FOR SELECT
USING (
  visibility = 'public' OR
  auth.uid() = userId
);

-- Users can create annotations for documents they own
CREATE POLICY "Users can create annotations"
ON DocumentAnnotation FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT userId FROM Document WHERE id = documentId
  )
);

-- Users can update their own annotations
CREATE POLICY "Users can update own annotations"
ON DocumentAnnotation FOR UPDATE
USING (auth.uid() = userId);

-- Users can delete their own annotations
CREATE POLICY "Users can delete own annotations"
ON DocumentAnnotation FOR DELETE
USING (auth.uid() = userId);
```

---

## Monitoring

### Key Metrics to Monitor

1. **Table size**: Monitor growth rate
2. **Index usage**: Ensure indexes are being used
3. **Query performance**: Track slow queries
4. **Connection pool**: Monitor active connections
5. **Replication lag**: For read replicas

### Monitoring Queries

```sql
-- Table size
SELECT pg_size_pretty(pg_total_relation_size('DocumentAnnotation'));

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'DocumentAnnotation';

-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%DocumentAnnotation%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Future Enhancements

### Planned Schema Changes

1. **Annotation versioning**: Track annotation history
2. **Collaborative annotations**: Multiple users per annotation
3. **Annotation threads**: Comments on annotations
4. **Annotation tags**: Categorize annotations
5. **Annotation analytics**: Track views and interactions

---

Last Updated: December 1, 2024
