/**
 * Reconvert Documents with Blank Pages
 * 
 * This script identifies and reconverts documents that have blank pages
 * in Supabase storage.
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { convertPdfToImages, deleteDocumentPages } from '@/lib/services/pdf-converter';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ReconversionResult {
  documentId: string;
  filename: string;
  success: boolean;
  error?: string;
  beforeAvgSize: number;
  afterAvgSize: number;
}

async function hasBlankPages(userId: string, documentId: string): Promise<{ hasBlank: boolean; avgSize: number }> {
  try {
    const { data: files, error } = await supabase.storage
      .from('document-pages')
      .list(`${userId}/${documentId}`);

    if (error || !files || files.length === 0) {
      return { hasBlank: false, avgSize: 0 };
    }

    const pages = files.filter(f => f.name.startsWith('page-'));
    const totalSize = pages.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
    const avgSize = totalSize / pages.length / 1024; // KB

    // Consider blank if average size < 10 KB
    return {
      hasBlank: avgSize < 10,
      avgSize: parseFloat(avgSize.toFixed(2)),
    };
  } catch (error) {
    console.error(`Error checking blank pages for ${documentId}:`, error);
    return { hasBlank: false, avgSize: 0 };
  }
}

async function downloadPdfFromStorage(userId: string, documentId: string, filename: string, storagePath?: string): Promise<string | null> {
  try {
    // Try multiple possible paths
    const paths = [
      storagePath, // Use storagePath from database if available
      `${userId}/${documentId}/${filename}`,
      `${userId}/${filename}`,
      `pdfs/${userId}/${filename}`,
    ].filter(Boolean) as string[];

    let data: Blob | null = null;
    let error: any = null;

    for (const path of paths) {
      console.log(`   Trying path: ${path}`);
      const result = await supabase.storage
        .from('documents')
        .download(path);
      
      if (!result.error && result.data) {
        data = result.data;
        console.log(`   ✅ Found at: ${path}`);
        break;
      }
      error = result.error;
    }

    if (!data || error) {
      console.error(`Failed to download PDF from any path`);
      return null;
    }

    // Save to temp file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reconvert-'));
    const tempPath = path.join(tempDir, filename);
    
    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    return tempPath;
  } catch (error) {
    console.error(`Error downloading PDF:`, error);
    return null;
  }
}

async function reconvertDocument(documentId: string): Promise<ReconversionResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Reconverting document: ${documentId}`);
  console.log('='.repeat(80));

  try {
    // Get document info
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
        storagePath: true,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.mimeType !== 'application/pdf') {
      throw new Error('Document is not a PDF');
    }

    console.log(`📄 Document: ${document.filename}`);
    console.log(`👤 User: ${document.userId}`);

    // Check current state
    const beforeState = await hasBlankPages(document.userId, documentId);
    console.log(`📊 Current avg page size: ${beforeState.avgSize} KB`);

    // If avgSize is 0, it means no pages exist at all
    const needsConversion = beforeState.avgSize === 0 || beforeState.hasBlank;

    if (!needsConversion) {
      console.log(`✅ Document already has valid pages (avg ${beforeState.avgSize} KB)`);
      return {
        documentId,
        filename: document.filename,
        success: true,
        beforeAvgSize: beforeState.avgSize,
        afterAvgSize: beforeState.avgSize,
      };
    }

    if (beforeState.avgSize === 0) {
      console.log(`⚠️  Document has no pages, converting...`);
    } else {
      console.log(`⚠️  Document has blank pages, reconverting...`);
    }

    // Download PDF from storage
    console.log(`📥 Downloading PDF from storage...`);
    const pdfPath = await downloadPdfFromStorage(
      document.userId,
      documentId,
      document.filename,
      document.storagePath || undefined
    );

    if (!pdfPath) {
      throw new Error('Failed to download PDF from storage');
    }

    try {
      // Delete existing pages
      console.log(`🗑️  Deleting existing pages...`);
      await deleteDocumentPages(document.userId, documentId);

      // Reconvert
      console.log(`🔄 Starting conversion...`);
      const result = await convertPdfToImages({
        documentId,
        userId: document.userId,
        pdfPath,
        quality: 85,
        dpi: 150,
        format: 'jpg',
      });

      if (!result.success) {
        throw new Error(result.error || 'Conversion failed');
      }

      console.log(`✅ Conversion completed in ${result.processingTime}ms`);
      console.log(`📄 Converted ${result.pageCount} pages`);

      // Check new state
      const afterState = await hasBlankPages(document.userId, documentId);
      console.log(`📊 New avg page size: ${afterState.avgSize} KB`);

      if (afterState.hasBlank) {
        console.warn(`⚠️  WARNING: Pages still appear blank after reconversion!`);
      } else {
        console.log(`✅ SUCCESS: Pages now have content`);
      }

      return {
        documentId,
        filename: document.filename,
        success: true,
        beforeAvgSize: beforeState.avgSize,
        afterAvgSize: afterState.avgSize,
      };
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(pdfPath);
        await fs.rmdir(path.dirname(pdfPath));
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.error(`❌ Reconversion failed:`, error);
    return {
      documentId,
      filename: 'unknown',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      beforeAvgSize: 0,
      afterAvgSize: 0,
    };
  }
}

async function reconvertAllBlankDocuments() {
  console.log('\n🔍 Finding documents with blank pages...\n');

  try {
    // Get all PDF documents
    const documents = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        userId: true,
        filename: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${documents.length} PDF documents\n`);

    // Check which ones have blank pages
    const blankDocuments: string[] = [];
    for (const doc of documents) {
      const { hasBlank, avgSize } = await hasBlankPages(doc.userId, doc.id);
      if (hasBlank) {
        console.log(`⚠️  ${doc.filename} (${doc.id}): ${avgSize} KB avg - BLANK`);
        blankDocuments.push(doc.id);
      }
    }

    if (blankDocuments.length === 0) {
      console.log('\n✅ No documents with blank pages found!');
      return;
    }

    console.log(`\n📋 Found ${blankDocuments.length} documents with blank pages`);
    console.log(`\n🔄 Starting reconversion...\n`);

    const results: ReconversionResult[] = [];
    for (const docId of blankDocuments) {
      const result = await reconvertDocument(docId);
      results.push(result);
      
      // Wait a bit between conversions to avoid overload
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RECONVERSION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const improved = successful.filter(r => r.afterAvgSize > r.beforeAvgSize * 2);

    console.log(`Total documents: ${results.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Improved: ${improved.length}\n`);

    if (improved.length > 0) {
      console.log('📈 Improved documents:');
      improved.forEach(r => {
        console.log(`   ${r.filename}`);
        console.log(`      Before: ${r.beforeAvgSize} KB → After: ${r.afterAvgSize} KB`);
      });
      console.log('');
    }

    if (failed.length > 0) {
      console.log('❌ Failed documents:');
      failed.forEach(r => {
        console.log(`   ${r.filename}: ${r.error}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error during reconversion:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const specificDocId = process.argv[2];

if (specificDocId) {
  // Reconvert specific document
  reconvertDocument(specificDocId)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Reconversion completed successfully');
        process.exit(0);
      } else {
        console.error('\n❌ Reconversion failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
} else {
  // Reconvert all blank documents
  reconvertAllBlankDocuments()
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
