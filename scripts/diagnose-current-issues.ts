#!/usr/bin/env tsx

/**
 * Diagnostic script to check for current issues in the jStudyRoom document viewer
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing current jStudyRoom document viewer issues...\n');

  try {
    // 1. Check database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connection successful\n');

    // 2. Check for test documents in jStudyRoom
    console.log('2. Checking jStudyRoom documents...');
    const jstudyroomDocs = await prisma.bookShopItem.findMany({
      include: {
        document: {
          include: {
            pages: true
          }
        }
      },
      take: 5
    });

    console.log(`   Found ${jstudyroomDocs.length} documents in bookshop`);
    
    for (const item of jstudyroomDocs) {
      if (item.document) {
        const pageCount = item.document.pages?.length || 0;
        console.log(`   - ${item.title}: ${pageCount} pages (ID: ${item.document.id})`);
      }
    }
    console.log('');

    // 3. Check member access to documents
    console.log('3. Checking member access...');
    const memberAccess = await prisma.myJstudyroomItem.findMany({
      include: {
        user: {
          select: { email: true }
        },
        bookShopItem: {
          select: { title: true, documentId: true }
        }
      },
      take: 5
    });

    console.log(`   Found ${memberAccess.length} member access records`);
    for (const access of memberAccess) {
      console.log(`   - ${access.user.email} -> ${access.bookShopItem.title}`);
    }
    console.log('');

    // 4. Check API endpoints
    console.log('4. Testing API endpoints...');
    
    // Test member pages API
    if (jstudyroomDocs.length > 0 && jstudyroomDocs[0].documentId) {
      const testDocId = jstudyroomDocs[0].documentId;
      console.log(`   Testing member pages API for document: ${testDocId}`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${testDocId}/pages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Member pages API working - ${data.pages?.length || 0} pages returned`);
        } else {
          console.log(`   ❌ Member pages API error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ Member pages API error: ${error.message}`);
      }
    }
    console.log('');

    // 5. Check for common error patterns
    console.log('5. Checking for common issues...');
    
    // Check for documents without pages
    const docsWithoutPages = await prisma.document.findMany({
      where: {
        pages: {
          none: {}
        }
      },
      take: 5
    });
    
    if (docsWithoutPages.length > 0) {
      console.log(`   ⚠️  Found ${docsWithoutPages.length} documents without pages:`);
      for (const doc of docsWithoutPages) {
        console.log(`      - ${doc.title} (ID: ${doc.id})`);
      }
    } else {
      console.log('   ✅ All documents have pages');
    }
    console.log('');

    // 6. Summary
    console.log('📋 Summary:');
    console.log(`   - Database: Connected`);
    console.log(`   - Bookshop documents: ${jstudyroomDocs.length}`);
    console.log(`   - Member access records: ${memberAccess.length}`);
    console.log(`   - Documents without pages: ${docsWithoutPages.length}`);
    
    if (docsWithoutPages.length === 0 && jstudyroomDocs.length > 0 && memberAccess.length > 0) {
      console.log('\n✅ No obvious issues detected. The system appears to be working correctly.');
      console.log('\nTo test the viewer:');
      console.log('1. Start the development server: npm run dev');
      console.log('2. Login as a member (e.g., sivaramj83@gmail.com)');
      console.log('3. Navigate to Member Dashboard > My jStudyRoom');
      console.log('4. Click "View" on any document');
      console.log('5. Check browser console for any errors');
    } else {
      console.log('\n⚠️  Some issues detected that may need attention.');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);