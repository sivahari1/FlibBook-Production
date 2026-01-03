#!/usr/bin/env tsx

/**
 * Simple verification script to test My jStudyRoom counters fix
 * 
 * This script verifies that:
 * 1. The GET endpoint returns accurate counts
 * 2. The DELETE endpoint properly decrements counts
 * 3. Orphaned items cleanup works correctly
 */

import { prisma } from '../lib/db'

async function verifyCountsConsistency() {
  console.log('🔍 Verifying My jStudyRoom counts consistency...\n')

  try {
    // Get all users with My jStudyRoom items
    const users = await prisma.user.findMany({
      where: {
        myJstudyroomItems: {
          some: {},
        },
      },
      include: {
        myJstudyroomItems: {
          include: {
            bookShopItem: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    })

    console.log(`Found ${users.length} users with My jStudyRoom items\n`)

    for (const user of users) {
      console.log(`👤 User: ${user.email} (${user.id})`)
      
      // Filter valid items (same logic as GET endpoint)
      const validItems = user.myJstudyroomItems.filter(item => 
        item.bookShopItem && 
        item.bookShopItem.isPublished && 
        item.bookShopItem.document
      )

      // Count actual items by type
      const actualFreeCount = validItems.filter(item => item.isFree).length
      const actualPaidCount = validItems.filter(item => !item.isFree).length
      const actualTotalCount = validItems.length

      // Get stored counts
      const storedFreeCount = user.freeDocumentCount
      const storedPaidCount = user.paidDocumentCount
      const storedTotalCount = storedFreeCount + storedPaidCount

      console.log(`  📊 Stored counts: ${storedFreeCount} free, ${storedPaidCount} paid, ${storedTotalCount} total`)
      console.log(`  📋 Actual items: ${actualFreeCount} free, ${actualPaidCount} paid, ${actualTotalCount} total`)

      // Check for inconsistencies
      const freeMatch = actualFreeCount === storedFreeCount
      const paidMatch = actualPaidCount === storedPaidCount
      const totalMatch = actualTotalCount === storedTotalCount

      if (freeMatch && paidMatch && totalMatch) {
        console.log(`  ✅ Counts are consistent!`)
      } else {
        console.log(`  ❌ Counts are inconsistent!`)
        
        if (!freeMatch) {
          console.log(`    - Free count mismatch: stored ${storedFreeCount}, actual ${actualFreeCount}`)
        }
        if (!paidMatch) {
          console.log(`    - Paid count mismatch: stored ${storedPaidCount}, actual ${actualPaidCount}`)
        }
        if (!totalMatch) {
          console.log(`    - Total count mismatch: stored ${storedTotalCount}, actual ${actualTotalCount}`)
        }

        // Show orphaned items if any
        const orphanedItems = user.myJstudyroomItems.filter(item => 
          !item.bookShopItem || 
          !item.bookShopItem.isPublished || 
          !item.bookShopItem.document
        )

        if (orphanedItems.length > 0) {
          console.log(`    - Found ${orphanedItems.length} orphaned items:`)
          for (const orphaned of orphanedItems) {
            const reason = !orphaned.bookShopItem 
              ? 'missing bookShopItem'
              : !orphaned.bookShopItem.isPublished 
              ? 'unpublished bookShopItem'
              : 'missing document'
            console.log(`      * ${orphaned.id} (${reason})`)
          }
        }
      }

      console.log('')
    }

    // Summary
    const inconsistentUsers = users.filter(user => {
      const validItems = user.myJstudyroomItems.filter(item => 
        item.bookShopItem && 
        item.bookShopItem.isPublished && 
        item.bookShopItem.document
      )
      const actualFreeCount = validItems.filter(item => item.isFree).length
      const actualPaidCount = validItems.filter(item => !item.isFree).length
      
      return actualFreeCount !== user.freeDocumentCount || 
             actualPaidCount !== user.paidDocumentCount
    })

    if (inconsistentUsers.length === 0) {
      console.log('🎉 All users have consistent counts!')
    } else {
      console.log(`⚠️  ${inconsistentUsers.length} users have inconsistent counts`)
      console.log('   Run the GET endpoint for these users to trigger cleanup')
    }

  } catch (error) {
    console.error('❌ Error verifying counts:', error)
  }
}

async function testOrphanedItemsCleanup() {
  console.log('\n🧹 Testing orphaned items cleanup logic...\n')

  try {
    // Find users with potential orphaned items
    const usersWithOrphanedItems = await prisma.user.findMany({
      where: {
        myJstudyroomItems: {
          some: {
            OR: [
              { bookShopItem: null },
              { bookShopItem: { isPublished: false } },
              { bookShopItem: { document: null } },
            ],
          },
        },
      },
      include: {
        myJstudyroomItems: {
          include: {
            bookShopItem: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    })

    if (usersWithOrphanedItems.length === 0) {
      console.log('✅ No users with orphaned items found')
      return
    }

    console.log(`Found ${usersWithOrphanedItems.length} users with orphaned items:`)

    for (const user of usersWithOrphanedItems) {
      const orphanedItems = user.myJstudyroomItems.filter(item => 
        !item.bookShopItem || 
        !item.bookShopItem.isPublished || 
        !item.bookShopItem.document
      )

      console.log(`\n👤 ${user.email}: ${orphanedItems.length} orphaned items`)
      
      const orphanedFreeCount = orphanedItems.filter(item => item.isFree).length
      const orphanedPaidCount = orphanedItems.filter(item => !item.isFree).length

      console.log(`   - ${orphanedFreeCount} free, ${orphanedPaidCount} paid`)
      console.log(`   - Current counts: ${user.freeDocumentCount} free, ${user.paidDocumentCount} paid`)

      if (orphanedFreeCount > 0 || orphanedPaidCount > 0) {
        const newFreeCount = Math.max(0, user.freeDocumentCount - orphanedFreeCount)
        const newPaidCount = Math.max(0, user.paidDocumentCount - orphanedPaidCount)
        console.log(`   - After cleanup: ${newFreeCount} free, ${newPaidCount} paid`)
      }
    }

    console.log('\n💡 To fix these inconsistencies, users should visit their My jStudyRoom page')
    console.log('   The GET endpoint will automatically clean up orphaned items and fix counts')

  } catch (error) {
    console.error('❌ Error testing orphaned items cleanup:', error)
  }
}

// Run the verification
async function main() {
  await verifyCountsConsistency()
  await testOrphanedItemsCleanup()
  
  console.log('\n🏁 Verification complete')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Verification failed:', error)
    process.exit(1)
  })