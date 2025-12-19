import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getCorrectMemberViewerUrl() {
  try {
    console.log('🔍 Finding correct member viewer URLs...')
    
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      }
    })
    
    console.log(`Found ${myJstudyroomItems.length} items in My JStudyroom:`)
    
    for (const item of myJstudyroomItems) {
      console.log(`\n📄 Document: ${item.bookShopItem.document.title}`)
      console.log(`   Document ID: ${item.bookShopItem.document.id}`)
      console.log(`   MyJstudyroom Item ID: ${item.id}`)
      console.log(`   User: ${item.user.email}`)
      console.log(`   ✅ Correct URL: http://localhost:3002/member/view/${item.id}`)
      
      // Check if document has pages
      const pages = await prisma.documentPage.findMany({
        where: { documentId: item.bookShopItem.document.id }
      })
      console.log(`   Pages: ${pages.length}`)
    }
    
    if (myJstudyroomItems.length > 0) {
      const firstItem = myJstudyroomItems[0]
      console.log(`\n🎯 Try this URL: http://localhost:3002/member/view/${firstItem.id}`)
      console.log(`   (This will show: ${firstItem.bookShopItem.document.title})`)
    }
    
  } catch (error) {
    console.error('❌ Error getting URLs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getCorrectMemberViewerUrl()