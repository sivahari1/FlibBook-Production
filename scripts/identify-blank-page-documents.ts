#!/usr/bin/env tsx
/**
 * Identify Documents with Blank Pages
 * 
 * This script identifies documents that likely have blank pages by analyzing
 * page file sizes in Supabase storage. Documents with average page sizes < 10 KB
 * are flagged as potentially having blank pages.
 * 
 * Usage: npm run identify-blank-pages
 * 
 * Requirements: 2.5
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DocumentAnalysis {
  documentId: string;
  filename: string;
  userId: string;
  pageCount: number;
  totalSizeKB: number;
  averageSizeKB: number;
  suspiciousPages: number;
  status: string;
  createdAt: Date;
  lastAccessed?: Date;
}

/**
 * Analyze a single document's page sizes
 */
async function analyzeDocument(documentId: string, userId: string): Promise<DocumentAnalysis | null> {
  try {
    // Get document info from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        filename: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        pages: {
          select: {
            pageNumber: true,
            fileSize: true,
          },
        },
      },
    });

    if (!document) {
      logger.warn(`Document ${documentId} not found in database`);
      return null;
    }

    if (!document.pages || document.pages.length === 0) {
      logger.warn(`No pages found for document ${documentId}`);
      return null;
    }

    // Calculate statistics from DocumentPage records
    const totalSize = document.pages.reduce((sum, page) => sum + page.fileSize, 0);
    const averageSize = totalSize / document.pages.length;
    const suspiciousPages = document.pages.filter(page => page.fileSize < 10000).length;

    return {
      documentId: document.id,
      filename: document.filename,
      userId: document.userId,
      pageCount: document.pages.length,
      totalSizeKB: totalSize / 1024,
      averageSizeKB: averageSize / 1024,
      suspiciousPages,
      status: 'processed', // Assume processed if pages exist
      createdAt: document.createdAt,
      lastAccessed: document.updatedAt,
    };
  } catch (error) {
    logger.error(`Error analyzing document ${documentId}:`, error);
    return null;
  }
}

/**
 * Get all documents that need analysis
 */
async function getAllDocuments(): Promise<Array<{ id: string; userId: string }>> {
  try {
    const documents = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
        pages: {
          some: {}, // Only documents that have pages
        },
      },
      select: {
        id: true,
        userId: true,
      },
      orderBy: {
        updatedAt: 'desc', // Most recently accessed first
      },
    });

    return documents;
  } catch (error) {
    logger.error('Failed to fetch documents:', error);
    return [];
  }
}

/**
 * Main identification function
 */
