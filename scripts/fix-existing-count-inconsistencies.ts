#!/usr/bin/env tsx

/**
 * Fix existing count inconsistencies in My jStudyRoom
 * 
 * This script corrects user counts to match their actual items
 * for users who have inconsistent data due to past bugs
 */

import { prisma } from '../lib/db'

async function fixCountInconsistencies() {
  console.log('🔧 Fixing existing My jStudyRoom count inconsistencies...\n')

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

    let fixedUsers = 0
    let totalUsers = 0

    for (const user of users) {
      totalUsers++
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

      // Get stored counts
      const storedFreeCount = user.freeDocumentCount
      const storedPaidCount = user.paidDocumentCount

      console.log(`  📊 Stored: ${storedFreeCount} free, ${storedPaidCount} paid`)
      console.log(`  📋 Actual: ${actualFreeCount} free, ${actualPaidCount} paid`)

      // Check if counts need fixing
      const needsFix = actualFreeCount !== storedFreeCount || actualPaidCount !== storedPaidCount

      if (needsFix) {
        console.log(`  🔧 Fixing counts...`)
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            freeDocumentCount: actualFreeCount,
            paidDocumentCount: actualPaidCount,
          },
        })

        console.log(`  ✅ Updated to: ${actualFreeCount} free, ${actualPaidCount} paid`)
        fixedUsers++
      } else {
        console.log(`  ✅ Counts are already correct`)
      }

      // Clean up orphaned items if any
      const orphanedItems = user.myJstudyroomItems.filter(item => 
        !item.bookShopItem || 
        !item.bookShopItem.isPublished || 
        !item.bookShopItem.document
      )

      if (orphanedItems.length > 0) {
        console.log(`  🧹 Removing ${orphanedItems.length} orphaned items...`)
        
        await prisma.myJstudyroomItem.deleteMany({
          where: {
            id: { in: orphanedItems.map(item => item.id) },
          },
        })

        console.log(`  ✅ Orphaned items removed`)
      }

      console.log('')
    }

    // Summary
    console.log(`📊 Summary:`)
    console.log(`   Total users processed: ${totalUsers}`)
    console.log(`   Users with fixed counts: ${fixedUsers}`)
    console.log(`   Users already correct: ${totalUsers - fixedUsers}`)

    if (fixedUsers > 0) {
      console.log(`\n🎉 Successfully fixed count inconsistencies for ${fixedUsers} users!`)
    } else {
      console.log(`\n✅ All users already had consistent counts!`)
    }

  } catch (error) {
    console.error('❌ Error fixing count inconsistencies:', error)
  }
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...\n')

  try {
    // Check for any remaining inconsistencies
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

    let inconsistentUsers = 0

    for (const user of users) {
      const validItems = user.myJstudyroomItems.filter(item => 
        item.bookShopItem && 
        item.bookShopItem.isPublished && 
        item.bookShopItem.document
      )

      const actualFreeCount = validItems.filter(item => item.isFree).length
      const actualPaidCount = validItems.filter(item => !item.isFree).length

      if (actualFreeCount !== user.freeDocumentCount || actualPaidCount !== user.paidDocumentCount) {
        inconsistentUsers++
        console.log(`❌ ${user.email}: stored ${user.freeDocumentCount}/${user.paidDocumentCount}, actual ${actualFreeCount}/${actualPaidCount}`)
      }
    }

    if (inconsistentUsers === 0) {
      console.log('🎉 All users now have consistent counts!')
    } else {
      console.log(`⚠️  ${inconsistentUsers} users still have inconsistent counts`)
    }

  } catch (error) {
    console.error('❌ Error verifying fix:', error)
  }
}

// Run the fix
async function main() {
  await fixCountInconsistencies()
  await verifyFix()
  
  console.log('\n🏁 Fix complete')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fix failed:', error)
    process.exit(1)
  })