/**
 * Simple diagnostic to check preview status
 * Run with: npm run check-preview
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function checkPreview() {
  console.log('🔍 Checking Preview Configuration\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing required Supabase environment variables');
    console.log('   Please check your .env.local file\n');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.log('❌ Missing DATABASE_URL');
    console.log('   Please check your .env.local file\n');
    return;
  }

  console.log('✅ All required environment variables are set\n');

  // Now import and run checks
  const { prisma } = await import('../lib/db');
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check database connection
    console.log('Checking Database Connection:');
    const docCount = await prisma.document.count();
    console.log(`  Connected - Found ${docCount} documents\n`);

    if (docCount === 0) {
      console.log('⚠️  No documents found. Upload a document to test preview.\n');
      return;
    }

    // Get a sample document
    const sampleDoc = await prisma.document.findFirst({
      where: { mimeType: 'application/pdf' },
      orderBy: { createdAt: 'desc' },
    });

    if (!sampleDoc) {
      console.log('⚠️  No PDF documents found. Upload a PDF to test preview.\n');
      return;
    }

    console.log('📄 Sample Document:');
    console.log(`  Title: ${sampleDoc.title}`);
    console.log(`  ID: ${sampleDoc.id}`);
    console.log(`  Storage Path: ${sampleDoc.storagePath}\n`);

    // Check if document exists in storage
    console.log('📦 Checking Storage:');
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .list(sampleDoc.storagePath.split('/').slice(0, -1).join('/'));

    if (fileError) {
      console.log(`  ❌ Error: ${fileError.message}\n`);
    } else if (fileData && fileData.length > 0) {
      console.log(`  ✅ Document found in storage\n`);
    } else {
      console.log(`  ❌ Document not found in storage\n`);
    }

    // Check for converted pages
    console.log('🖼️  Checking Converted Pages:');
    const { data: pagesData, error: pagesError } = await supabase.storage
      .from('document-pages')
      .list(`${sampleDoc.userId}/${sampleDoc.id}`);

    if (pagesError) {
      console.log(`  ❌ Error: ${pagesError.message}`);
      console.log(`  💡 This might mean the bucket doesn't exist or has permission issues\n`);
    } else if (pagesData && pagesData.length > 0) {
      console.log(`  ✅ Found ${pagesData.length} converted pages\n`);
    } else {
      console.log(`  ⚠️  No converted pages found`);
      console.log(`  💡 Preview will trigger automatic conversion\n`);
    }

    console.log('🔗 Test URLs:');
    console.log(`  Preview: http://localhost:3000/dashboard/documents/${sampleDoc.id}/preview`);
    console.log(`  API: http://localhost:3000/api/documents/${sampleDoc.id}/pages\n`);

    console.log('✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPreview().catch(console.error);
