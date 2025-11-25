# Supabase Storage Buckets Setup

## Overview

This document describes the Supabase storage bucket setup for multi-content type support in the jStudyRoom platform. The implementation supports PDFs, images, and videos with appropriate access control policies.

**Requirements:** 3.3, 4.3

## Storage Architecture

### Bucket Structure

```
Supabase Storage
├── documents (PDFs)
│   └── pdfs/
│       └── {userId}/
│           ├── {documentId}.pdf
│           └── thumbnails/
│               └── {documentId}.jpg
├── images
│   └── images/
│       └── {userId}/
│           ├── {documentId}.{ext}
│           └── thumbnails/
│               └── {documentId}.jpg
└── videos
    └── videos/
        └── {userId}/
            ├── {documentId}.{ext}
            └── thumbnails/
                └── {documentId}.jpg
```

### Bucket Configuration

| Bucket | Content Types | Size Limit | Public |
|--------|--------------|------------|--------|
| documents | application/pdf | 1GB | No |
| images | image/jpeg, image/png, image/gif, image/webp | 1GB | No |
| videos | video/mp4, video/webm, video/quicktime | 1GB | No |

## Access Control Policies

### Admin Access (Full Control)

Admins have full CRUD access to their own content:

1. **Upload**: Can upload files to their user folder
2. **Read**: Can read their own files
3. **Update**: Can update their own files
4. **Delete**: Can delete their own files

### Member Access (Purchased Content)

Members can read content they have purchased:

- Access granted through Purchase table relationship
- Must have completed purchase (status = 'COMPLETED')
- Read-only access

### Platform User Access (Shared Content)

Platform users can read content shared with them:

- Access via EmailShare (recipient email matches)
- Access via LinkShare (public share links)
- Read-only access

## Implementation Files

### 1. Storage Library Updates

**File:** `lib/storage.ts`

Added support for multiple buckets:

```typescript
// Bucket mapping for content types
const BUCKET_MAP: Record<ContentType, string> = {
  [ContentType.PDF]: 'documents',
  [ContentType.IMAGE]: 'images',
  [ContentType.VIDEO]: 'videos',
  [ContentType.LINK]: 'documents'
}

// Helper function
export function getBucketForContentType(contentType: ContentType): string {
  return BUCKET_MAP[contentType] || 'documents'
}
```

All storage functions now accept an optional `bucketName` parameter:
- `uploadFile(file, path, contentType, bucketName?)`
- `downloadFile(path, bucketName?)`
- `getSignedUrl(path, expiresIn, bucketName?)`
- `deleteFile(path, bucketName?)`
- `getPublicUrl(path, bucketName?)`
- `listFiles(path, bucketName?)`

### 2. Content Processor Updates

**File:** `lib/content-processor.ts`

Updated to use correct buckets for each content type:

```typescript
// PDF processing
const bucket = getBucketForContentType(ContentType.PDF);
await uploadFile(buffer, storagePath, file.type, bucket);

// Image processing
const bucket = getBucketForContentType(ContentType.IMAGE);
await uploadFile(buffer, storagePath, file.type, bucket);

// Video processing
const bucket = getBucketForContentType(ContentType.VIDEO);
await uploadFile(buffer, storagePath, file.type, bucket);
```

### 3. Setup Script

**File:** `scripts/setup-storage-buckets.ts`

Automated script to create storage buckets:

```bash
npx tsx scripts/setup-storage-buckets.ts
```

Features:
- Creates buckets if they don't exist
- Configures bucket settings (size limits, MIME types)
- Generates SQL for RLS policies
- Provides verification queries

### 4. SQL Policies

**File:** `prisma/storage-policies.sql`

Complete SQL script for Row Level Security policies:

```sql
-- Admin policies (full CRUD)
CREATE POLICY "Admin can upload images" ON storage.objects FOR INSERT...
CREATE POLICY "Admin can read own images" ON storage.objects FOR SELECT...
CREATE POLICY "Admin can update own images" ON storage.objects FOR UPDATE...
CREATE POLICY "Admin can delete own images" ON storage.objects FOR DELETE...

-- Member policies (purchased content)
CREATE POLICY "Member can read purchased images" ON storage.objects FOR SELECT...

-- Platform user policies (shared content)
CREATE POLICY "Users can read shared images" ON storage.objects FOR SELECT...
```