async function identifyBlankPageDocuments(): Promise<void> {
  console.log('🔍 Identifying documents with blank pages...\n');
  console.log('=' .repeat(80));

  // Get all processed PDF documents
  const documents = await getAllDocuments();
  console.log(`\n📊 Found ${documents.length} processed PDF documents to analyze\n`);

  if (documents.length === 0) {
    console.log('✅ No documents to analyze');
    return;
  }

  // Analyze each document
  const analyses: DocumentAnalysis[] = [];
  let analyzed = 0;
  let failed = 0;

  for (const doc of documents) {
    process.stdout.write(`\rAnalyzing: ${analyzed + failed + 1}/${documents.length}`);
    
    const analysis = await analyzeDocument(doc.id, doc.userId);
    
    if (analysis) {
      analyses.push(analysis);
      analyzed++;
    } else {
      failed++;
    }
  }

  console.log(`\n\n✅ Analysis complete: ${analyzed} analyzed, ${failed} failed\n`);

  // Filter documents with potential blank pages
  const blankPageDocuments = analyses.filter(a => a.averageSizeKB < 10);
  const suspiciousDocuments = analyses.filter(a => a.averageSizeKB >= 10 && a.averageSizeKB < 30);
  const healthyDocuments = analyses.filter(a => a.averageSizeKB >= 30);

  // Display results
  console.log('=' .repeat(80));
  console.log('\n📈 SUMMARY\n');
  console.log(`Total documents analyzed: ${analyses.length}`);
  console.log(`❌ Blank pages (< 10 KB avg): ${blankPageDocuments.length}`);
  console.log(`⚠️  Suspicious (10-30 KB avg): ${suspiciousDocuments.length}`);
  console.log(`✅ Healthy (> 30 KB avg): ${healthyDocuments.length}`);

  // Display blank page documents
  if (blankPageDocuments.length > 0) {
    console.log('\n' + '=' .repeat(80));
    console.log('\n❌ DOCUMENTS WITH BLANK PAGES (< 10 KB average)\n');
    console.log('These documents MUST be reconverted:\n');

    blankPageDocuments
      .sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))
      .forEach((doc, index) => {
        console.log(`${index + 1}. Document ID: ${doc.documentId}`);
        console.log(`   Filename: ${doc.filename}`);
        console.log(`   Pages: ${doc.pageCount}`);
        console.log(`   Average size: ${doc.averageSizeKB.toFixed(2)} KB`);
        console.log(`   Suspicious pages: ${doc.suspiciousPages}/${doc.pageCount}`);
        console.log(`   Last accessed: ${doc.lastAccessed?.toISOString() || 'Never'}`);
        console.log('');
      });

    // Export to file for batch processing
    const exportData = blankPageDocuments.map(doc => ({
      documentId: doc.documentId,
      filename: doc.filename,
      userId: doc.userId,
      averageSizeKB: doc.averageSizeKB,
      suspiciousPages: doc.suspiciousPages,
      pageCount: doc.pageCount,
    }));

    const fs = await import('fs');
    const exportPath = 'blank-page-documents.json';
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📄 Exported blank page document list to: ${exportPath}\n`);
  }

  // Display suspicious documents
  if (suspiciousDocuments.length > 0) {
    console.log('=' .repeat(80));
    console.log('\n⚠️  SUSPICIOUS DOCUMENTS (10-30 KB average)\n');
    console.log('These documents should be manually inspected:\n');

    suspiciousDocuments
      .sort((a, b) => a.averageSizeKB - b.averageSizeKB)
      .slice(0, 10) // Show top 10
      .forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.filename} (${doc.documentId})`);
        console.log(`   Average: ${doc.averageSizeKB.toFixed(2)} KB, Suspicious: ${doc.suspiciousPages}/${doc.pageCount}`);
      });

    if (suspiciousDocuments.length > 10) {
      console.log(`\n   ... and ${suspiciousDocuments.length - 10} more`);
    }
    console.log('');
  }

  // Display statistics
  console.log('=' .repeat(80));
  console.log('\n📊 DETAILED STATISTICS\n');

  const allSizes = analyses.map(a => a.averageSizeKB);
  const minSize = Math.min(...allSizes);
  const maxSize = Math.max(...allSizes);
  const avgSize = allSizes.reduce((sum, size) => sum + size, 0) / allSizes.length;
  const medianSize = allSizes.sort((a, b) => a - b)[Math.floor(allSizes.length / 2)];

  console.log(`Minimum average page size: ${minSize.toFixed(2)} KB`);
  console.log(`Maximum average page size: ${maxSize.toFixed(2)} KB`);
  console.log(`Mean average page size: ${avgSize.toFixed(2)} KB`);
  console.log(`Median average page size: ${medianSize.toFixed(2)} KB`);

  const totalSuspiciousPages = analyses.reduce((sum, a) => sum + a.suspiciousPages, 0);
  const totalPages = analyses.reduce((sum, a) => sum + a.pageCount, 0);
  console.log(`\nTotal pages: ${totalPages}`);
  console.log(`Suspicious pages: ${totalSuspiciousPages} (${((totalSuspiciousPages / totalPages) * 100).toFixed(2)}%)`);

  // Recommendations
  console.log('\n' + '=' .repeat(80));
  console.log('\n💡 RECOMMENDATIONS\n');

  if (blankPageDocuments.length > 0) {
    console.log(`1. Reconvert ${blankPageDocuments.length} documents with blank pages`);
    console.log('   Command: npm run reconvert-blank-pages');
    console.log('');
  }

  if (suspiciousDocuments.length > 0) {
    console.log(`2. Manually inspect ${Math.min(suspiciousDocuments.length, 10)} suspicious documents`);
    console.log('   Use: npm run verify-pdf <documentId>');
    console.log('');
  }

  console.log('3. Monitor conversion logs for future uploads');
  console.log('   Look for: "PNG buffer: X KB" messages');
  console.log('');

  console.log('=' .repeat(80));
}

/**
 * Main execution
 */
if (require.main === module) {
  identifyBlankPageDocuments()
    .then(() => {
      console.log('\n✅ Identification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Identification failed:', error);
      process.exit(1);
    });
}

export { identifyBlankPageDocuments, analyzeDocument };
