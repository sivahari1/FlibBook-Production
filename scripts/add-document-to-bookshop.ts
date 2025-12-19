#!/usr/bin/env tsx

/**
 * Script to add an existing document to the bookshop
 */

import { prisma } from '../lib/db';
import { getAllCategories } from '../lib/bookshop-categories';

async function addDocumentToBookshop() {
  console.log('📚 Adding document to bookshop...\n');

  try {
    // Find the most recent document that's not in bookshop
    const recentDoc = await prisma.document.findFirst({
      where: {
        bookShopItems: {
          none: {}
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        userId: true,
        createdAt: true,
      }
    });

    if (!recentDoc) {
      console.log('❌ No documents found that aren\'t already in bookshop');
      return;
    }

    console.log('📄 Found document to add to bookshop:');
    console.log(`   Title: ${recentDoc.title}`);
    console.log(`   ID: ${recentDoc.id}`);
    console.log(`   Content Type: ${recentDoc.contentType}`);
    console.log(`   Created: ${recentDoc.createdAt}`);
    console.log('');

    // Get available categories
    const categories = getAllCategories();
    console.log('📋 Available categories:', categories.join(', '));
    
    // Use the first available category (or you can specify one)
    const category = categories[0] || 'General';
    
    // Create bookshop item
    const bookshopItem = await prisma.bookShopItem.create({
      data: {
        title: recentDoc.title,
        description: `Free content: ${recentDoc.title}`,
        category: category,
        price: 0, // Free
        contentType: recentDoc.contentType,
        documentId: recentDoc.id,
        isFree: true,
        isPublished: true
      }
    });

    console.log('✅ Successfully added document to bookshop!');
    console.log(`   BookShop Item ID: ${bookshopItem.id}`);
    console.log(`   Title: ${bookshopItem.title}`);
    console.log(`   Category: ${bookshopItem.category}`);
    console.log(`   Price: ₹${bookshopItem.price} (Free: ${bookshopItem.isFree})`);
    console.log(`   Published: ${bookshopItem.isPublished}`);
    console.log('');

    // Verify it's now visible in bookshop
    const bookshopItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true
      },
      include: {
        document: {
          select: {
            title: true,
            userId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('📚 Recent bookshop items (top 5):');
    bookshopItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title} (₹${item.price}${item.isFree ? ' - FREE' : ''})`);
      console.log(`      Category: ${item.category}`);
      console.log(`      Document: ${item.document?.title}`);
    });

  } catch (error) {
    console.error('❌ Error adding document to bookshop:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addDocumentToBookshop().catch(console.error);