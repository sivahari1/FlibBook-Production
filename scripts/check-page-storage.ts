import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPageStorage() {
  try {
    console.log('🔍 Checking page storage details...\n')
    
    // Get a document with pages
    const document = await prisma.document.findFirst({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: 'asc'
          },
          take: 3
        }
      }
    })
    
    if (!document) {
      console.log('❌ No documents with pages found')
      return
    }
    
    console.log(`📖 Document: ${document.title}`)
    console.log(`   ID: ${document.id}`)
    console.log(`   Storage Path: ${document.storagePath}`)
    console.log(`   Content Type: ${document.contentType}`)
    console.log(`   Total Pages: ${document.totalPages}`)
    console.log(`   Pages in DB: ${document.pages.length}\n`)
    
    console.log('📄 Page Details:')
    for (const page of document.pages) {
      console.log(`\n   Page ${page.pageNumber}:`)
      console.log(`      ID: ${page.id}`)
      console.log(`      pageUrl: ${page.pageUrl}`)
      console.log(`      storagePath: ${page.storagePath || 'NOT SET'}`)
      console.log(`      width: ${page.width || 'NOT SET'}`)
      console.log(`      height: ${page.height || 'NOT SET'}`)
    }
    
    // Check if there's a document-pages bucket in Supabase
    console.log('\n\n💡 Analysis:')
    console.log('   The pageUrl field contains API endpoints, not direct image URLs')
    console.log('   The storagePath field should contain the actual Supabase storage path')
    console.log('   We need to generate signed URLs from the storagePath for direct image access')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPageStorage()
