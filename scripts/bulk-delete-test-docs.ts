import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function bulkDeleteTestDocs() {
  console.log('🗑️  Deleting test documents...')
  
  try {
    // Find all test documents (those without pages)
    const testDocs = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: 'Test Document' } },
          { pages: { none: {} } }
        ]
      },
      select: {
        id: true,
        title: true,
        userId: true,
        fileSize: true
      }
    })
    
    console.log(`Found ${testDocs.length} test documents to delete`)
    
    let deleted = 0
    for (const doc of testDocs) {
      try {
        // Delete document (cascades will handle related records)
        await prisma.document.delete({
          where: { id: doc.id }
        })
        
        // Update user storage
        await prisma.user.update({
          where: { id: doc.userId },
          data: {
            storageUsed: {
              decrement: doc.fileSize
            }
          }
        })
        
        deleted++
        console.log(`✅ Deleted: ${doc.title}`)
      } catch (error: any) {
        console.error(`❌ Failed to delete ${doc.title}:`, error.message)
      }
    }
    
    console.log(`\n✅ Deleted ${deleted} out of ${testDocs.length} test documents`)
    
    // Show remaining documents
    const remaining = await prisma.document.count()
    console.log(`📊 ${remaining} documents remaining in database`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

bulkDeleteTestDocs()
