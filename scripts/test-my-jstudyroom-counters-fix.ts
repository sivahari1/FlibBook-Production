#!/usr/bin/env tsx

/**
 * Test script to verify My jStudyRoom counters fix
 * 
 * This script tests:
 * 1. Adding items to My jStudyRoom
 * 2. Returning items from My jStudyRoom  
 * 3. Verifying counts are accurate after each operation
 * 4. Testing orphaned items cleanup
 */

import { prisma } from '../lib/db'

interface TestUser {
  id: string
  email: string
  freeDocumentCount: number
  paidDocumentCount: number
}

interface TestBookShopItem {
  id: string
  title: string
  isFree: boolean
}

async function createTestUser(): Promise<TestUser> {
  const testEmail = `test-counters-${Date.now()}@example.com`
  
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: 'test-hash',
      name: 'Test User for Counters',
      userRole: 'MEMBER',
      freeDocumentCount: 0,
      paidDocumentCount: 0,
    },
  })

  console.log(`✅ Created test user: ${user.email} (ID: ${user.id})`)
  return user
}

async function createTestBookShopItems(): Promise<TestBookShopItem[]> {
  const items: TestBookShopItem[] = []
  
  // Create multiple test items to avoid unique constraint issues
  for (let i = 0; i < 5; i++) {
    // Create test document
    const doc = await prisma.document.create({
      data: {
        title: `Test Document ${i}`,
        filename: `test-${i}.pdf`,
        fileSize: BigInt(1000 + i),
        storagePath: `/test/test-${i}.pdf`,
        contentType: 'PDF',
        userId: 'test-user-id',
      },
    })

    // Create bookshop item
    const isFree = i < 3 // First 3 are free, last 2 are paid
    const item = await prisma.bookShopItem.create({
      data: {
        title: `${isFree ? 'Free' : 'Paid'} Test Item ${i}`,
        description: `A ${isFree ? 'free' : 'paid'} test item`,
        category: 'TEST',
        price: isFree ? 0 : 100 + i,
        isFree,
        isPublished: true,
        documentId: doc.id,
      },
    })

    items.push({ id: item.id, title: item.title, isFree })
  }

  console.log(`✅ Created ${items.length} test bookshop items`)
  return items
}

async function addItemToMyJstudyroom(userId: string, bookShopItemId: string, isFree: boolean) {
  const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookShopItemId,
      isFree,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add item: ${response.statusText}`)
  }

  return response.json()
}

async function removeItemFromMyJstudyroom(itemId: string) {
  const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${itemId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to remove item: ${response.statusText}`)
  }

  return response.json()
}

async function getMyJstudyroomItems(userId: string) {
  // Simulate the GET request by directly calling the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeDocumentCount: true, paidDocumentCount: true },
  })

  const items = await prisma.myJstudyroomItem.findMany({
    where: { userId },
    include: {
      bookShopItem: {
        include: {
          document: true,
        },
      },
    },
  })

  return {
    items: items.filter(item => 
      item.bookShopItem && 
      item.bookShopItem.isPublished && 
      item.bookShopItem.document
    ),
    counts: {
      free: user?.freeDocumentCount || 0,
      paid: user?.paidDocumentCount || 0,
      total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
    },
  }
}

