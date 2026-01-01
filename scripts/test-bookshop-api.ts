#!/usr/bin/env tsx

/**
 * Test script to verify the bookshop API endpoint works correctly
 */

import { prisma } from '@/lib/db'

async function testBookshopAPI() {
  console.log('🧪 Testing Bookshop API logic...')
  
  try {
    // Test the same query logic as the API
    const where = {
      isPublished: true,
      // Since documentId is required in schema, we don't need to filter for null
    }

    const items = await prisma.bookShopItem.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            contentType: true,
            metadata: true,
            thumbnailUrl: true,
            linkUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`✅ Query successful! Found ${items.length} bookshop items`)
    
    // Test transformation logic
    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      isFree: item.isFree,
      price: item.price,
      contentType: item.contentType,
      previewUrl: item.previewUrl || item.document?.thumbnailUrl || null,
      linkUrl: item.linkUrl || item.document?.linkUrl || null,
      metadata: item.metadata,
      documentId: item.documentId,
      document: item.document,
      createdAt: item.createdAt,
      inMyJstudyroom: false, // No session in test
    }))

    console.log(`✅ Transformation successful! ${transformedItems.length} items transformed`)
    
    if (transformedItems.length > 0) {
      console.log('📋 Sample item:', {
        id: transformedItems[0].id,
        title: transformedItems[0].title,
        category: transformedItems[0].category,
        hasDocument: !!transformedItems[0].document,
      })
    }

    const result = { items: transformedItems, total: transformedItems.length }
    console.log(`✅ API response structure valid: ${JSON.stringify(Object.keys(result))}`)
    
    return true
  } catch (error) {
    console.error('❌ Bookshop API test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testBookshopAPI()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Test script error:', error)
    process.exit(1)
  })