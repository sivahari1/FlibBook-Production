#!/usr/bin/env tsx

/**
 * Diagnostic Script: Navigation Stuck Issue
 * 
 * This script diagnoses why scrolling and page navigation are not working
 * in the document viewer.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseNavigationIssue() {
  console.log('🔍 Diagnosing Navigation Stuck Issue...\n');

  try {
    // 1. Check the specific document from the URL
    const documentId = 'cqjaxkl000049uqgl3luxqg0';
    console.log(`📄 Checking document: ${documentId}`);
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
      }
    });

    if (!document) {
      console.log('❌ Document not found!');
      return;
    }

    console.log(`✅ Document found: ${document.title}`);
    console.log(`   Content Type: ${document.contentType}`);
    console.log(`   MIME Type: ${document.mimeType}`);
    console.log(`   Storage Path: ${document.storagePath}`);
    console.log(`   File Size: ${document.fileSize}`);
    console.log('');

    // 2. Check if document has pages (for PDF conversion)
    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' }
    });

    console.log(`📑 Document Pages: ${pages.length} pages found`);
    if (pages.length > 0) {
      console.log(`   First page: ${pages[0].pageUrl}`);
      console.log(`   Last page: ${pages[pages.length - 1].pageUrl}`);
    }
    console.log('');

    // 3. Check bookshop item (since this is a member view)
    const bookshopItem = await prisma.bookShopItem.findFirst({
      where: { documentId },
      include: {
        document: true
      }
    });

    if (bookshopItem) {
      console.log(`🛒 Bookshop Item: ${bookshopItem.title}`);
      console.log(`   Price: ₹${bookshopItem.price}`);
      console.log(`   Category: ${bookshopItem.category}`);
      console.log('');
    }

    // 4. Check member access
    const memberAccess = await prisma.myJstudyroom.findFirst({
      where: { 
        bookShopItemId: bookshopItem?.id,
      },
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    });

    if (memberAccess) {
      console.log(`👤 Member Access: ${memberAccess.user.name}`);
      console.log(`   Access Date: ${memberAccess.createdAt}`);
      console.log('');
    }

    // 5. Diagnostic recommendations
    console.log('🔧 Diagnostic Results:');
    
    if (document.contentType === 'pdf' && pages.length === 0) {
      console.log('⚠️  PDF document has no converted pages - this might cause rendering issues');
      console.log('   Recommendation: Run document conversion');
    }

    if (document.contentType === 'pdf' && document.storagePath) {
      console.log('✅ PDF document should use direct PDF.js rendering');
      console.log('   This should support scrolling and navigation');
    }

    if (!document.storagePath) {
      console.log('❌ Document has no storage path - cannot be viewed');
    }

    // 6. Check for common navigation issues
    console.log('\n🎯 Navigation Issue Checklist:');
    console.log('1. ✅ Overflow settings fixed in SimpleDocumentViewer');
    console.log('2. ✅ Overflow settings fixed in PDFViewerWithPDFJS');
    console.log('3. Check browser console for JavaScript errors');
    console.log('4. Check if PDF URL is accessible');
    console.log('5. Check if PDF.js is loading properly');
    
    // 7. Generate test URL for signed URL
    console.log('\n🔗 Test URLs:');
    console.log(`Member View: /member/view/${documentId}`);
    console.log(`API Signed URL: /api/member/my-jstudyroom/${documentId}/signed-url`);

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseNavigationIssue().catch(console.error);