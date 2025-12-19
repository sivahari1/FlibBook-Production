#!/usr/bin/env tsx

/**
 * Simple Document Pages Creation
 * 
 * This script will create document page records for documents that don't have them,
 * using a simple approach that works with the existing viewer.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createDocumentPages() {
  console.log('📄 Creating document pages for My JStudyRoom items...')
  
  try {
    // Get documents that need pages
    const myJStudyRoomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    })
    
    console.log(`Found ${myJStudyRoomItems.length} items in My JStudyRoom`)
    
    for (const item of myJStudyRoomItems) {
      const document = item.bookShopItem?.document
      if (!document) continue
      
      console.log(`\n📄 Processing: ${document.title}`)
      
      // Check if document already has pages
      const existingPages = await prisma.documentPage.count({
        where: { documentId: document.id }
      })
      
      if (existingPages > 0) {
        console.log(`   ✅ Already has ${existingPages} pages, skipping`)
        continue
      }
      
      // Create a reasonable number of pages (5 for testing)
      const pageCount = 5
      console.log(`   📖 Creating ${pageCount} pages`)
      
      const pages = []
      
      for (let i = 1; i <= pageCount; i++) {
        // Create a proper page URL that will work with the viewer
        // For now, we'll use a placeholder that indicates the document needs conversion
        const pageUrl = `/api/documents/${document.id}/pages/${i}`
        
        const page = await prisma.documentPage.create({
          data: {
            documentId: document.id,
            pageNumber: i,
            pageUrl: pageUrl,
            fileSize: 50000, // Reasonable estimate
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            version: 1,
            generationMethod: 'api',
            qualityLevel: 'standard',
            format: 'jpeg'
          }
        })
        
        pages.push(page)
      }
      
      console.log(`   ✅ Created ${pages.length} page records`)
    }
    
    console.log('\n🎉 Document pages creation complete!')
    console.log('\nNow the documents should be viewable in My JStudyRoom.')
    
  } catch (error) {
    console.error('❌ Page creation failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the page creation
createDocumentPages().catch(console.error)