/**
 * Diagnostic Script: Check for Blank Images in Supabase Storage
 * 
 * This script checks all documents in the database and identifies
 * which ones have suspiciously small images (likely blank pages).
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

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
  avgSizeKB: number;
  suspiciousPages: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  pages: Array<{
    pageNumber: number;
    filename: string;
    sizeKB: number;
    url: string;
    isBlank: boolean;
  }>;
}

async function analyzeDocument(documentId: string): Promise<DocumentAnalysis | null> {
  try {
    // Get document info from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
      },
    });

    if (!document) {
      console.error(`❌ Document ${documentId} not found in database`);
      return null;
    }

    // List all pages in storage
    const { data: files, error } = await supabase.storage
      .from('document-pages')
      .list(`${document.userId}/${documentId}`);

    if (error) {
      console.error(`❌ Failed to list pages for ${documentId}:`, error.message);
      return null;
    }

    if (!files || files.length === 0) {
      console.warn(`⚠️  No pages found for ${documentId}`);
      return null;
    }

    // Analyze each page
    const pages = files
      .filter(f => f.name.startsWith('page-'))
      .map(file => {
        const pageNumber = parseInt(file.name.match(/page-(\d+)/)?.[1] || '0');
        const sizeKB = (file.metadata?.size || 0) / 1024;
        const isBlank = sizeKB < 10; // Files < 10 KB are likely blank

        const { data: urlData } = supabase.storage
          .from('document-pages')
          .getPublicUrl(`${document.userId}/${documentId}/${file.name}`);

        return {
          pageNumber,
          filename: file.name,
          sizeKB: parseFloat(sizeKB.toFixed(2)),
          url: urlData.publicUrl,
          isBlank,
        };
      })
      .sort((a, b) => a.pageNumber - b.pageNumber);

    const totalSizeKB = pages.reduce((sum, p) => sum + p.sizeKB, 0);
    const avgSizeKB = totalSizeKB / pages.length;
    const suspiciousPages = pages.filter(p => p.isBlank).length;

    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (suspiciousPages > 0) {
      status = suspiciousPages === pages.length ? 'CRITICAL' : 'WARNING';
    }

    return {
      documentId,
      filename: document.filename,
      userId: document.userId,
      pageCount: pages.length,
      totalSizeKB: parseFloat(totalSizeKB.toFixed(2)),
      avgSizeKB: parseFloat(avgSizeKB.toFixed(2)),
      suspiciousPages,
      status,
      pages,
    };
  } catch (error) {
    console.error(`❌ Error analyzing document ${documentId}:`, error);
    return null;
  }
}

async function analyzeAllDocuments() {
  console.log('\n🔍 Analyzing all documents for blank images...\n');

  try {
    // Get all PDF documents
    const documents = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        filename: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${documents.length} PDF documents\n`);

    const results: DocumentAnalysis[] = [];
    let criticalCount = 0;
    let warningCount = 0;
    let okCount = 0;

    for (const doc of documents) {
      const analysis = await analyzeDocument(doc.id);
      if (analysis) {
        results.push(analysis);
        
        if (analysis.status === 'CRITICAL') criticalCount++;
        else if (analysis.status === 'WARNING') warningCount++;
        else okCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log(`Total documents analyzed: ${results.length}`);
    console.log(`✅ OK: ${okCount} documents`);
    console.log(`⚠️  WARNING: ${warningCount} documents (some blank pages)`);
    console.log(`🚨 CRITICAL: ${criticalCount} documents (all pages blank)\n`);

    // Print critical documents
    if (criticalCount > 0) {
      console.log('🚨 CRITICAL DOCUMENTS (All pages blank):');
      console.log('-'.repeat(80));
      results
        .filter(r => r.status === 'CRITICAL')
        .forEach(doc => {
          console.log(`\n📄 ${doc.filename}`);
          console.log(`   ID: ${doc.documentId}`);
          console.log(`   Pages: ${doc.pageCount}`);
          console.log(`   Avg size: ${doc.avgSizeKB} KB`);
          console.log(`   Status: ALL PAGES BLANK`);
        });
      console.log('\n');
    }

    // Print warning documents
    if (warningCount > 0) {
      console.log('⚠️  WARNING DOCUMENTS (Some blank pages):');
      console.log('-'.repeat(80));
      results
        .filter(r => r.status === 'WARNING')
        .forEach(doc => {
          console.log(`\n📄 ${doc.filename}`);
          console.log(`   ID: ${doc.documentId}`);
          console.log(`   Pages: ${doc.pageCount}`);
          console.log(`   Blank pages: ${doc.suspiciousPages}/${doc.pageCount}`);
          console.log(`   Avg size: ${doc.avgSizeKB} KB`);
          
          // Show which pages are blank
          const blankPages = doc.pages
            .filter(p => p.isBlank)
            .map(p => p.pageNumber)
            .join(', ');
          console.log(`   Blank page numbers: ${blankPages}`);
        });
      console.log('\n');
    }

    // Detailed report for specific document if provided
    const specificDocId = process.argv[2];
    if (specificDocId) {
      console.log('\n' + '='.repeat(80));
      console.log(`📋 DETAILED REPORT FOR: ${specificDocId}`);
      console.log('='.repeat(80) + '\n');

      const analysis = results.find(r => r.documentId === specificDocId);
      if (analysis) {
        console.log(`Document: ${analysis.filename}`);
        console.log(`Status: ${analysis.status}`);
        console.log(`Total pages: ${analysis.pageCount}`);
        console.log(`Total size: ${analysis.totalSizeKB} KB`);
        console.log(`Average size: ${analysis.avgSizeKB} KB`);
        console.log(`Suspicious pages: ${analysis.suspiciousPages}\n`);

        console.log('Pages:');
        console.log('-'.repeat(80));
        analysis.pages.forEach(page => {
          const status = page.isBlank ? '🚨 BLANK' : '✅ OK';
          console.log(`${status} Page ${page.pageNumber}: ${page.sizeKB} KB`);
          console.log(`   ${page.url}`);
        });
      } else {
        console.log(`Document ${specificDocId} not found in analysis results`);
      }
    }

    // Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS');
    console.log('='.repeat(80) + '\n');

    if (criticalCount > 0 || warningCount > 0) {
      console.log('To fix blank pages, you need to reconvert the affected documents:');
      console.log('\n1. Use the reconversion script:');
      console.log('   npm run reconvert-document <documentId>');
      console.log('\n2. Or reconvert all affected documents:');
      console.log('   npm run reconvert-all-blank');
      console.log('\n3. Verify the fix:');
      console.log('   npm run diagnose-blank-images <documentId>');
    } else {
      console.log('✅ All documents look good! No blank pages detected.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeAllDocuments().catch(console.error);
