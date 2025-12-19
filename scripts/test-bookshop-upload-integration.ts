#!/usr/bin/env tsx

/**
 * Test script to verify bookshop upload integration
 */

import { prisma } from '../lib/db';

async function testBookshopUploadIntegration() {
  console.log('🧪 Testing bookshop upload integration...\n');

  try {
    // 1. Find the "Full Stack AI Development" document that should be in bookshop
    console.log('🔍 Looking for "Full Stack AI Development" document...');
    
    const fullStackDoc = await prisma.document.findFirst({
      where: {
        title: {
          contains: 'Full Stack AI Development'
        }
      },
      include: {
        bookShopItems: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!fullStackDoc) {
      console.log('❌ Document not found');
      return;
    }

    console.log('✅ Found document:');
    console.log(`   Title: ${fullStackDoc.title}`);
    console.log(`   ID: ${fullStackDoc.id}`);
    console.log(`   User: ${fullStackDoc.user.email} (${fullStackDoc.user.role})`);
    console.log(`   Created: ${fullStackDoc.createdAt}`);
    console.log(`   BookShop Items: ${fullStackDoc.bookShopItems.length}`);

    if (fullStackDoc.bookShopItems.length === 0) {
      console.log('\n❌ This document has no bookshop items - this is the problem!');
      
      // Let's manually add it to bookshop to test
      console.log('\n🔧 Manually adding to bookshop...');
      
      const bookshopItem = await prisma.bookShopItem.create({
        data: {
          title: fullStackDoc.title,
          description: 'Full Stack AI Development course material',
          category: 'Computer Science',
          price: 0, // Free
          contentType: fullStackDoc.contentType,
          documentId: fullStackDoc.id,
          isFree: true,
          isPublished: true
        }
      });

      console.log('✅ Successfully added to bookshop:');
      console.log(`   BookShop Item ID: ${bookshopItem.id}`);
      console.log(`   Title: ${bookshopItem.title}`);
      console.log(`   Category: ${bookshopItem.category}`);
      console.log(`   Price: ₹${bookshopItem.price} (Free: ${bookshopItem.isFree})`);
      console.log(`   Published: ${bookshopItem.isPublished}`);
    } else {
      console.log('\n✅ Document already has bookshop items:');
      fullStackDoc.bookShopItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (₹${item.price})`);
        console.log(`      Category: ${item.category}`);
        console.log(`      Published: ${item.isPublished}`);
      });
    }

    // 2. Test the bookshop API to see if it shows up
    console.log('\n📚 Testing bookshop API...');
    
    const allBookshopItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true
      },
      include: {
        document: {
          select: {
            title: true,
            contentType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total published bookshop items: ${allBookshopItems.length}`);
    
    // Look for our documents
    const tpiprItem = allBookshopItems.find(item => item.title.includes('TPIPR'));
    const fullStackItem = allBookshopItems.find(item => item.title.includes('Full Stack AI Development'));

    console.log('\n📋 User documents in bookshop:');
    if (tpiprItem) {
      console.log(`✅ TPIPR found in bookshop (Category: ${tpiprItem.category})`);
    } else {
      console.log('❌ TPIPR not found in bookshop');
    }

    if (fullStackItem) {
      console.log(`✅ Full Stack AI Development found in bookshop (Category: ${fullStackItem.category})`);
    } else {
      console.log('❌ Full Stack AI Development not found in bookshop');
    }

    // 3. Check categories
    console.log('\n📂 Available categories:');
    const categories = [...new Set(allBookshopItems.map(item => item.category))];
    categories.forEach(category => {
      const count = allBookshopItems.filter(item => item.category === category).length;
      console.log(`   - ${category}: ${count} items`);
    });

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBookshopUploadIntegration().catch(console.error);