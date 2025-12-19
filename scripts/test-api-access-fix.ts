#!/usr/bin/env tsx

/**
 * Test API Access Fix
 * 
 * This script will test if the API access control fix is working
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testApiAccessFix() {
  console.log('🧪 Testing API access fix...')
  
  try {
    // Get the test document
    const testItemId = 'cmj8rkgdx00019uaweqdedxk8'
    
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: testItemId },
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      }
    })
    
    if (!item?.bookShopItem?.document) {
      console.log('❌ Test document not found')
      return
    }
    
    const document = item.bookShopItem.document
    const user = item.user
    
    console.log(`📄 Testing document: ${document.title}`)
    console.log(`👤 User: ${user?.email}`)
    console.log(`🔗 Document ID: ${document.id}`)
    
    // Check the access control logic manually
    console.log(`\n🔍 Checking access control logic:`)
    
    // Check if user has My JStudyRoom access
    const hasJStudyRoomAccess = await prisma.myJstudyroomItem.findFirst({
      where: {
        userId: user?.id,
        bookShopItem: {
          documentId: document.id
        }
      }
    })
    
    console.log(`   - Has JStudyRoom access: ${hasJStudyRoomAccess ? '✅ Yes' : '❌ No'}`)
    console.log(`   - Is document owner: ${document.userId === user?.id ? '✅ Yes' : '❌ No'}`)
    
    if (hasJStudyRoomAccess || document.userId === user?.id) {
      console.log(`   - ✅ Should have access to API endpoints`)
    } else {
      console.log(`   - ❌ Should NOT have access to API endpoints`)
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   - Document pages: ${document.pages?.length || 0}`)
    console.log(`   - Access method: ${hasJStudyRoomAccess ? 'My JStudyRoom' : document.userId === user?.id ? 'Owner' : 'None'}`)
    
    console.log(`\n🎯 Next steps:`)
    console.log(`1. Refresh the browser page`)
    console.log(`2. Check if the document loads without errors`)
    console.log(`3. Look for any remaining 401/403 errors in browser console`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testApiAccessFix().catch(console.error)