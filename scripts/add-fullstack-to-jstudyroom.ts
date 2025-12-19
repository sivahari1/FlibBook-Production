#!/usr/bin/env tsx

/**
 * Add Full Stack AI Development document to user's jStudyRoom
 */

import { prisma } from '../lib/db';

async function addFullStackToJStudyRoom() {
  console.log('📚 Adding Full Stack AI Development to jStudyRoom...\n');

  try {
    // Find the Full Stack AI Development bookshop item
    const fullStackItem = await prisma.bookShopItem.findFirst({
      where: {
        title: {
          contains: 'Full Stack AI Development'
        }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            contentType: true
          }
        }
      }
    });

    if (!fullStackItem) {
      console.log('❌ Full Stack AI Development bookshop item not found');
      return;
    }

    console.log('✅ Found bookshop item:');
    console.log(`   Title: ${fullStackItem.title}`);
    console.log(`   Category: ${fullStackItem.category}`);
    console.log(`   Free: ${fullStackItem.isFree}`);
    console.log(`   Document: ${fullStackItem.document.title}`);

    // Find the user (sivaramj83@gmail.com)
    const user = await prisma.user.findUnique({
      where: {
        email: 'sivaramj83@gmail.com'
      },
      select: {
        id: true,
        email: true,
        freeDocumentCount: true,
        paidDocumentCount: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`\n👤 User: ${user.email}`);
    console.log(`   Free docs: ${user.freeDocumentCount || 0}/5`);
    console.log(`   Paid docs: ${user.paidDocumentCount || 0}/5`);

    // Check if already in jStudyRoom
    const existingItem = await prisma.myJstudyroomItem.findFirst({
      where: {
        userId: user.id,
        bookShopItemId: fullStackItem.id
      }
    });

    if (existingItem) {
      console.log('ℹ️  Document is already in user\'s jStudyRoom');
      return;
    }

    // Add to jStudyRoom
    console.log('\n➕ Adding to jStudyRoom...');
    
    const myJstudyroomItem = await prisma.myJstudyroomItem.create({
      data: {
        userId: user.id,
        bookShopItemId: fullStackItem.id,
        isFree: fullStackItem.isFree
      }
    });

    console.log('✅ Added to jStudyRoom successfully');

    // Update user's document count
    if (fullStackItem.isFree) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          freeDocumentCount: {
            increment: 1
          }
        }
      });
      console.log('✅ Updated free document count');
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          paidDocumentCount: {
            increment: 1
          }
        }
      });
      console.log('✅ Updated paid document count');
    }

    // Check final status
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        freeDocumentCount: true,
        paidDocumentCount: true,
        _count: {
          select: {
            myJstudyroomItems: true
          }
        }
      }
    });

    console.log('\n📊 Updated user stats:');
    console.log(`   Free docs: ${updatedUser?.freeDocumentCount || 0}/5`);
    console.log(`   Paid docs: ${updatedUser?.paidDocumentCount || 0}/5`);
    console.log(`   Total jStudyRoom items: ${updatedUser?._count.myJstudyroomItems || 0}`);

    console.log('\n✅ Full Stack AI Development added to jStudyRoom successfully!');
    console.log('\n📋 User now has access to:');
    console.log('   1. TPIPR (Functional MRI) - FREE');
    console.log('   2. Full Stack AI Development (Computer Science) - FREE');

  } catch (error) {
    console.error('❌ Error adding to jStudyRoom:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addFullStackToJStudyRoom().catch(console.error);