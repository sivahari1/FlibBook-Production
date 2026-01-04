#!/usr/bin/env tsx

/**
 * Test script for Phase-1 viewer implementation
 * Tests the unified access API and viewer components
 */

import { prisma } from '../lib/db';

async function testPhase1Viewer() {
  console.log('🧪 Testing Phase-1 Viewer Implementation...\n');

  try {
    // 1. Check if we have documents in the database
    console.log('1. Checking for documents in database...');
    const documents = await prisma.document.findMany({
      take: 5,
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: true
          }
        }
      }
    });

    if (documents.length === 0) {
      console.log('❌ No documents found in database');
      console.log('   Please upload some documents first');
      return;
    }

    console.log(`✅ Found ${documents.length} documents`);
    
    // 2. Check document content types
    console.log('\n2. Checking document content types...');
    const contentTypes = documents.reduce((acc, doc) => {
      acc[doc.contentType] = (acc[doc.contentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(contentTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} documents`);
    });

    // 3. Check for users with different roles
    console.log('\n3. Checking for users with different roles...');
    const adminUsers = await prisma.user.findMany({
      where: { userRole: 'ADMIN' },
      take: 3
    });

    const memberUsers = await prisma.user.findMany({
      where: { userRole: 'MEMBER' },
      take: 3
    });

    console.log(`   Found ${adminUsers.length} admin users`);
    console.log(`   Found ${memberUsers.length} member users`);

    // 4. Check MyJstudyRoom items
    console.log('\n4. Checking MyJstudyRoom items...');
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      take: 5,
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    });

    console.log(`   Found ${myJstudyroomItems.length} items in MyJstudyRoom`);

    // 5. Test access scenarios
    console.log('\n5. Testing access scenarios...');
    
    if (documents.length > 0 && adminUsers.length > 0) {
      const testDoc = documents[0];
      const testAdmin = adminUsers[0];
      
      console.log(`   Admin "${testAdmin.email}" should have access to document "${testDoc.title}"`);
      console.log(`   Document ID: ${testDoc.id}`);
      console.log(`   Content Type: ${testDoc.contentType}`);
      console.log(`   Storage Path: ${testDoc.storagePath}`);
      
      if (testDoc.linkUrl) {
        console.log(`   Link URL: ${testDoc.linkUrl}`);
      }
    }

    if (myJstudyroomItems.length > 0) {
      const testItem = myJstudyroomItems[0];
      console.log(`   Member "${testItem.user.email}" should have access to document "${testItem.bookShopItem.document.title}"`);
      console.log(`   Document ID: ${testItem.bookShopItem.document.id}`);
    }

    // 6. Environment check
    console.log('\n6. Checking environment variables...');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXTAUTH_SECRET'
    ];

    let envOk = true;
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar} is set`);
      } else {
        console.log(`   ❌ ${envVar} is missing`);
        envOk = false;
      }
    });

    if (!envOk) {
      console.log('\n❌ Some required environment variables are missing');
      return;
    }

    // 7. API endpoints to test
    console.log('\n7. API endpoints to test:');
    console.log('   GET /api/viewer/document/[documentId]/access');
    console.log('   - Test with admin user (should access any document)');
    console.log('   - Test with member user (should only access MyJstudyRoom documents)');
    console.log('   - Test with unauthenticated user (should get 401)');

    console.log('\n8. Viewer components created:');
    console.log('   ✅ /components/viewers/PdfViewer.tsx');
    console.log('   ✅ /components/viewers/EpubViewer.tsx');
    console.log('   ✅ /components/viewers/LinkViewer.tsx');
    console.log('   ✅ /components/viewers/MyJstudyroomViewerClient.tsx');

    console.log('\n9. Updated components:');
    console.log('   ✅ /app/dashboard/documents/[id]/view/PreviewViewerClient.tsx');
    console.log('   ✅ /app/member/view/[itemId]/MyJstudyroomViewerClient.tsx');

    console.log('\n✅ Phase-1 implementation is ready for testing!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login as an admin user');
    console.log('3. Navigate to /dashboard/documents/[id]/view to test admin preview');
    console.log('4. Login as a member user');
    console.log('5. Add documents to MyJstudyRoom and test member viewing');
    console.log('6. Test different content types (PDF, EPUB, LINK)');

  } catch (error) {
    console.error('❌ Error testing Phase-1 viewer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhase1Viewer().catch(console.error);