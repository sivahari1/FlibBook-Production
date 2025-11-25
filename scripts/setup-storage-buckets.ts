/**
 * Supabase Storage Bucket Setup Script
 * Creates storage buckets and RLS policies for multi-content type support
 * Requirements: 3.3, 4.3
 * 
 * This script sets up:
 * 1. Storage buckets for images and videos
 * 2. RLS policies for admin access (full access)
 * 3. RLS policies for member access to purchased content
 * 
 * Run with: npx tsx scripts/setup-storage-buckets.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Create a storage bucket if it doesn't exist
 */
async function createBucket(bucketName: string, isPublic: boolean = false) {
  console.log(`\n📦 Creating bucket: ${bucketName}`);
  
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error(`❌ Error listing buckets:`, listError);
    return false;
  }

  const bucketExists = buckets?.some(b => b.name === bucketName);
  
  if (bucketExists) {
    console.log(`✅ Bucket '${bucketName}' already exists`);
    return true;
  }

  // Create bucket
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
    fileSizeLimit: 1024 * 1024 * 1024, // 1GB
    allowedMimeTypes: bucketName === 'images' 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      : bucketName === 'videos'
      ? ['video/mp4', 'video/webm', 'video/quicktime']
      : undefined
  });

  if (error) {
    console.error(`❌ Error creating bucket '${bucketName}':`, error);
    return false;
  }

  console.log(`✅ Successfully created bucket: ${bucketName}`);
  return true;
}

/**
 * Set up RLS policies for a bucket
 * Note: Storage policies are managed through SQL, not the JS client
 * This function generates the SQL commands needed
 */
function generateStoragePolicies(bucketName: string): string[] {
  const policies: string[] = [];

  // Policy 1: Admin users can upload to their own folders
  policies.push(`
-- Admin upload policy for ${bucketName}
CREATE POLICY "Admin can upload ${bucketName}"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = '${bucketName}' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);
  `.trim());

  // Policy 2: Admin users can read their own files
  policies.push(`
-- Admin read policy for ${bucketName}
CREATE POLICY "Admin can read own ${bucketName}"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = '${bucketName}' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);
  `.trim());

  // Policy 3: Admin users can update their own files
  policies.push(`
-- Admin update policy for ${bucketName}
CREATE POLICY "Admin can update own ${bucketName}"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = '${bucketName}' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);
  `.trim());

  // Policy 4: Admin users can delete their own files
  policies.push(`
-- Admin delete policy for ${bucketName}
CREATE POLICY "Admin can delete own ${bucketName}"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = '${bucketName}' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM "User"
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);
  `.trim());

  // Policy 5: Members can read purchased content
  policies.push(`
-- Member read purchased ${bucketName}
CREATE POLICY "Member can read purchased ${bucketName}"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = '${bucketName}' AND
  EXISTS (
    SELECT 1 FROM "Purchase" p
    INNER JOIN "BookShopItem" b ON p."bookShopItemId" = b.id
    INNER JOIN "Document" d ON b."documentId" = d.id
    WHERE p."userId" = auth.uid()::text
    AND p.status = 'COMPLETED'
    AND d."fileUrl" = name
  )
);
  `.trim());

  // Policy 6: Platform users can read shared content
  policies.push(`
-- Users can read shared ${bucketName}
CREATE POLICY "Users can read shared ${bucketName}"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = '${bucketName}' AND
  EXISTS (
    SELECT 1 FROM "Document" d
    LEFT JOIN "EmailShare" es ON d.id = es."documentId"
    LEFT JOIN "LinkShare" ls ON d.id = ls."documentId"
    WHERE d."fileUrl" = name
    AND (
      (es."recipientEmail" = (SELECT email FROM "User" WHERE id = auth.uid()::text))
      OR ls.id IS NOT NULL
    )
  )
);
  `.trim());

  return policies;
}

/**
 * Main setup function
 */
async function setupStorageBuckets() {
  console.log('🚀 Starting Supabase Storage Bucket Setup');
  console.log('==========================================\n');

  // Create buckets
  const bucketsToCreate = [
    { name: 'documents', public: false }, // Existing bucket for PDFs
    { name: 'images', public: false },
    { name: 'videos', public: false }
  ];

  for (const bucket of bucketsToCreate) {
    await createBucket(bucket.name, bucket.public);
  }

  // Generate SQL for RLS policies
  console.log('\n📝 Generating RLS Policy SQL');
  console.log('==========================================\n');
  console.log('Copy and execute the following SQL in your Supabase SQL Editor:\n');
  console.log('-- ============================================');
  console.log('-- Storage RLS Policies for Multi-Content Types');
  console.log('-- ============================================\n');

  // Drop existing policies first (if any)
  console.log('-- Drop existing policies (if any)');
  for (const bucketName of ['images', 'videos']) {
    console.log(`DROP POLICY IF EXISTS "Admin can upload ${bucketName}" ON storage.objects;`);
    console.log(`DROP POLICY IF EXISTS "Admin can read own ${bucketName}" ON storage.objects;`);
    console.log(`DROP POLICY IF EXISTS "Admin can update own ${bucketName}" ON storage.objects;`);
    console.log(`DROP POLICY IF EXISTS "Admin can delete own ${bucketName}" ON storage.objects;`);
    console.log(`DROP POLICY IF EXISTS "Member can read purchased ${bucketName}" ON storage.objects;`);
    console.log(`DROP POLICY IF EXISTS "Users can read shared ${bucketName}" ON storage.objects;`);
    console.log('');
  }

  // Generate policies for each bucket
  for (const bucketName of ['images', 'videos']) {
    console.log(`\n-- Policies for ${bucketName} bucket`);
    console.log('-- ============================================\n');
    const policies = generateStoragePolicies(bucketName);
    policies.forEach(policy => {
      console.log(policy);
      console.log('');
    });
  }

  console.log('\n✅ Storage bucket setup complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Copy the SQL statements above');
  console.log('2. Go to your Supabase Dashboard > SQL Editor');
  console.log('3. Paste and execute the SQL');
  console.log('4. Verify policies are created in Storage > Policies');
}

// Run the setup
setupStorageBuckets().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
