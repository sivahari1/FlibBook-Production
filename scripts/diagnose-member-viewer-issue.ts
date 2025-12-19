import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseMemberViewerIssue() {
  try {
    const documentId = 'cmskl5u0004xqg83hxqglb'
    
    console.log('🔍 Diagnosing member viewer issue for document:', documentId)
    
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
        bookShopItems: true,
        pages: true
      }
    })
    
    if (!document) {
      console.log('❌ Document not found in database')
      return
    }
    
    console.log('✅ Document found:', {
      id: document.id,
      title: document.title,
      contentType: document.contentType,
      status: document.status,
      isConverted: document.isConverted,
      totalPages: document.totalPages,
      owner: document.user.email,
      bookshopItems: document.bookShopItems.length,
      documentPages: document.pages.length
    })
    
    // Check if document is in bookshop
    if (document.bookShopItems.length === 0) {
      console.log('❌ Document is not in bookshop - cannot be viewed by members')
      return
    }
    
    const bookshopItem = document.bookShopItems[0]
    console.log('📚 Bookshop item:', {
      id: bookshopItem.id,
      title: bookshopItem.title,
      price: bookshopItem.price,
      category: bookshopItem.category,
      isPublished: bookshopItem.isPublished
    })
    
    if (!bookshopItem.isPublished) {
      console.log('❌ Bookshop item is not published')
      return
    }
    
    // Check document pages
    if (document.pages.length === 0) {
      console.log('❌ No document pages found - document may not be properly converted')
      
      // Try to find pages in different ways
      const allPages = await prisma.documentPage.findMany({
        where: { documentId: documentId }
      })
      
      console.log('📄 All pages for this document:', allPages.length)
      
      if (allPages.length === 0) {
        console.log('🔧 Need to convert document to create pages')
        
        // Check if document file exists
        if (document.storagePath) {
          console.log('📁 Document storage path:', document.storagePath)
          
          // Try to trigger conversion
          console.log('🔄 Attempting to trigger document conversion...')
          
          const response = await fetch(`http://localhost:3002/api/documents/${documentId}/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log('✅ Conversion triggered successfully')
          } else {
            console.log('❌ Failed to trigger conversion:', response.status)
          }
        }
      }
    } else {
      console.log('✅ Document has pages:', document.pages.length)
      
      // Check first few pages
      const samplePages = document.pages.slice(0, 3)
      for (const page of samplePages) {
        console.log(`📄 Page ${page.pageNumber}:`, {
          pageUrl: page.pageUrl ? 'Has URL' : 'No URL'
        })
      }
    }
    
    // Check member access
    console.log('👤 Checking member access...')
    
    // For now, let's assume we need to check if user has purchased this item
    // This would typically be done through the payment system
    
    console.log('✅ Diagnosis complete')
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseMemberViewerIssue()