import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkJStudyRoomDocuments() {
  try {
    console.log('🔍 Checking jStudyRoom documents...\n')
    
    // Find all documents that are in bookshop
    const bookshopItems = await prisma.bookShopItem.findMany({
      where: {
        isPublished: true
      },
      include: {
        document: {
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc'
              },
              take: 3 // Just get first 3 pages to check
            }
          }
        }
      }
    })
    
    console.log(`📚 Found ${bookshopItems.length} published bookshop items\n`)
    
    for (const item of bookshopItems) {
      console.log(`\n📖 Bookshop Item: ${item.title}`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Document ID: ${item.documentId}`)
      console.log(`   Price: ${item.price}`)
      console.log(`   Category: ${item.category}`)
      
      if (item.document) {
        console.log(`   Document Title: ${item.document.title}`)
        console.log(`   Content Type: ${item.document.contentType}`)
        console.log(`   Status: ${item.document.status}`)
        console.log(`   Is Converted: ${item.document.isConverted}`)
        console.log(`   Total Pages: ${item.document.totalPages}`)
        console.log(`   Document Pages Count: ${item.document.pages.length}`)
        
        if (item.document.pages.length > 0) {
          console.log(`   Sample Pages:`)
          for (const page of item.document.pages) {
            console.log(`      Page ${page.pageNumber}: ${page.pageUrl || 'NO URL'}`)
          }
        } else {
          console.log(`   ⚠️  No pages found - document needs conversion`)
        }
      } else {
        console.log(`   ❌ No document linked`)
      }
    }
    
    // Check if any members have purchased items
    console.log(`\n\n👥 Checking member purchases...\n`)
    
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    })
    
    console.log(`📚 Found ${myJstudyroomItems.length} items in member jStudyRooms\n`)
    
    for (const item of myJstudyroomItems) {
      console.log(`\n👤 Member: ${item.user.email}`)
      console.log(`   Item: ${item.bookShopItem.title}`)
      console.log(`   Document ID: ${item.bookShopItem.documentId}`)
      console.log(`   Added: ${item.addedAt}`)
      console.log(`   Payment Status: ${item.paymentStatus}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkJStudyRoomDocuments()
