import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAvailableDocuments() {
  try {
    console.log('📋 Listing all available documents...')
    
    const documents = await prisma.document.findMany({
      include: {
        user: true,
        bookShopItems: true,
        pages: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    console.log(`Found ${documents.length} documents:`)
    
    for (const doc of documents) {
      console.log(`\n📄 Document: ${doc.title}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Content Type: ${doc.contentType}`)
      console.log(`   Owner: ${doc.user.email}`)
      console.log(`   In Bookshop: ${doc.bookShopItems.length > 0 ? 'Yes' : 'No'}`)
      console.log(`   Pages: ${doc.pages.length}`)
      console.log(`   Created: ${doc.createdAt.toISOString()}`)
      
      if (doc.bookShopItems.length > 0) {
        const item = doc.bookShopItems[0]
        console.log(`   Bookshop: ${item.title} (${item.category}) - ${item.isFree ? 'Free' : `₹${item.price}`}`)
        console.log(`   Published: ${item.isPublished ? 'Yes' : 'No'}`)
      }
    }
    
    // Also check for any documents that might match the ID pattern
    console.log('\n🔍 Checking for documents with similar IDs...')
    const similarDocs = await prisma.document.findMany({
      where: {
        id: {
          contains: 'cmskl'
        }
      }
    })
    
    if (similarDocs.length > 0) {
      console.log('Found documents with similar IDs:')
      for (const doc of similarDocs) {
        console.log(`   ${doc.id} - ${doc.title}`)
      }
    } else {
      console.log('No documents found with similar IDs')
    }
    
  } catch (error) {
    console.error('❌ Error listing documents:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAvailableDocuments()