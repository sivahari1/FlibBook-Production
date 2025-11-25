-- ============================================
-- Storage RLS Policies for Multi-Content Types
-- Requirements: 3.3, 4.3
-- ============================================
-- 
-- This SQL script sets up Row Level Security (RLS) policies for
-- Supabase Storage buckets to support multi-content type uploads
-- 
-- Buckets covered:
-- - images: For image uploads (JPG, PNG, GIF, WebP)
-- - videos: For video uploads (MP4, WebM, MOV)
-- 
-- Access patterns:
-- 1. Admins: Full access to their own content
-- 2. Members: Read access to purchased BookShop content
-- 3. Platform Users: Read access to shared content
-- 
-- Execute this in Supabase Dashboard > SQL Editor
-- ============================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Admin can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read own images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Member can read purchased images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read shared images" ON storage.objects;

DROP POLICY IF EXISTS "Admin can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read own videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Member can read purchased videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read shared videos" ON storage.objects;

-- ============================================
-- Policies for images bucket
-- ============================================

-- Admin upload policy for images
CREATE POLICY "Admin can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin read policy for images
CREATE POLICY "Admin can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin update policy for images
CREATE POLICY "Admin can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin delete policy for images
CREATE POLICY "Admin can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Member read purchased images
CREATE POLICY "Member can read purchased images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  EXISTS (
    SELECT 1 FROM my_jstudyroom_items mj
    INNER JOIN book_shop_items b ON mj."bookShopItemId" = b.id
    INNER JOIN documents d ON b."documentId" = d.id
    WHERE mj."userId" = auth.uid()::text
    AND d."storagePath" = name
  )
);

-- Users can read shared images
CREATE POLICY "Users can read shared images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  EXISTS (
    SELECT 1 FROM documents d
    LEFT JOIN document_shares ds ON d.id = ds."documentId"
    LEFT JOIN share_links sl ON d.id = sl."documentId"
    WHERE d."storagePath" = name
    AND (
      (ds."sharedWithEmail" = (SELECT email FROM users WHERE id = auth.uid()::text))
      OR sl.id IS NOT NULL
    )
  )
);

-- ============================================
-- Policies for videos bucket
-- ============================================

-- Admin upload policy for videos
CREATE POLICY "Admin can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin read policy for videos
CREATE POLICY "Admin can read own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin update policy for videos
CREATE POLICY "Admin can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Admin delete policy for videos
CREATE POLICY "Admin can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- Member read purchased videos
CREATE POLICY "Member can read purchased videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM my_jstudyroom_items mj
    INNER JOIN book_shop_items b ON mj."bookShopItemId" = b.id
    INNER JOIN documents d ON b."documentId" = d.id
    WHERE mj."userId" = auth.uid()::text
    AND d."storagePath" = name
  )
);

-- Users can read shared videos
CREATE POLICY "Users can read shared videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM documents d
    LEFT JOIN document_shares ds ON d.id = ds."documentId"
    LEFT JOIN share_links sl ON d.id = sl."documentId"
    WHERE d."storagePath" = name
    AND (
      (ds."sharedWithEmail" = (SELECT email FROM users WHERE id = auth.uid()::text))
      OR sl.id IS NOT NULL
    )
  )
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check that policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%images%' OR policyname LIKE '%videos%'
ORDER BY policyname;

-- ============================================
-- Notes
-- ============================================
-- 
-- 1. These policies assume Supabase Auth is integrated with your User table
-- 2. The auth.uid() function returns the authenticated user's ID
-- 3. Storage paths should follow the pattern: bucket/userId/filename
-- 4. For purchased content access, the Document.fileUrl should match the storage path
-- 5. Shared content access checks both EmailShare and LinkShare tables
-- 
-- To create the buckets (if not already created):
-- Run: npx tsx scripts/setup-storage-buckets.ts
-- 
-- Or create manually in Supabase Dashboard:
-- Storage > Create new bucket > Name: "images" or "videos"
-- Settings: Private, 1GB limit, appropriate MIME types