## Setup Instructions

### Step 1: Create Buckets

Run the setup script:

```bash
npx tsx scripts/setup-storage-buckets.ts
```

This will:
1. Check for existing buckets
2. Create missing buckets (images, videos)
3. Generate SQL for RLS policies

### Step 2: Apply RLS Policies

1. Copy the SQL output from the script (or use `prisma/storage-policies.sql`)
2. Go to Supabase Dashboard > SQL Editor
3. Paste and execute the SQL
4. Verify policies in Storage > Policies

### Step 3: Verify Setup

Check that buckets are created:
```sql
SELECT * FROM storage.buckets;
```

Check that policies are active:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects'
AND (policyname LIKE '%images%' OR policyname LIKE '%videos%');
```

## Security Considerations

### Path-Based Access Control

All policies use path-based access control:

```sql
-- Admin can only access their own folder
(storage.foldername(name))[1] = auth.uid()::text
```

### Role Verification

Policies verify user roles through the User table:

```sql
EXISTS (
  SELECT 1 FROM "User"
  WHERE id = auth.uid()::text AND role = 'ADMIN'
)
```

### Purchase Verification

Member access requires completed purchases:

```sql
EXISTS (
  SELECT 1 FROM "Purchase" p
  INNER JOIN "BookShopItem" b ON p."bookShopItemId" = b.id
  WHERE p."userId" = auth.uid()::text
  AND p.status = 'COMPLETED'
)
```

## Testing

### Test Admin Upload

```typescript
// Upload image as admin
const result = await uploadFile(
  imageBuffer,
  `images/${adminUserId}/test.jpg`,
  'image/jpeg',
  'images'
);
```

### Test Member Access

```typescript
// Member accessing purchased content
const { data } = await supabase.storage
  .from('images')
  .download('images/adminId/purchased-image.jpg');
```

### Test Shared Content Access

```typescript
// Platform user accessing shared content
const { data } = await supabase.storage
  .from('videos')
  .download('videos/adminId/shared-video.mp4');
```

## Troubleshooting

### Bucket Creation Fails

**Issue:** Bucket already exists or permission denied

**Solution:**
- Check existing buckets in Supabase Dashboard
- Verify service role key has admin permissions
- Manually create buckets if needed

### Policy Not Working

**Issue:** Users can't access content they should be able to

**Solution:**
1. Verify policy is created: Check Storage > Policies
2. Check user authentication: Ensure auth.uid() returns correct value
3. Verify relationships: Check Purchase/Share tables
4. Test with SQL: Run policy conditions manually

### Upload Fails

**Issue:** Upload returns permission denied

**Solution:**
1. Check bucket exists
2. Verify user is authenticated
3. Check path format: Should be `{contentType}/{userId}/{filename}`
4. Verify user role in database

## Migration Notes

### Existing Content

Existing PDFs in the `documents` bucket are not affected. The system maintains backward compatibility.

### Gradual Rollout

1. Create new buckets (images, videos)
2. Apply RLS policies
3. Test with new uploads
4. Monitor for issues
5. Optionally migrate existing content

## Performance Considerations

### Signed URLs

Use signed URLs for temporary access:

```typescript
const { url } = await getSignedUrl(
  'images/userId/image.jpg',
  3600, // 1 hour
  'images'
);
```

### Caching

Consider caching signed URLs:
- Store in Redis with TTL
- Regenerate before expiry
- Reduces Supabase API calls

### Thumbnails

Generate thumbnails for faster loading:
- Images: 300x300 max
- Videos: First frame extraction
- Store in `/thumbnails/` subfolder

## Future Enhancements

1. **CDN Integration**: Add CloudFlare or similar for faster delivery
2. **Video Transcoding**: Convert videos to multiple formats/qualities
3. **Image Optimization**: Automatic WebP conversion
4. **Backup Strategy**: Regular backups to S3 or similar
5. **Analytics**: Track storage usage per user/content type

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

## Task Completion

✅ Created storage buckets for images and videos
✅ Set up RLS policies for admin access
✅ Set up RLS policies for member access to purchased content
✅ Updated storage library to support multiple buckets
✅ Updated content processor to use correct buckets
✅ Created setup script and SQL files
✅ Documented implementation and setup process

**Status:** Complete
**Requirements Validated:** 3.3, 4.3
