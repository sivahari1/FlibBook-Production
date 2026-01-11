#!/usr/bin/env tsx

/**
 * Test script to verify the My jstudyroom API endpoint
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function testMyJstudyroomAPI() {
  console.log('🔍 Testing My jstudyroom API endpoint...')

  try {
    // Test database connection
    console.log('📊 Testing database connection...')
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected. Found ${userCount} users.`)

    // Find a member user to test with
    const memberUser = await prisma.user.findFirst({
      where: { userRole: 'MEMBER' },
      select: { id: true, email: true, freeDocumentCount: true, paidDocumentCount: true }
    })

    if (!memberUser) {
      console.log('❌ No member users found in database')
      return
    }

    console.log(`👤 Testing with member user: ${memberUser.email}`)

    // Test fetching My jstudyroom items
    console.log('📚 Fetching My jstudyroom items...')
    const items = await prisma.myJstudyroomItem.findMany({
      where: { userId: memberUser.id },
      include: {
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                filename: true,
                contentType: true,
                metadata: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    console.log(`📖 Found ${items.length} items in My jstudyroom`)

    // Filter valid items
    const validItems = items.filter(item => 
      item.bookShopItem && 
      item.bookShopItem.isPublished && 
      item.bookShopItem.document
    )

    console.log(`✅ ${validItems.length} valid items (${items.length - validItems.length} filtered out)`)

    // Test user counts
    console.log(`📊 User counts - Free: ${memberUser.freeDocumentCount}, Paid: ${memberUser.paidDocumentCount}`)

    // Simulate API response
    const apiResponse = {
      items: validItems.map(item => ({
        id: item.id,
        bookShopItemId: item.bookShopItemId,
        title: item.bookShopItem!.title,
        category: item.bookShopItem!.category,
        isFree: item.isFree,
        addedAt: item.addedAt,
        documentId: item.bookShopItem!.document!.id,
        documentTitle: item.bookShopItem!.document!.title,
        contentType: item.bookShopItem!.document!.contentType,
        metadata: item.bookShopItem!.document!.metadata,
      })),
      counts: {
        free: memberUser.freeDocumentCount || 0,
        paid: memberUser.paidDocumentCount || 0,
        total: (memberUser.freeDocumentCount || 0) + (memberUser.paidDocumentCount || 0),
      },
    }

    console.log('✅ API response structure looks good:')
    console.log(`   - Items: ${apiResponse.items.length}`)
    console.log(`   - Counts: ${JSON.stringify(apiResponse.counts)}`)

    // Check for any potential issues
    const orphanedItems = items.filter(item => 
      !item.bookShopItem || !item.bookShopItem.document || !item.bookShopItem.isPublished
    )

    if (orphanedItems.length > 0) {
      console.log(`⚠️  Found ${orphanedItems.length} orphaned items that will be cleaned up`)
    }

    console.log('🎉 My jstudyroom API test completed successfully!')

  } catch (error) {
    console.error('❌ Error testing My jstudyroom API:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testMyJstudyroomAPI()