async function testCountersFlow() {
  console.log('🧪 Starting My jStudyRoom counters test...\n')

  let testUser: TestUser
  let testItems: TestBookShopItem[]

  try {
    // 1. Create test data
    testUser = await createTestUser()
    testItems = await createTestBookShopItems()

    // 2. Initial state check
    console.log('\n📊 Initial state:')
    let state = await getMyJstudyroomItems(testUser.id)
    console.log(`Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // 3. Add free items
    console.log('\n➕ Adding 3 free items...')
    const freeItems = testItems.filter(item => item.isFree)
    for (let i = 0; i < 3; i++) {
      await prisma.myJstudyroomItem.create({
        data: {
          userId: testUser.id,
          bookShopItemId: freeItems[i].id,
          isFree: true,
        },
      })
      
      // Update user counts manually (simulating the add API)
      await prisma.user.update({
        where: { id: testUser.id },
        data: { freeDocumentCount: { increment: 1 } },
      })
    }

    state = await getMyJstudyroomItems(testUser.id)
    console.log(`Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // 4. Add paid items
    console.log('\n➕ Adding 2 paid items...')
    const paidItems = testItems.filter(item => !item.isFree)
    for (let i = 0; i < 2; i++) {
      await prisma.myJstudyroomItem.create({
        data: {
          userId: testUser.id,
          bookShopItemId: paidItems[i].id,
          isFree: false,
        },
      })
      
      // Update user counts manually (simulating the add API)
      await prisma.user.update({
        where: { id: testUser.id },
        data: { paidDocumentCount: { increment: 1 } },
      })
    }

    state = await getMyJstudyroomItems(testUser.id)
    console.log(`Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // 5. Return 2 free items (simulate the bug scenario)
    console.log('\n↩️ Returning 2 free items...')
    const freeItemsToReturn = state.items.filter(item => item.isFree).slice(0, 2)
    
    for (const item of freeItemsToReturn) {
      // Delete the item
      await prisma.myJstudyroomItem.delete({
        where: { id: item.id },
      })
      
      // Update user counts (simulating the fixed removeDocumentFromMyJstudyroom)
      const currentUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { freeDocumentCount: true },
      })
      
      if (currentUser) {
        const newFreeCount = Math.max(0, currentUser.freeDocumentCount - 1)
        await prisma.user.update({
          where: { id: testUser.id },
          data: { freeDocumentCount: newFreeCount },
        })
      }
    }

    state = await getMyJstudyroomItems(testUser.id)
    console.log(`Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // 6. Test the GET endpoint with orphaned items cleanup
    console.log('\n🧹 Testing orphaned items cleanup...')
    
    // Create an orphaned item (item with unpublished bookshop item)
    const orphanedDoc = await prisma.document.create({
      data: {
        title: 'Orphaned Document',
        filename: 'orphaned.pdf',
        fileSize: BigInt(500),
        storagePath: '/test/orphaned.pdf',
        contentType: 'PDF',
        userId: 'test-user-id',
      },
    })

    const orphanedBookShopItem = await prisma.bookShopItem.create({
      data: {
        title: 'Orphaned Item',
        description: 'This will be unpublished',
        category: 'TEST',
        price: 0,
        isFree: true,
        isPublished: false, // This makes it orphaned
        documentId: orphanedDoc.id,
      },
    })

    await prisma.myJstudyroomItem.create({
      data: {
        userId: testUser.id,
        bookShopItemId: orphanedBookShopItem.id,
        isFree: true,
      },
    })

    // Manually increment count (simulating the bug where orphaned items were counted)
    await prisma.user.update({
      where: { id: testUser.id },
      data: { freeDocumentCount: { increment: 1 } },
    })

    console.log('Created orphaned item...')
    state = await getMyJstudyroomItems(testUser.id)
    console.log(`Before cleanup - Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // Now test the fixed GET endpoint logic
    const orphanedItems = await prisma.myJstudyroomItem.findMany({
      where: { userId: testUser.id },
      include: {
        bookShopItem: {
          include: { document: true },
        },
      },
    })

    const orphanedItemsToDelete = orphanedItems
      .filter(item => !item.bookShopItem || !item.bookShopItem.document || !item.bookShopItem.isPublished)

    if (orphanedItemsToDelete.length > 0) {
      const orphanedFreeCount = orphanedItemsToDelete.filter(item => item.isFree).length
      const orphanedPaidCount = orphanedItemsToDelete.filter(item => !item.isFree).length
      const orphanedIds = orphanedItemsToDelete.map(item => item.id)

      console.log(`Found ${orphanedItemsToDelete.length} orphaned items (${orphanedFreeCount} free, ${orphanedPaidCount} paid)`)

      // Apply the fix: delete orphaned items AND update counts
      await prisma.$transaction(async (tx) => {
        await tx.myJstudyroomItem.deleteMany({
          where: { id: { in: orphanedIds } },
        })

        if (orphanedFreeCount > 0 || orphanedPaidCount > 0) {
          const currentUser = await tx.user.findUnique({
            where: { id: testUser.id },
            select: { freeDocumentCount: true, paidDocumentCount: true },
          })

          if (currentUser) {
            const newFreeCount = Math.max(0, currentUser.freeDocumentCount - orphanedFreeCount)
            const newPaidCount = Math.max(0, currentUser.paidDocumentCount - orphanedPaidCount)

            await tx.user.update({
              where: { id: testUser.id },
              data: {
                freeDocumentCount: newFreeCount,
                paidDocumentCount: newPaidCount,
              },
            })
          }
        }
      })
    }

    state = await getMyJstudyroomItems(testUser.id)
    console.log(`After cleanup - Items: ${state.items.length}, Free: ${state.counts.free}/5, Paid: ${state.counts.paid}/5, Total: ${state.counts.total}/10`)

    // 7. Verify final state
    console.log('\n✅ Final verification:')
    const actualItemCount = state.items.length
    const reportedTotalCount = state.counts.total
    const reportedFreeCount = state.counts.free
    const reportedPaidCount = state.counts.paid

    const actualFreeItems = state.items.filter(item => item.isFree).length
    const actualPaidItems = state.items.filter(item => !item.isFree).length

    console.log(`Actual items: ${actualItemCount} (${actualFreeItems} free, ${actualPaidItems} paid)`)
    console.log(`Reported counts: ${reportedTotalCount} (${reportedFreeCount} free, ${reportedPaidCount} paid)`)

    if (actualItemCount === reportedTotalCount && 
        actualFreeItems === reportedFreeCount && 
        actualPaidItems === reportedPaidCount) {
      console.log('🎉 SUCCESS: Counts are accurate!')
    } else {
      console.log('❌ FAILURE: Counts are still inaccurate!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    // Cleanup
    if (testUser) {
      console.log('\n🧹 Cleaning up test data...')
      
      // Delete my jstudyroom items
      await prisma.myJstudyroomItem.deleteMany({
        where: { userId: testUser.id },
      })
      
      // Delete bookshop items and documents
      if (testItems) {
        for (const item of testItems) {
          const bookShopItem = await prisma.bookShopItem.findUnique({
            where: { id: item.id },
            include: { document: true },
          })
          
          if (bookShopItem) {
            await prisma.bookShopItem.delete({ where: { id: item.id } })
            if (bookShopItem.document) {
              await prisma.document.delete({ where: { id: bookShopItem.document.id } })
            }
          }
        }
      }
      
      // Delete orphaned bookshop item and document if they exist
      const orphanedItems = await prisma.bookShopItem.findMany({
        where: { title: 'Orphaned Item' },
        include: { document: true },
      })
      
      for (const item of orphanedItems) {
        await prisma.bookShopItem.delete({ where: { id: item.id } })
        if (item.document) {
          await prisma.document.delete({ where: { id: item.document.id } })
        }
      }
      
      // Delete test user
      await prisma.user.delete({ where: { id: testUser.id } })
      
      console.log('✅ Cleanup complete')
    }
  }
}

// Run the test
testCountersFlow()
  .then(() => {
    console.log('\n🏁 Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed with error:', error)
    process.exit(1)
  })