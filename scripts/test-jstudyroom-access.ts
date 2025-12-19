#!/usr/bin/env tsx

/**
 * Test JStudyRoom Access
 * 
 * This script will test if the document viewing is now working
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testJStudyRoomAccess() {
  console.log('🧪 Testing JStudyRoom access...')
  
  try {
    // Check My JStudyRoom items
    const items = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: true
              }
            }
          }
        },
        user: true
      }
    })
    
    console.log(`\n📚 Found ${items.length} items in My JStudyRoom`)
    
    for (const item of items) {
      const document = item.bookShopItem?.document
      if (!document) continue
      
      console.log(`\n📄 Item: ${item.id}`)
      console.log(`   Document: ${document.title}`)
      console.log(`   User: ${item.user?.email}`)
      console.log(`   Pages: ${document.pages?.length || 0}`)
      
      if (document.pages && document.pages.length > 0) {
        const samplePage = document.pages[0]
        console.log(`   Sample page URL: ${samplePage.pageUrl}`)
        console.log(`   ✅ Ready for viewing`)
      } else {
        console.log(`   ❌ No pages available`)
      }
    }
    
    // Test the viewer URL
    if (items.length > 0) {
      const testItem = items[0]
      const viewerUrl = `http://localhost:3000/member/view/${testItem.id}`
      console.log(`\n🔗 Test viewer URL: ${viewerUrl}`)
      console.log(`   Open this URL in your browser to test viewing`)
    }
    
    console.log('\n✅ Test complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testJStudyRoomAccess().catch(console.error)