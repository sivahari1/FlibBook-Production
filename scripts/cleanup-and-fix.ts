import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupAndFix() {
  console.log('🧹 Starting cleanup and fix...')
  
  try {
    // 1. List all documents
    const allDocs = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        userId: true,
        _count: {
          select: {
            bookShopItems: true,
            pages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📊 Found ${allDocs.length} total documents`)
    console.log('\nDocuments:')
    allDocs.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.title} (${doc.createdAt.toLocaleDateString()}) - BookShop: ${doc._count.bookShopItems}, Pages: ${doc._count.pages}`)
    })
    
    // 2. Check for documents without pages (likely test data)
    const docsWithoutPages = allDocs.filter(d => d._count.pages === 0)
    console.log(`\n⚠️  ${docsWithoutPages.length} documents have NO pages (likely test data)`)
    
    // 3. Check preview functionality
    const docsWithPages = allDocs.filter(d => d._count.pages > 0)
    console.log(`\n✅ ${docsWithPages.length} documents have pages (preview should work)`)
    
    console.log('\n✅ Cleanup analysis complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Delete test documents through the UI')
    console.log('2. Preview should work for documents with pages')
    console.log('3. Upload fresh documents for testing')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupAndFix()
