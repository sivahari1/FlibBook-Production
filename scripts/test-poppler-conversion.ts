#!/usr/bin/env tsx

/**
 * Test script to verify Poppler PDF conversion
 */

import { convertPdfToImages } from '@/lib/services/pdf-converter';
import { prisma } from '@/lib/db';

async function testPopplerConversion() {
  console.log('🧪 Testing Poppler PDF conversion...\n');

  try {
    // ✅ Optional CLI arg: documentId
    // Usage:
    // npx dotenv -e .env.local -- npx tsx scripts/test-poppler-conversion.ts <DOCUMENT_ID>
    const documentIdArg = process.argv[2];

    // Find a PDF document to test with (by ID if provided, else first PDF)
    const document = documentIdArg
      ? await prisma.document.findUnique({
          where: { id: documentIdArg },
          select: { id: true, userId: true, storagePath: true, title: true },
        })
      : await prisma.document.findFirst({
          where: { contentType: 'PDF' },
          select: { id: true, userId: true, storagePath: true, title: true },
        });

    if (!document) {
      if (documentIdArg) {
        console.error('❌ Document not found:', documentIdArg);
        console.log(
          'ℹ️ Usage: npx dotenv -e .env.local -- npx tsx scripts/test-poppler-conversion.ts <DOCUMENT_ID>'
        );
      } else {
        console.log('❌ No PDF documents found in database');
      }
      return;
    }

    console.log('📄 Testing with document:', {
      id: document.id,
      title: document.title,
      storagePath: document.storagePath,
    });

    // Test conversion
    console.log('\n🔄 Starting conversion with Poppler...');
    const startTime = Date.now();

    const result = await convertPdfToImages({
      documentId: document.id,
      userId: document.userId,
      pdfPath: document.storagePath,
      quality: 85,
      dpi: 200,
      format: 'jpg',
    });

    const duration = Date.now() - startTime;

    console.log('\n✅ Conversion completed!');
    console.log('📊 Results:', {
      success: result.success,
      pageCount: result.pageCount,
      processingTime: `${duration}ms`,
      avgTimePerPage:
        result.pageCount > 0 ? `${Math.round(duration / result.pageCount)}ms` : 'N/A',
    });

    if (result.success) {
      console.log('\n🖼️ Generated page URLs:');
      result.pageUrls.forEach((url, index) => {
        console.log(`  Page ${index + 1}: ${url}`);
      });

      console.log('\n🎉 SUCCESS: Poppler conversion is working!');
      console.log('Expected: non-blank page typically > 20KB (often much larger)');
    } else {
      console.log('\n❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPopplerConversion().catch(console.error);
