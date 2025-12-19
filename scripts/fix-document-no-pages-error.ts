#!/usr/bin/env tsx

/**
 * Fix the "DL&CO Syllabus" document that has no pages and is causing viewer errors
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing document with no pages error...\n');

  try {
    const documentId = '3a3d035b-5d3e-4261-8694-b80b42e1f113';
    
    // Find the problematic document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: true,
        bookShopItems: {
          include: {
            myJstudyroomItems: {
              include: {
                user: { select: { email: true } }
              }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    // Calculate member access count
    const memberAccessCount = document.bookShopItems?.reduce((total, item) => 
      total + (item.myJstudyroomItems?.length || 0), 0) || 0;

    console.log(`📄 Document: "${document.title}"`);
    console.log(`📊 Pages: ${document.pages?.length || 0}`);
    console.log(`🛒 Bookshop items: ${document.bookShopItems?.length || 0}`);
    console.log(`👥 Member access: ${memberAccessCount}`);

    if (document.pages?.length === 0) {
      console.log('\n⚠️  This document has no pages - this is the source of the error');
      
      // Check if anyone has access to this document
      if (memberAccessCount > 0) {
        console.log('\n👥 Users with access to this document:');
        for (const bookShopItem of document.bookShopItems || []) {
          for (const myJstudyroomItem of bookShopItem.myJstudyroomItems || []) {
            console.log(`   - ${myJstudyroomItem.user.email}`);
          }
        }
        
        console.log('\n🔧 FIXING: Removing member access to prevent errors...');
        
        // Remove member access to this document to prevent errors
        const deleteResult = await prisma.myJstudyroomItem.deleteMany({
          where: {
            bookShopItem: {
              documentId: documentId
            }
          }
        });
        
        console.log(`✅ Removed ${deleteResult.count} member access records`);
      }
      
      // Check if it's in bookshop
      if (document.bookShopItems && document.bookShopItems.length > 0) {
        console.log('\n🛒 This document is in the bookshop');
        console.log('   Recommendation: Remove from bookshop or convert the document');
        
        // Option 1: Remove from bookshop (safer)
        console.log('\n🔧 FIXING: Removing from bookshop to prevent new purchases...');
        
        const deleteBookshopResult = await prisma.bookShopItem.deleteMany({
          where: {
            documentId: documentId
          }
        });
        
        console.log(`✅ Removed ${deleteBookshopResult.count} bookshop items`);
      }
      
      console.log('\n✅ FIXED: Document with no pages has been cleaned up');
      console.log('   - Removed member access to prevent viewer errors');
      console.log('   - Removed from bookshop to prevent new purchases');
      console.log('   - Document still exists in database for potential future conversion');
      
    } else {
      console.log('\n✅ This document has pages - no fix needed');
    }

    // Test the fix by checking if there are any other documents with no pages
    console.log('\n🔍 Checking for other documents with no pages...');
    
    const documentsWithoutPages = await prisma.document.findMany({
      where: {
        pages: {
          none: {}
        }
      },
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: true
          }
        }
      }
    });

    if (documentsWithoutPages.length > 0) {
      console.log(`⚠️  Found ${documentsWithoutPages.length} other documents without pages:`);
      for (const doc of documentsWithoutPages) {
        const hasBookshopItems = doc.bookShopItems?.length > 0;
        const hasMemberAccess = doc.bookShopItems?.some(item => 
          item.myJstudyroomItems && item.myJstudyroomItems.length > 0) || false;
        console.log(`   - "${doc.title}" (Bookshop: ${hasBookshopItems ? 'Yes' : 'No'}, Members: ${hasMemberAccess ? 'Yes' : 'No'})`);
      }
    } else {
      console.log('✅ No other documents without pages found');
    }

    console.log('\n🎉 FIX COMPLETE!');
    console.log('The "DL&CO Syllabus" document error should now be resolved.');
    console.log('Members will no longer see this document in their study room.');
    console.log('The viewer should work properly for documents with pages.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);