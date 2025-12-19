#!/usr/bin/env tsx

/**
 * Test script for the new jStudyRoom signed URL API endpoint
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function testSignedUrlAPI(): Promise<void> {
  console.log('🧪 Testing jStudyRoom Signed URL API...\n')

  try {
    // First, let's check if we have any documents in the database
    const { prisma: db } = await import('../lib/db')
    
    console.log('📋 Checking for available jStudyRoom documents...')
    
    const jstudyroomItems = await db.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      },
      take: 5
    })

    if (jstudyroomItems.length === 0) {
      console.log('❌ No jStudyRoom documents found in database')
      console.log('   Add some documents to test the API')
      return
    }

    console.log(`✅ Found ${jstudyroomItems.length} jStudyRoom documents`)
    
    for (const item of jstudyroomItems) {
      const document = item.bookShopItem?.document
      if (!document) {
        console.log(`\n📄 jStudyRoom Item: ${item.id} (No document found)`)
        continue
      }
      
      console.log(`\n📄 Document: ${document.title}`)
      console.log(`   jStudyRoom Item ID: ${item.id}`)
      console.log(`   User: ${item.user.email}`)
      console.log(`   Content Type: ${document.contentType}`)
      console.log(`   Storage Path: ${document.storagePath || 'None'}`)
      
      // Test the API endpoint structure (we can't test auth without session)
      const apiUrl = `/api/member/my-jstudyroom/${item.id}/signed-url`
      console.log(`   API Endpoint: ${apiUrl}`)
      
      // Test if the document has the required fields for URL generation
      if (!document.storagePath) {
        console.log('   ⚠️  No storage path - URL generation will fail')
      } else if (document.contentType === 'pdf' || document.mimeType === 'application/pdf') {
        console.log('   ✅ PDF document with storage path - should work')
      } else {
        console.log(`   ℹ️  Non-PDF document (${document.contentType}) - may not need signed URL`)
      }
    }

    // Test the storage function directly (server-side)
    console.log('\n🔗 Testing storage function directly...')
    
    const pdfDocument = jstudyroomItems.find(item => 
      item.bookShopItem?.document?.storagePath && 
      (item.bookShopItem.document.contentType === 'pdf' || item.bookShopItem.document.mimeType === 'application/pdf')
    )

    if (pdfDocument) {
      const { getSignedUrl, getBucketForContentType } = await import('../lib/storage')
      const { ContentType } = await import('../lib/types/content')
      
      const document = pdfDocument.bookShopItem!.document!
      const contentType = document.contentType as ContentType
      const bucketName = getBucketForContentType(contentType)
      
      console.log(`   Testing with document: ${document.title}`)
      console.log(`   Storage path: ${document.storagePath}`)
      console.log(`   Bucket: ${bucketName}`)
      
      const result = await getSignedUrl(
        document.storagePath!,
        60, // 1 minute for testing
        bucketName
      )
      
      if (result.error) {
        console.log(`   ❌ Storage function failed: ${result.error}`)
      } else {
        console.log('   ✅ Storage function succeeded')
        console.log(`   URL length: ${result.url?.length} characters`)
        console.log(`   URL starts with: ${result.url?.substring(0, 50)}...`)
      }
    } else {
      console.log('   ⚠️  No PDF documents with storage paths found for testing')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }

  console.log('\n📋 Summary:')
  console.log('1. The API endpoint has been created at /api/member/my-jstudyroom/[id]/signed-url')
  console.log('2. MyJstudyroomViewerClient has been updated to use the API instead of direct storage calls')
  console.log('3. This should resolve the "Missing Supabase environment variables" error')
  console.log('4. Test by accessing a document in jStudyRoom through the web interface')
}

// Run the test
testSignedUrlAPI().catch(console.error)