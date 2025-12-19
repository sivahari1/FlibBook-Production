#!/usr/bin/env tsx

/**
 * Direct PDF Conversion Script
 * 
 * Converts PDF documents to images by calling the conversion service directly,
 * bypassing the API authentication requirements.
 */

import { prisma } from '@/lib/db';
import { convertPdfToImages } from '@/lib/services/pdf-converter';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function convertDocumentDirect(documentId: string) {
  try {
    console.log(`\n📝 Converting document: ${documentId}`);

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        filename: true,
        storagePath: true,
        mimeType: true,
      },
    });

    if (!document) {
      console.log(`   ❌ Document not found`);
      return false;
    }

    if (document.mimeType !== 'application/pdf') {
      console.log(`   ⚠️  Skipping non-PDF document (${document.mimeType})`);
      return false;
    }

    console.log(`   📄 ${document.filename}`);
    console.log(`   👤 User: ${document.userId}`);

    // Download PDF from Supabase storage
    console.log(`   📥 Downloading PDF from storage...`);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storagePath);

    if (downloadError || !pdfData) {
      console.log(`   ❌ Failed to download PDF: ${downloadError?.message}`);
      return false;
    }

    // Save PDF to temporary file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'));
    const pdfPath = path.join(tempDir, 'document.pdf');
    const buffer = Buffer.from(await pdfData.arrayBuffer());
    await fs.writeFile(pdfPath, buffer);

    console.log(`   🔄 Converting PDF to images...`);

    try {
      // Convert PDF to images
      const result = await convertPdfToImages({
        documentId: document.id,
        userId: document.userId,
        pdfPath,
        quality: 85,
        dpi: 150,
        format: 'jpg',
      });

      if (!result.success) {
        console.log(`   ❌ Conversion failed: ${result.error}`);
        return false;
      }

      console.log(`   ✅ Success! Generated ${result.pageCount} pages`);
      console.log(`   ⏱️  Processing time: ${result.processingTime}ms`);
      
      // Show first few page URLs for verification
      if (result.pageUrls.length > 0) {
        console.log(`   🔗 Sample page URLs:`);
        result.pageUrls.slice(0, 3).forEach((url, index) => {
          console.log(`      Page ${index + 1}: ${url}`);
        });
        if (result.pageUrls.length > 3) {
          console.log(`      ... and ${result.pageUrls.length - 3} more pages`);
        }
      }

      return true;
    } finally {
      // Cleanup temporary files
      await fs.rm(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('🔄 Direct PDF Conversion Tool\n');

  try {
    // Get all PDF documents that need conversion
    const documents = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        filename: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Limit to 10 most recent documents
    });

    if (documents.length === 0) {
      console.log('📄 No PDF documents found to convert.');
      return;
    }

    console.log(`📄 Found ${documents.length} PDF documents to convert:\n`);

    let successful = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`[${i + 1}/${documents.length}]`);
      
      const success = await convertDocumentDirect(doc.id);
      
      if (success) {
        successful++;
      } else {
        failed++;
      }

      // Add delay between conversions to avoid overwhelming the system
      if (i < documents.length - 1) {
        console.log(`   ⏳ Waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n============================================================');
    console.log('✅ Conversion Complete!\n');
    console.log(`📊 Results:`);
    console.log(`   - Successful: ${successful}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Total: ${documents.length}`);

    if (failed > 0) {
      console.log('\n⚠️  Some conversions failed. Common issues:');
      console.log('   - PDF files missing from Supabase storage');
      console.log('   - Corrupted or invalid PDF files');
      console.log('   - Memory or processing limits exceeded');
      console.log('   - Network connectivity issues');
    }

    if (successful > 0) {
      console.log('\n🎉 Successfully converted documents can now be previewed!');
      console.log('   Go to your dashboard and click "Preview" on any converted document.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);