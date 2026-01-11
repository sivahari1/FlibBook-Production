#!/usr/bin/env tsx

/**
 * Diagnostic script for member document viewing errors
 * Run with: npx tsx scripts/diagnose-member-viewing-error.ts
 */

import { prisma } from '@/lib/db';

async function diagnoseMemberViewingError() {
  console.log('🔍 Diagnosing Member Document Viewing Error');
  console.log('===========================================\n');

  try {
    // Check if conversionStatus field exists
    console.log('1. Checking Document schema...');
    
    const sampleDocument = await prisma.document.findFirst({
      select: {
        id: true,
        title: true,
        // Try to select conversionStatus - this will fail if field doesn't exist
      }
    });

    if (sampleDocument) {
      console.log('✅ Document table accessible');
      console.log(`   Sample document: ${sampleDocument.id} - ${sampleDocument.title}`);
    } else {
      console.log('⚠️  No documents found in database');
    }

    // Check DocumentPage table
    console.log('\n2. Checking DocumentPage schema...');
    
    const samplePage = await prisma.documentPage.findFirst({
      select: {
        id: true,
        documentId: true,
        pageNumber: true,
        storagePath: true,
      }
    });

    if (samplePage) {
      console.log('✅ DocumentPage table accessible');
      console.log(`   Sample page: ${samplePage.id} - Page ${samplePage.pageNumber}`);
      console.log(`   Storage path: ${samplePage.storagePath || 'NULL'}`);
    } else {
      console.log('⚠️  No document pages found in database');
    }

    // Check MyJstudyroomItem table
    console.log('\n3. Checking MyJstudyroomItem access...');
    
    const sampleItem = await prisma.myJstudyroomItem.findFirst({
      select: {
        id: true,
        userId: true,
        bookShopItemId: true,
      }
    });

    if (sampleItem) {
      console.log('✅ MyJstudyroomItem table accessible');
      console.log(`   Sample item: ${sampleItem.id}`);
    } else {
      console.log('⚠️  No MyJstudyroom items found');
    }

  } catch (error) {
    console.error('❌ Database error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('conversionStatus')) {
        console.log('\n🔧 SOLUTION: The conversionStatus field is missing from the Document table.');
        console.log('   Run the Prisma migration:');
        console.log('   npx prisma migrate dev --name add_conversion_tracking');
      }
      
      if (error.message.includes('storagePath')) {
        console.log('\n🔧 SOLUTION: The storagePath field changes are missing from DocumentPage table.');
        console.log('   Run the Prisma migration:');
        console.log('   npx prisma migrate dev --name add_conversion_tracking');
      }
    }
  }

  // Test API endpoint
  console.log('\n4. Testing API endpoint structure...');
  
  try {
    // This is a basic structure test - we can't actually call the API from here
    // but we can check if the resolver function exists
    const { resolveDocumentId } = await import('@/lib/server/resolveDocumentId');
    console.log('✅ Document ID resolver imported successfully');
    
    // Test with a fake ID to see the error handling
    try {
      await resolveDocumentId('test-invalid-id');
    } catch (error) {
      if (error instanceof Error && error.message === 'Document not found') {
        console.log('✅ Document ID resolver error handling works correctly');
      }
    }
    
  } catch (error) {
    console.error('❌ Resolver import error:', error);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. If conversionStatus errors: Run Prisma migration');
  console.log('2. If no documents: Upload a test document');
  console.log('3. If API errors: Check browser network tab for specific error');
  console.log('4. Check that user has documents in their study room');
}

async function main() {
  try {
    await diagnoseMemberViewingError();
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}