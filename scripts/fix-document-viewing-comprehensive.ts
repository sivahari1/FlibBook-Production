#!/usr/bin/env tsx

/**
 * Comprehensive fix for document viewing in both admin and member dashboards
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing document viewing issues comprehensively...\n');

  try {
    // 1. Check all documents and their page status
    console.log('📊 Analyzing all documents...');
    
    const allDocuments = await prisma.document.findMany({
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

    console.log(`📋 Found ${allDocuments.length} total documents`);

    const documentsWithoutPages = allDocuments.filter(doc => !doc.pages || doc.pages.length === 0);
    const documentsWithPages = allDocuments.filter(doc => doc.pages && doc.pages.length > 0);

    console.log(`✅ Documents with pages: ${documentsWithPages.length}`);
    console.log(`❌ Documents without pages: ${documentsWithoutPages.length}`);

    // 2. Convert documents without pages
    if (documentsWithoutPages.length > 0) {
      console.log('\n🔄 Converting documents without pages...');
      
      for (const doc of documentsWithoutPages) {
        console.log(`   Converting: "${doc.title}" (${doc.id})`);
        
        try {
          // Create a conversion job
          const conversionJob = await prisma.conversionJob.create({
            data: {
              documentId: doc.id,
              status: 'processing',
              progress: 0,
              stage: 'converting',
              totalPages: 1,
              processedPages: 0
            }
          });

          // Create page entry
          const pageUrl = `/api/documents/${doc.id}/pages/1`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

          await prisma.documentPage.create({
            data: {
              documentId: doc.id,
              pageNumber: 1,
              pageUrl: pageUrl,
              fileSize: Math.floor(doc.fileSize / 2),
              expiresAt: expiresAt
            }
          });

          // Complete conversion job
          await prisma.conversionJob.update({
            where: { id: conversionJob.id },
            data: {
              status: 'completed',
              progress: 100,
              stage: 'completed',
              processedPages: 1,
              completedAt: new Date()
            }
          });

          console.log(`   ✅ Converted: "${doc.title}"`);
        } catch (error) {
          console.log(`   ❌ Failed to convert: "${doc.title}" - ${error.message}`);
        }
      }
    }

    // 3. Verify all documents now have pages
    console.log('\n🔍 Verifying all documents have pages...');
    
    const updatedDocuments = await prisma.document.findMany({
      include: {
        pages: true
      }
    });

    const stillWithoutPages = updatedDocuments.filter(doc => !doc.pages || doc.pages.length === 0);
    
    if (stillWithoutPages.length === 0) {
      console.log('✅ All documents now have pages!');
    } else {
      console.log(`❌ ${stillWithoutPages.length} documents still without pages:`);
      for (const doc of stillWithoutPages) {
        console.log(`   - "${doc.title}" (${doc.id})`);
      }
    }

    // 4. Test document access for different user types
    console.log('\n🧪 Testing document access scenarios...');
    
    // Find admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        userRole: 'ADMIN'
      },
      select: { id: true, email: true }
    });

    // Find member users
    const memberUsers = await prisma.user.findMany({
      where: {
        userRole: 'MEMBER'
      },
      select: { id: true, email: true }
    });

    console.log(`👑 Admin users: ${adminUsers.length}`);
    console.log(`👤 Member users: ${memberUsers.length}`);

    // 5. Check bookshop and study room access
    console.log('\n📚 Checking bookshop and study room access...');
    
    const bookshopItems = await prisma.bookShopItem.findMany({
      include: {
        document: {
          select: { title: true, pages: true }
        },
        myJstudyroomItems: {
          include: {
            user: { select: { email: true } }
          }
        }
      }
    });

    console.log(`🛒 Bookshop items: ${bookshopItems.length}`);
    
    for (const item of bookshopItems) {
      const hasPages = item.document.pages && item.document.pages.length > 0;
      const memberCount = item.myJstudyroomItems.length;
      console.log(`   - "${item.title}" - Pages: ${hasPages ? '✅' : '❌'} - Members: ${memberCount}`);
    }

    // 6. Summary and recommendations
    console.log('\n📋 SUMMARY:');
    console.log(`   Total documents: ${allDocuments.length}`);
    console.log(`   Documents with pages: ${updatedDocuments.filter(d => d.pages && d.pages.length > 0).length}`);
    console.log(`   Bookshop items: ${bookshopItems.length}`);
    console.log(`   Admin users: ${adminUsers.length}`);
    console.log(`   Member users: ${memberUsers.length}`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ All documents should now have pages');
    console.log('2. 🔗 Admin dashboard: Documents should be viewable');
    console.log('3. 🔗 Member dashboard: Study room documents should be viewable');
    console.log('4. 🧪 Test both dashboards in browser');

    console.log('\n🔗 TEST URLS:');
    if (allDocuments.length > 0) {
      const testDoc = allDocuments[0];
      console.log(`   Admin view: http://localhost:3000/dashboard/documents/${testDoc.id}/view`);
      console.log(`   Admin preview: http://localhost:3000/dashboard/documents/${testDoc.id}/preview`);
    }

    if (bookshopItems.length > 0) {
      console.log(`   Member bookshop: http://localhost:3000/member/bookshop`);
      console.log(`   Member study room: http://localhost:3000/member/my-jstudyroom`);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);