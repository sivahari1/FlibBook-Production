import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testMemberViewerWithExistingDoc() {
  try {
    console.log('🧪 Testing member viewer with existing document...')
    
    // Get the first available document
    const document = await prisma.document.findFirst({
      include: {
        bookShopItems: true,
        pages: true
      },
      where: {
        bookShopItems: {
          some: {
            isPublished: true
          }
        }
      }
    })
    
    if (!document) {
      console.log('❌ No published documents found in bookshop')
      return
    }
    
    console.log('✅ Found document to test:', {
      id: document.id,
      title: document.title,
      pages: document.pages.length
    })
    
    const bookshopItem = document.bookShopItems[0]
    console.log('📚 Bookshop item:', {
      id: bookshopItem.id,
      title: bookshopItem.title,
      isFree: bookshopItem.isFree,
      isPublished: bookshopItem.isPublished
    })
    
    // Test the member viewer URL
    const memberViewerUrl = `http://localhost:3002/member/view/${document.id}`
    console.log('🔗 Member viewer URL:', memberViewerUrl)
    
    // Test the API endpoint
    console.log('🔄 Testing API endpoint...')
    
    try {
      const response = await fetch(`http://localhost:3002/api/member/my-jstudyroom/${document.id}`)
      console.log('📡 API Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', data)
      } else {
        const errorText = await response.text()
        console.log('❌ API Error:', errorText)
      }
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message)
    }
    
    // Check if we need to add this to user's study room
    console.log('\n🎓 Checking My JStudyroom items...')
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
      console.log(`   ${item.bookShopItem.document.title} - User: ${item.user.email}`)
    }
    
    // If no items, let's add the document to a user's study room
    if (myJstudyroomItems.length === 0) {
      console.log('\n➕ Adding document to user study room...')
      
      // Get a user (preferably the owner)
      const user = await prisma.user.findFirst({
        where: {
          email: 'sivaramj83@gmail.com'
        }
      })
      
      if (user) {
        const newItem = await prisma.myJstudyroomItem.create({
          data: {
            userId: user.id,
            bookShopItemId: bookshopItem.id,
            isFree: bookshopItem.isFree
          }
        })
        
        console.log('✅ Added to study room:', newItem.id)
        console.log('🔗 Try this URL:', `http://localhost:3002/member/view/${document.id}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing member viewer:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMemberViewerWithExistingDoc()