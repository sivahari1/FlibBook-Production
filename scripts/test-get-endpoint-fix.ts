#!/usr/bin/env tsx

/**
 * Test the GET endpoint fix for My jStudyRoom counters
 * 
 * This simulates the GET /api/member/my-jstudyroom endpoint
 * to test the orphaned items cleanup and count correction
 */

import { prisma } from '../lib/db'

async function simulateGetEndpoint(userId: string) {
  console.log(`🔍 Simulating GET endpoint for user: ${userId}\n`)

  try {
    // Get user before cleanup
    const userBefore = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true,
        freeDocumentCount: true, 
        paidDocumentCount: true 
      },
    })

    if (!userBefore) {
      console.log('❌ User not found')
      return
    }

    console.log(`👤 User: ${userBefore.email}`)
    console.log(`📊 Before cleanup: ${userBefore.freeDocumentCount} free, ${userBefore.paidDocumentCount} paid, ${userBefore.freeDocumentCount + userBefore.paidDocumentCount} total`)

    // SIMULATE THE FIXED GET ENDPOINT LOGIC
    
    // 1. Find orphaned items (same logic as in the fixed GET endpoint)
    const orphanedItems = await prisma.myJstudyroomItem.findMany({
      where: {
        userId: userId,
      },
      include: {
        bookShopItem: {
          include: {
            document: true,
          },
        },
      },
    })

    const orphanedItemsToDelete = orphanedItems
      .filter(item => !item.bookShopItem || !item.bookShopItem.document || !item.bookShopItem.isPublished)

    console.log(`🔍 Found ${orphanedItems.length} total items, ${orphanedItemsToDelete.length} orphaned`)

    if (orphanedItemsToDelete.length > 0) {
      // Count orphaned items by type to update user counts correctly
      const orphanedFreeCount = orphanedItemsToDelete.filter(item => item.isFree).length
      const orphanedPaidCount = orphanedItemsToDelete.filter(item => !item.isFree).length
      const orphanedIds = orphanedItemsToDelete.map(item => item.id)

      console.log(`🧹 Cleaning up ${orphanedItemsToDelete.length} orphaned items (${orphanedFreeCount} free, ${orphanedPaidCount} paid)`)

      // Delete orphaned items AND update user counts in a transaction (FIXED LOGIC)
      await prisma.$transaction(async (tx) => {
        // Delete orphaned items
        await tx.myJstudyroomItem.deleteMany({
          where: {
            id: { in: orphanedIds },
          },
        })

        // Update user's document counts to reflect the cleanup
        if (orphanedFreeCount > 0 || orphanedPaidCount > 0) {
          // Get current counts to ensure we don't go negative
          const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { freeDocumentCount: true, paidDocumentCount: true },
          })

          if (currentUser) {
            const newFreeCount = Math.max(0, currentUser.freeDocumentCount - orphanedFreeCount)
            const newPaidCount = Math.max(0, currentUser.paidDocumentCount - orphanedPaidCount)

            await tx.user.update({
              where: { id: userId },
              data: {
                freeDocumentCount: newFreeCount,
                paidDocumentCount: newPaidCount,
              },
            })

            console.log(`📊 Updated counts: ${newFreeCount} free, ${newPaidCount} paid`)
          }
        }
      })
    } else {
      console.log('✅ No orphaned items found')
    }

    // 2. Get remaining valid items
    const items = await prisma.myJstudyroomItem.findMany({
      where: {
        userId: userId,
      },
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

    // Filter out items with missing bookShopItem or document
    const validItems = items.filter(item => 
      item.bookShopItem && 
      item.bookShopItem.isPublished && 
      item.bookShopItem.document
    )

    // 3. Get final user counts
    const userAfter = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeDocumentCount: true, paidDocumentCount: true },
    })

    console.log(`\n📋 Final state:`)
    console.log(`   Valid items: ${validItems.length}`)
    console.log(`   Stored counts: ${userAfter?.freeDocumentCount || 0} free, ${userAfter?.paidDocumentCount || 0} paid, ${(userAfter?.freeDocumentCount || 0) + (userAfter?.paidDocumentCount || 0)} total`)

    // Verify consistency
    const actualFreeItems = validItems.filter(item => item.isFree).length
    const actualPaidItems = validItems.filter(item => !item.isFree).length
    const actualTotalItems = validItems.length

    const storedFreeCount = userAfter?.freeDocumentCount || 0
    const storedPaidCount = userAfter?.paidDocumentCount || 0
    const storedTotalCount = storedFreeCount + storedPaidCount

    console.log(`   Actual items: ${actualFreeItems} free, ${actualPaidItems} paid, ${actualTotalItems} total`)

    if (actualFreeItems === storedFreeCount && 
        actualPaidItems === storedPaidCount && 
        actualTotalItems === storedTotalCount) {
      console.log(`\n🎉 SUCCESS: Counts are now consistent!`)
    } else {
      console.log(`\n❌ FAILURE: Counts are still inconsistent`)
    }

    // Show what the API would return
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
        free: userAfter?.freeDocumentCount || 0,
        paid: userAfter?.paidDocumentCount || 0,
        total: (userAfter?.freeDocumentCount || 0) + (userAfter?.paidDocumentCount || 0),
      },
    }

    console.log(`\n📤 API Response:`)
    console.log(`   Items: ${apiResponse.items.length}`)
    console.log(`   Counts: ${apiResponse.counts.free}/5 free, ${apiResponse.counts.paid}/5 paid, ${apiResponse.counts.total}/10 total`)

  } catch (error) {
    console.error('❌ Error simulating GET endpoint:', error)
  }
}

// Test with the user that has inconsistent counts
const TEST_USER_ID = 'cmi2xriym00009u9gegjddd8j' // sivaramj83@gmail.com

simulateGetEndpoint(TEST_USER_ID)
  .then(() => {
    console.log('\n🏁 Simulation complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Simulation failed:', error)
    process.exit(1)
  })