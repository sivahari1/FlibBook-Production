import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function setup() {
  console.log('🚀 Setting up Preview Content Rendering\n');

  try {
    // 1. Create DocumentPage table
    console.log('1️⃣ Creating DocumentPage table...');
    
    // Execute each statement separately
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "document_pages" (
        "id" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "pageNumber" INTEGER NOT NULL,
        "pageUrl" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "document_pages_documentId_pageNumber_key" 
      ON "document_pages"("documentId", "pageNumber")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "document_pages_documentId_idx" 
      ON "document_pages"("documentId")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "document_pages_expiresAt_idx" 
      ON "document_pages"("expiresAt")
    `);

    console.log('✅ DocumentPage table created');

    // 2. Create Supabase Storage bucket
    console.log('\n2️⃣ Creating Supabase Storage bucket...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase credentials not found in environment');
      console.log('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      console.log('   Skipping bucket creation...');
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'document-pages');

      if (bucketExists) {
        console.log('✅ "document-pages" bucket already exists');
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket('document-pages', {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['image/png', 'image/jpeg']
        });

        if (error) {
          console.log('❌ Error creating bucket:', error.message);
        } else {
          console.log('✅ "document-pages" bucket created');
        }

        // Set bucket policy for authenticated users
        console.log('   Setting bucket policy...');
        // Note: Policies should be set in Supabase dashboard or via SQL
        console.log('   ⚠️  Please set RLS policies in Supabase dashboard:');
        console.log('      - Allow authenticated users to read their own document pages');
        console.log('      - Allow service role to insert/update/delete');
      }
    }

    console.log('\n✅ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify Supabase credentials are set in .env');
    console.log('   2. Test PDF conversion with: npx tsx scripts/test-pdf-conversion.ts');
    console.log('   3. Open a document preview to test rendering');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setup();
