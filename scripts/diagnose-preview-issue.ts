/**
 * Diagnostic script to identify preview page issues
 * Run with: npx tsx scripts/diagnose-preview-issue.ts <documentId> <userId>
 */

import { prisma } from '../lib/db';
import { getDocumentForPreview } from '../lib/documents';
import { getSignedUrl } from '../lib/storage';

async function diagnosePreviewIssue(documentId: string, userId: string) {
  console.log('🔍 Diagnosing preview issue...\n');
  console.log(`Document ID: ${documentId}`);
  console.log(`User ID: ${userId}\n`);

  try {
    // Step 1: Check if document exists
    console.log('Step 1: Checking if document exists...');
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        userId: true,
        storagePath: true,
        mimeType: true,
      },
    });

    if (!document) {
      console.log('❌ Document not found in database');
      return;
    }

    console.log('✅ Document found:');
    console.log(`   Title: ${document.title}`);
    console.log(`   Owner ID: ${document.userId}`);
    console.log(`   Storage Path: ${document.storagePath}`);
    console.log(`   MIME Type: ${document.mimeType}\n`);

    // Step 2: Check ownership
    console.log('Step 2: Checking ownership...');
    if (document.userId !== userId) {
      console.log(`❌ Ownership mismatch!`);
      console.log(`   Document owner: ${document.userId}`);
      console.log(`   Requesting user: ${userId}`);
      return;
    }
    console.log('✅ Ownership verified\n');

    // Step 3: Test getDocumentForPreview function
    console.log('Step 3: Testing getDocumentForPreview function...');
    const previewDoc = await getDocumentForPreview(documentId, userId);
    if (!previewDoc) {
      console.log('❌ getDocumentForPreview returned null');
      return;
    }
    console.log('✅ getDocumentForPreview successful\n');

    // Step 4: Test signed URL generation
    console.log('Step 4: Testing signed URL generation...');
    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath,
      3600
    );

    if (error || !signedUrl) {
      console.log('❌ Failed to generate signed URL');
      console.log(`   Error: ${error}`);
      return;
    }
    console.log('✅ Signed URL generated successfully');
    console.log(`   URL: ${signedUrl.substring(0, 100)}...\n`);

    // Step 5: Check if PDF pages exist
    console.log('Step 5: Checking for converted pages...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: pageFiles, error: listError } = await supabase.storage
      .from('document-pages')
      .list(`${document.userId}/${documentId}`);

    if (listError) {
      console.log('⚠️  Could not check for pages:', listError.message);
    } else if (!pageFiles || pageFiles.length === 0) {
      console.log('⚠️  No converted pages found - document will need conversion');
    } else {
      console.log(`✅ Found ${pageFiles.length} converted pages`);
    }

    console.log('\n✅ All checks passed! Preview should work.');
    console.log('\nIf preview still fails, check:');
    console.log('1. Browser console for client-side errors');
    console.log('2. Next.js server logs for runtime errors');
    console.log('3. Authentication session validity');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const documentId = process.argv[2];
const userId = process.argv[3];

if (!documentId || !userId) {
  console.log('Usage: npx tsx scripts/diagnose-preview-issue.ts <documentId> <userId>');
  console.log('\nTo find your document ID and user ID:');
  console.log('1. Go to your dashboard');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Look at the document card or network requests');
  process.exit(1);
}

diagnosePreviewIssue(documentId, userId);
