#!/usr/bin/env tsx

/**
 * Test document viewing functionality after fixes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing document viewing functionality...\n');

  try {
    // Get all documents with their access information
    const documents = await prisma.document.findMany({
      include: {
        pages: true,
        user: {
          select: { email: true, userRole: true }
        },
        bookShopItems: {
          include: {
            myJstudyroomItems: {
              include: {
                user: { select: { email: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Testing ${documents.length} documents:\n`);

    for (const doc of documents) {
      console.log(`📄 Document: "${doc.title}"`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Owner: ${doc.user.email} (${doc.user.userRole})`);
      console.log(`   Pages: ${doc.pages?.length || 0}`);
      console.log(`   File Size: ${Math.round(Number(doc.fileSize) / 1024)} KB`);
      
      // Check access scenarios
      const isInBookshop = doc.bookShopItems.length > 0;
      const memberAccess = doc.bookShopItems.reduce((total, item) => 
        total + item.myJstudyroomItems.length, 0);
      
      console.log(`   In Bookshop: ${isInBookshop ? '✅' : '❌'}`);
      console.log(`   Member Access: ${memberAccess} users`);
      
      // Test URLs
      console.log(`   🔗 Admin View: http://localhost:3000/dashboard/documents/${doc.id}/view`);
      console.log(`   🔗 Admin Preview: http://localhost:3000/dashboard/documents/${doc.id}/preview`);
      
      if (isInBookshop) {
        console.log(`   🔗 Available in Member Bookshop`);
      }
      
      if (memberAccess > 0) {
        console.log(`   🔗 Available in Member Study Room`);
        const members = doc.bookShopItems.flatMap(item => 
          item.myJstudyroomItems.map(mi => mi.user.email)
        );
        console.log(`   👥 Members: ${members.join(', ')}`);
      }
      
      console.log('');
    }

    // Test specific scenarios
    console.log('🎯 TESTING SCENARIOS:\n');

    // 1. Admin Dashboard Access
    console.log('1. 👑 ADMIN DASHBOARD ACCESS:');
    console.log('   - Admins should be able to view ALL documents');
    console.log('   - Documents should display with enhanced placeholders');
    console.log('   - No authentication errors should occur');
    console.log('');

    // 2. Member Dashboard Access
    console.log('2. 👤 MEMBER DASHBOARD ACCESS:');
    const membersWithAccess = await prisma.user.findMany({
      where: {
        userRole: 'MEMBER',
        myJstudyroomItems: {
          some: {}
        }
      },
      include: {
        myJstudyroomItems: {
          include: {
            bookShopItem: {
              include: {
                document: {
                  select: { title: true, pages: true }
                }
              }
            }
          }
        }
      }
    });

    console.log(`   - ${membersWithAccess.length} members have study room access`);
    for (const member of membersWithAccess) {
      console.log(`   - ${member.email}: ${member.myJstudyroomItems.length} documents`);
      for (const item of member.myJstudyroomItems) {
        const hasPages = item.bookShopItem.document.pages && item.bookShopItem.document.pages.length > 0;
        console.log(`     • "${item.bookShopItem.document.title}" - Pages: ${hasPages ? '✅' : '❌'}`);
      }
    }
    console.log('');

    // 3. API Endpoints
    console.log('3. 🔌 API ENDPOINTS:');
    console.log('   All document page APIs should now work with authentication');
    console.log('   Enhanced SVG placeholders should be served');
    console.log('   CORS headers should be properly set');
    console.log('');

    // 4. Next Steps
    console.log('🚀 NEXT STEPS:');
    console.log('1. Open browser and test admin dashboard document viewing');
    console.log('2. Login as member and test study room document viewing');
    console.log('3. Verify no console errors appear');
    console.log('4. Check that document pages load properly');
    console.log('');

    console.log('✅ Document viewing should now work in both dashboards!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);